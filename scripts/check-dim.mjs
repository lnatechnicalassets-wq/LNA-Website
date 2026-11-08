import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

const PORT = 3022;
const TEMP_PROFILE_DIR = path.join(process.cwd(), ".chrome-profile-check-dim");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  try {
    execSync(
      `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
      { stdio: "ignore" }
    );
  } catch {}

  const server = spawn(
    "cmd.exe",
    ["/c", "npx", "next", "start", "-H", "127.0.0.1", "-p", String(PORT)],
    {
      stdio: "inherit",
      env: { ...process.env, PORT: String(PORT) },
    }
  );

  await sleep(3000);

  const chrome = spawn(
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    [
      "--headless=new",
      "--remote-debugging-port=9260",
      `--user-data-dir=${TEMP_PROFILE_DIR}`,
      "--no-sandbox",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await sleep(2500);

  const listRes = await fetch("http://127.0.0.1:9260/json/list");
  const pages = await listRes.json();
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

  await new Promise((res) => (ws.onopen = res));

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

  ws.addEventListener("message", (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === "Runtime.consoleAPICalled") {
      console.log("CONSOLE:", ...data.params.args.map((a) => a.value || a.description));
    }
    if (data.method === "Runtime.exceptionThrown") {
      console.error("EXCEPTION:", data.params.exceptionDetails);
    }
  });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
  await sleep(3500);

  const res = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const sec = document.getElementById('internships');
        const container = sec.querySelector('.overflow-x-auto');
        const nextBtn = sec.querySelector('button[aria-label="Next opportunities"]');
        const counterBefore = sec.querySelector('span[aria-live="polite"]')?.textContent?.trim();
        
        console.log('Before click counter:', counterBefore);
        console.log('Clicking nextBtn...');
        nextBtn.click();
        
        return {
          counterBefore,
          diff: container.scrollWidth - container.clientWidth,
        };
      })()
    `,
  });

  console.log("Evaluation result:", res.result?.value);
  await sleep(1000);

  const resAfter = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const sec = document.getElementById('internships');
        const counterAfter = sec.querySelector('span[aria-live="polite"]')?.textContent?.trim();
        const cards = Array.from(sec.querySelectorAll('[data-testid="internship-card"]'));
        const activeIdx = cards.findIndex(c => c.className.includes('border-2'));
        console.log('After click counter:', counterAfter, 'activeIdx:', activeIdx);
        return { counterAfter, activeIdx };
      })()
    `,
  });

  console.log("Result after 1s:", resAfter.result?.value);

  ws.close();
  chrome.kill();
  try {
    execSync(
      `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
      { stdio: "ignore" }
    );
  } catch {}
}

run().catch(console.error);
