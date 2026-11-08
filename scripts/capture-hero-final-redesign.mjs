import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3010;

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
        "--remote-debugging-port=9235",
        `--user-data-dir=${tempProfile}`,
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "about:blank",
      ],
      { stdio: "ignore" }
    );

    await sleep(2500);

    try {
      const listRes = await fetch("http://127.0.0.1:9235/json/list");
      const pages = await listRes.json();
      const targetPage = pages[0];
      const ws = new WebSocket(targetPage.webSocketDebuggerUrl);

      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
      });

      let id = 1;
      function send(method, params = {}) {
        return new Promise((resolve, reject) => {
          const reqId = id++;
          const handler = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === reqId) {
              ws.removeEventListener("message", handler);
              if (data.error) reject(data.error);
              else resolve(data.result);
            }
          };
          ws.addEventListener("message", handler);
          ws.send(JSON.stringify({ id: reqId, method, params }));
        });
      }

      await send("Page.enable");
      await send("Runtime.enable");

      async function setViewport(w, h) {
        await send("Emulation.setDeviceMetricsOverride", {
          width: w,
          height: h,
          deviceScaleFactor: 1,
          mobile: w < 768,
        });
      }

      async function takeScreenshot(outputPath) {
        const res = await send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(outputPath, Buffer.from(res.data, "base64"));
        console.log(
          `Saved screenshot: ${path.basename(outputPath)} (${fs.statSync(outputPath).size} bytes)`
        );
      }

      await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
      await sleep(2500);

      // Stop autoplay by clicking pause toggle
      await send("Runtime.evaluate", {
        expression: `
          const pauseBtn = document.querySelector('button[aria-label*="Pause automatic slide rotation"]');
          if (pauseBtn) pauseBtn.click();
        `,
      });

      // 1. Desktop 1650 x 950 - Slide 1 (MTO)
      console.log("\n=== Capturing Desktop 1650px - Slide 1 (MTO) ===");
      await setViewport(1650, 950);
      await send("Runtime.evaluate", {
        expression: `
          const btn1 = document.querySelector('[role="tablist"] button:nth-child(1)');
          if (btn1) btn1.click();
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-redesign-mto-1650.png"));

      // 2. Desktop 1650 x 950 - Slide 2 (IRGP)
      console.log("\n=== Capturing Desktop 1650px - Slide 2 (IRGP) ===");
      await send("Runtime.evaluate", {
        expression: `
          const btn2 = document.querySelector('[role="tablist"] button:nth-child(2)');
          if (btn2) btn2.click();
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-redesign-irgp-1650.png"));

      // 3. Mobile 390 x 844 - Slide 1 (MTO)
      console.log("\n=== Capturing Mobile 390px - Slide 1 (MTO) ===");
      await setViewport(390, 844);
      await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
      await sleep(2500);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-redesign-mto-390.png"));

      // 4. Mobile 390 x 844 - Slide 2 (IRGP)
      console.log("\n=== Capturing Mobile 390px - Slide 2 (IRGP) ===");
      await send("Runtime.evaluate", {
        expression: `
          const btn2 = document.querySelector('[role="tablist"] button:nth-child(2)');
          if (btn2) btn2.click();
        `,
      });
      await sleep(1500);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-redesign-irgp-390.png"));

      ws.close();
      chrome.kill();
      console.log("All screenshots captured successfully!");
    } catch (e) {
      chrome.kill();
      throw e;
    }
  } finally {
    try {
      execSync(
        `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
        { stdio: "ignore" }
      );
    } catch {}
  }
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
