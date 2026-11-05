import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3060;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await sleep(350);
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function capture() {
  console.log(`Starting Next.js server on port ${PORT}...`);
  const server = spawn("cmd.exe", ["/c", "pnpm", "start", "-p", String(PORT)], {
    stdio: "ignore",
    env: { ...process.env, PORT: String(PORT) },
  });

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    console.log("Server ready!");

    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9222",
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        `http://127.0.0.1:${PORT}`,
      ],
      { stdio: "ignore" }
    );

    await sleep(2500);

    try {
      const listRes = await fetch("http://127.0.0.1:9222/json/list");
      const pages = await listRes.json();
      const target = pages.find((p) => p.url.includes(String(PORT)));
      if (!target) throw new Error("No Chrome page target found");

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve) => (ws.onopen = resolve));

      let msgId = 1;
      function send(method, params = {}) {
        return new Promise((resolve) => {
          const id = msgId++;
          const handler = (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.id === id) {
              ws.removeEventListener("message", handler);
              resolve(msg.result);
            }
          };
          ws.addEventListener("message", handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      }

      async function takeScreenshot(filePath, clip = null) {
        const params = { format: "png" };
        if (clip) params.clip = clip;
        const res = await send("Page.captureScreenshot", params);
        fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
        console.log(
          `Saved screenshot: ${path.basename(filePath)} (${fs.statSync(filePath).size} bytes)`
        );
      }

      async function setViewport(width, height, isMobile) {
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: isMobile,
        });
        await sleep(400);
      }

      async function checkOverflow(width) {
        const evalRes = await send("Runtime.evaluate", {
          expression: `
            (() => {
              const scrollW = document.documentElement.scrollWidth;
              const clientW = document.documentElement.clientWidth;
              return { scrollW, clientW, overflow: scrollW > clientW };
            })()
          `,
          returnByValue: true,
        });
        const v = evalRes.result.value;
        console.log(
          `[Viewport ${width}px] clientWidth=${v.clientW}, scrollWidth=${v.scrollW}, hasOverflow=${v.overflow}`
        );
        return !v.overflow;
      }

      async function clickTab(index) {
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const tabs = document.querySelectorAll('[role="tab"]');
              if (tabs[${index}]) {
                tabs[${index}].click();
                return true;
              }
              return false;
            })()
          `,
        });
        await sleep(600);
      }

      // 1. Verify Viewports for Overflow
      console.log("\n=== Verifying All Required Viewports ===");
      for (const w of [320, 390, 768, 1024, 1440]) {
        await setViewport(w, 900, w < 1024);
        await checkOverflow(w);
      }

      // 2. Capture Desktop Hero (1440px)
      console.log("\n=== Capturing Desktop Viewport (1440px) ===");
      await setViewport(1440, 920, false);
      await clickTab(0);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-hero-1440.png"));

      // 3. Capture Tablet Hero (768px)
      console.log("\n=== Capturing Tablet Viewport (768px) ===");
      await setViewport(768, 1050, true);
      await clickTab(0);
      await takeScreenshot(path.join(ARTIFACT_DIR, "tablet-hero-768.png"));

      // 4. Capture Mobile Hero (390px) - All 3 Slides
      console.log("\n=== Capturing Mobile Viewport (390px) All 3 Slides ===");
      await setViewport(390, 950, true);

      // Slide 1
      await clickTab(0);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-hero-390.png"));
      await checkOverflow(390);

      // Slide 2
      await clickTab(1);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-hero-390-slide2.png"));
      await checkOverflow(390);

      // Slide 3
      await clickTab(2);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-hero-390-slide3.png"));
      await checkOverflow(390);

      // Reset to Slide 1
      await clickTab(0);

      // 5. Capture Full Pages
      console.log("\n=== Capturing Full Pages ===");
      await setViewport(1440, 5600, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-1440.png"));

      await setViewport(768, 6200, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "tablet-768.png"));

      await setViewport(390, 7400, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-390.png"));

      ws.close();
    } finally {
      chrome.kill();
    }
  } finally {
    server.kill();
    try {
      execSync(
        `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
        { stdio: "ignore" }
      );
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :9222') do taskkill /f /pid %a`, {
        stdio: "ignore",
      });
    } catch {}
  }
}

capture().then(
  () => {
    console.log("All screenshots and viewport verifications completed successfully!");
    process.exit(0);
  },
  (err) => {
    console.error("Capture error:", err);
    process.exit(1);
  }
);
