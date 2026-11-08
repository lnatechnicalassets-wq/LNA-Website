import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3009;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  let lastErr = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {
      lastErr = e;
    }
    await sleep(350);
  }
  throw new Error(
    `Server at ${url} failed to respond within ${timeoutMs}ms. Last err: ${lastErr?.message}`
  );
}

async function capture() {
  try {
    execSync(
      `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
      { stdio: "ignore" }
    );
  } catch {}

  console.log(`Starting Next.js server on port ${PORT}...`);
  const server = spawn(
    "cmd.exe",
    ["/c", "npx", "next", "start", "-H", "127.0.0.1", "-p", String(PORT)],
    {
      stdio: "inherit",
      env: { ...process.env, PORT: String(PORT) },
    }
  );

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    console.log("Server ready!");

    const tempProfile = path.join(os.tmpdir(), "chrome-headless-hero-" + Date.now());
    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9230",
        `--user-data-dir=${tempProfile}`,
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        `http://127.0.0.1:${PORT}`,
      ],
      { stdio: "ignore" }
    );

    await sleep(2500);

    try {
      const listRes = await fetch("http://127.0.0.1:9230/json/list");
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

      async function takeScreenshot(filePath) {
        const params = { format: "png" };
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

      async function pauseAutoplay() {
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const srBtn = document.querySelector('button[aria-label*="Pause automatic slide rotation"]');
              if (srBtn) srBtn.click();
            })()
          `,
        });
        await sleep(200);
      }

      async function selectSlide(slideIndex) {
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const tabs = document.querySelectorAll('button[role="tab"]');
              if (tabs[${slideIndex}]) {
                tabs[${slideIndex}].click();
              }
            })()
          `,
        });
        await sleep(650);
      }

      // Initial setup: Pause autoplay so screenshots are steady
      await pauseAutoplay();

      console.log("\n=== Checking Viewports for Zero Horizontal Overflow ===");
      for (const w of [320, 390, 768, 1024, 1280, 1440, 1920]) {
        await setViewport(w, 850, w < 1024);
        await checkOverflow(w);
      }

      console.log("\n=== 1. Capturing Slide 1 (MTO Readiness Program) Across Viewports ===");
      // Ensure Slide 1 is active
      await setViewport(1920, 880, false);
      await selectSlide(0);

      // Desktop 1920
      await setViewport(1920, 880, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-mto-1920.png"));

      // Desktop 1440
      await setViewport(1440, 880, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-mto-1440.png"));

      // Desktop 1280
      await setViewport(1280, 880, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-mto-1280.png"));

      // Laptop 1024
      await setViewport(1024, 880, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-mto-1024.png"));

      // Tablet 768
      await setViewport(768, 950, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-mto-768.png"));

      // Mobile 390
      await setViewport(390, 950, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-mto-390.png"));

      // Mobile 320
      await setViewport(320, 950, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-mto-320.png"));

      console.log("\n=== 2. Capturing Slide 2 (IRGP) Across Viewports ===");
      // Switch to Slide 2
      await setViewport(1920, 880, false);
      await selectSlide(1);

      // Desktop 1920
      await setViewport(1920, 880, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-irgp-1920.png"));

      // Desktop 1440
      await setViewport(1440, 880, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-irgp-1440.png"));

      // Desktop 1280
      await setViewport(1280, 880, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-irgp-1280.png"));

      // Laptop 1024
      await setViewport(1024, 880, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-irgp-1024.png"));

      // Tablet 768
      await setViewport(768, 950, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-irgp-768.png"));

      // Mobile 390
      await setViewport(390, 950, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-irgp-390.png"));

      // Mobile 320
      await setViewport(320, 950, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-irgp-320.png"));

      console.log("\n=== 3. Capturing Mentor Hover States (Center & Side) ===");
      await setViewport(1440, 880, false);
      await selectSlide(0);

      // Center mentor hover (Mir Hasib Mahmud)
      const centerRectRes = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const btn = document.querySelector('button[aria-label*="Mir Hasib Mahmud"]');
            if (!btn) return null;
            const r = btn.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          })()
        `,
        returnByValue: true,
      });
      if (centerRectRes.result.value) {
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: centerRectRes.result.value.x,
          y: centerRectRes.result.value.y,
        });
        await sleep(500);
        await takeScreenshot(path.join(ARTIFACT_DIR, "hero-mto-center-hover.png"));
      }

      // Side mentor hover (Tanvir Hossain)
      const sideRectRes = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const btn = document.querySelector('button[aria-label*="Tanvir Hossain"]');
            if (!btn) return null;
            const r = btn.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          })()
        `,
        returnByValue: true,
      });
      if (sideRectRes.result.value) {
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: sideRectRes.result.value.x,
          y: sideRectRes.result.value.y,
        });
        await sleep(500);
        await takeScreenshot(path.join(ARTIFACT_DIR, "hero-mto-side-hover.png"));
      }

      // Move mouse away to reset hover state
      await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: 10,
        y: 10,
      });
      await sleep(200);

      console.log("\n=== 4. Capturing Hero Mentor Quick-View Modal Interaction ===");
      await setViewport(1440, 900, false);
      await selectSlide(0);

      // Click Ethan Park's card (Centerpiece mentor)
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const btns = Array.from(document.querySelectorAll('button[aria-label*="Ethan Park"]'));
            if (btns.length > 0) btns[0].click();
          })()
        `,
      });
      await sleep(750);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-mentor-modal-1440.png"));

      // Close modal
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const closeBtn = document.querySelector('button[aria-label="Close dialog"]');
            if (closeBtn) closeBtn.click();
          })()
        `,
      });
      await sleep(500);

      ws.close();
      chrome.kill();
      console.log("All screenshots captured successfully!");
    } catch (e) {
      chrome.kill();
      throw e;
    }
  } finally {
    try {
      server.kill();
      execSync(
        `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
        { stdio: "ignore" }
      );
    } catch {}
  }
}

capture().catch((e) => {
  console.error("Capture failed:", e);
  process.exit(1);
});
