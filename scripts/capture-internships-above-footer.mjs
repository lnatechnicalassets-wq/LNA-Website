import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR = "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3020;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {}
    await sleep(350);
  }
}

async function capture() {
  try {
    execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`, { stdio: "ignore" });
  } catch {}

  const server = spawn("cmd.exe", ["/c", "npx", "next", "start", "-H", "127.0.0.1", "-p", String(PORT)], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(PORT) },
  });

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    const tempProfile = path.join(os.tmpdir(), "chrome-headless-footer-" + Date.now());
    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9246",
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
      const listRes = await fetch("http://127.0.0.1:9246/json/list");
      const pages = await listRes.json();
      const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

      await new Promise((resolve) => {
        ws.onopen = resolve;
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

      // Set wide desktop viewport 1650 x 1400 to show both Internships and Footer together
      await send("Emulation.setDeviceMetricsOverride", {
        width: 1650,
        height: 1400,
        deviceScaleFactor: 1,
        mobile: false,
      });

      await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
      await sleep(2500);

      // Scroll so that #internships is at top, showing #internships directly above footer
      await send("Runtime.evaluate", {
        expression: `
          const el = document.getElementById('internships');
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'start' });
          }
        `,
      });
      await sleep(1000);

      const res = await send("Page.captureScreenshot", { format: "png" });
      const outputPath = path.join(ARTIFACT_DIR, "internships-directly-above-footer-1650.png");
      fs.writeFileSync(outputPath, Buffer.from(res.data, "base64"));
      console.log(`Saved screenshot: ${outputPath} (${fs.statSync(outputPath).size} bytes)`);

      ws.close();
    } finally {
      chrome.kill("SIGKILL");
    }
  } finally {
    server.kill("SIGKILL");
    try {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`, { stdio: "ignore" });
    } catch {}
  }
}

capture().catch(console.error);

