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

    const tempProfile = path.join(os.tmpdir(), "chrome-headless-demo-" + Date.now());
    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9232",
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
      const listRes = await fetch("http://127.0.0.1:9232/json/list");
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
      await sleep(2000);

      // 1. Reference desktop size (1670 x 940)
      console.log("\n=== Capturing Reference Desktop (1670 x 940) ===");
      await setViewport(1670, 940);
      await sleep(1000);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-demo-match-1670.png"));

      // 2. Standard 1440 desktop size
      console.log("\n=== Capturing 1440 x 900 Desktop ===");
      await setViewport(1440, 900);
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "hero-demo-match-1440.png"));

      ws.close();
      chrome.kill();
      console.log("Screenshots captured successfully!");
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
