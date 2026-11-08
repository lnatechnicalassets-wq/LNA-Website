import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR = "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3018;

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
    const tempProfile = path.join(os.tmpdir(), "chrome-headless-mobile-" + Date.now());
    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9242",
        `--user-data-dir=${tempProfile}`,
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "about:blank",
      ],
      { stdio: "ignore" }
    );

    await sleep(2000);

    try {
      const listRes = await fetch("http://127.0.0.1:9242/json/list");
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

      await send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      });

      await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
      await sleep(2500);

      // Scroll exactly to #internships on mobile
      await send("Runtime.evaluate", {
        expression: `
          const el = document.getElementById('internships');
          if (el) {
            const rect = el.getBoundingClientRect();
            window.scrollTo(0, window.pageYOffset + rect.top);
          }
        `,
      });
      await sleep(1000);

      const res = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(ARTIFACT_DIR, "internships-mobile-390.png"), Buffer.from(res.data, "base64"));
      console.log("Captured internships-mobile-390.png!");

      // Scroll to footer on mobile
      await send("Runtime.evaluate", {
        expression: `
          const footer = document.querySelector('footer');
          if (footer) {
            const rect = footer.getBoundingClientRect();
            window.scrollTo(0, window.pageYOffset + rect.top);
          }
        `,
      });
      await sleep(1000);

      const resFooter = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(ARTIFACT_DIR, "footer-mobile-390.png"), Buffer.from(resFooter.data, "base64"));
      console.log("Captured footer-mobile-390.png!");

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

