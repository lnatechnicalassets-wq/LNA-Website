import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3014;

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

    const tempProfile = path.join(os.tmpdir(), "chrome-headless-courses-" + Date.now());
    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9238",
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
      const listRes = await fetch("http://127.0.0.1:9238/json/list");
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

      // 1. Desktop 1650px - Scroll to courses
      console.log("\n=== 1. Capturing Desktop 1650px - Courses Section ===");
      await setViewport(1650, 900);

      await send("Runtime.evaluate", {
        expression: `
          const el = document.getElementById('courses');
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        `,
      });
      await sleep(800);
      await takeScreenshot(path.join(ARTIFACT_DIR, "courses-desktop-1650.png"));

      // 2. Desktop 1650px - Hover Card 2 (Executive Leadership)
      console.log("\n=== 2. Capturing Card 2 Hovered State ===");
      const card2Pos = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const card2 = document.querySelector('[data-course-id="executive-leadership"]');
            if (!card2) return null;
            const r = card2.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          })()
        `,
        returnByValue: true,
      });

      if (card2Pos.result.value) {
        const { x, y } = card2Pos.result.value;
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x,
          y,
        });
      }
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "courses-card-hover-1650.png"));

      // 3. Desktop 1650px - Click Card 1 (Data Analytics) to open CourseDetailsModal
      console.log("\n=== 3. Capturing Course Details Modal Opened ===");
      await send("Runtime.evaluate", {
        expression: `
          const card1 = document.querySelector('[data-course-id="data-analytics"]');
          if (card1) card1.click();
        `,
      });
      await sleep(800);
      await takeScreenshot(path.join(ARTIFACT_DIR, "courses-modal-open-1650.png"));

      // Close modal by clicking Close button
      await send("Runtime.evaluate", {
        expression: `
          const closeBtn = document.querySelector('button[aria-label="Close"]') || 
                           Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Close');
          if (closeBtn) closeBtn.click();
        `,
      });
      await sleep(600);

      // 4. Mobile 390px - Courses Section
      console.log("\n=== 4. Capturing Mobile 390px - Courses Section ===");
      await setViewport(390, 844);
      await send("Runtime.evaluate", {
        expression: `
          const el = document.getElementById('courses');
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        `,
      });
      await sleep(800);
      await takeScreenshot(path.join(ARTIFACT_DIR, "courses-mobile-390.png"));

      ws.close();
      console.log("\nAll screenshots captured successfully!");
    } finally {
      chrome.kill("SIGKILL");
    }
  } finally {
    server.kill("SIGKILL");
    try {
      execSync(
        `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
        { stdio: "ignore" }
      );
    } catch {}
  }
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
