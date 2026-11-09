import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3016;

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

    const tempProfile = path.join(os.tmpdir(), "chrome-headless-internships-" + Date.now());
    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9240",
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
      const listRes = await fetch("http://127.0.0.1:9240/json/list");
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

      // 1. Desktop 1650px - Internship Opportunities Section
      console.log("\n=== 1. Capturing Desktop 1650px - Internship Section ===");
      await setViewport(1650, 950);
      await send("Runtime.evaluate", {
        expression: `
          const el = document.getElementById('internships');
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        `,
      });
      await sleep(800);
      await takeScreenshot(path.join(ARTIFACT_DIR, "internships-desktop-1650.png"));

      // 2. Desktop 1650px - Open Internship Popup (Card 1 - Chaldal clicked)
      console.log("\n=== 2. Capturing Open Internship Popup ===");
      await send("Runtime.evaluate", {
        expression: `
          const card = document.querySelector('[data-internship-id="internship-chaldal-01"]');
          if (card) card.click();
        `,
      });
      await sleep(800);
      await takeScreenshot(path.join(ARTIFACT_DIR, "internships-popup-open-1650.png"));

      // Close popup by pressing Escape or clicking close button
      await send("Runtime.evaluate", {
        expression: `
          const closeBtn = document.querySelector('[aria-label="Close dialog"]');
          if (closeBtn) closeBtn.click();
        `,
      });
      await sleep(600);

      // 3. Desktop 1650px - Redesigned Footer
      console.log("\n=== 3. Capturing Complete Footer ===");
      await send("Runtime.evaluate", {
        expression: `
          const footer = document.querySelector('footer');
          if (footer) footer.scrollIntoView({ behavior: 'instant', block: 'end' });
        `,
      });
      await sleep(800);
      await takeScreenshot(path.join(ARTIFACT_DIR, "footer-desktop-1650.png"));

      // 4. Mobile 390px - Internship Section and Footer
      console.log("\n=== 4. Capturing Mobile 390px - Internship Section ===");
      await setViewport(390, 844);
      await send("Runtime.evaluate", {
        expression: `
          const el = document.getElementById('internships');
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        `,
      });
      await sleep(800);
      await takeScreenshot(path.join(ARTIFACT_DIR, "internships-mobile-390.png"));

      console.log("\n=== 5. Capturing Mobile 390px - Footer ===");
      await send("Runtime.evaluate", {
        expression: `
          const footer = document.querySelector('footer');
          if (footer) footer.scrollIntoView({ behavior: 'instant', block: 'end' });
        `,
      });
      await sleep(800);
      await takeScreenshot(path.join(ARTIFACT_DIR, "footer-mobile-390.png"));

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
