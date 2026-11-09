import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

const PORT = 3018;
const TEMP_PROFILE_DIR = path.join(process.cwd(), ".chrome-profile-debug");

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
      "--remote-debugging-port=9250",
      `--user-data-dir=${TEMP_PROFILE_DIR}`,
      "--no-sandbox",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await sleep(2500);

  const listRes = await fetch("http://127.0.0.1:9250/json/list");
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

  // Listen to console API calls
  ws.addEventListener("message", (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === "Runtime.consoleAPICalled") {
      console.log(
        "BROWSER CONSOLE:",
        data.params.args.map((a) => a.value || a.description)
      );
    }
    if (data.method === "Runtime.exceptionThrown") {
      console.error("BROWSER EXCEPTION:", data.params.exceptionDetails);
    }
  });

  await send("Runtime.enable");
  await send("Page.enable");

  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
  await sleep(4000);

  const evalRes = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const sec = document.getElementById('internships');
        if (!sec) return { error: 'No #internships section found' };
        
        const nextBtn = sec.querySelector('button[aria-label="Next opportunities"]');
        const prevBtn = sec.querySelector('button[aria-label="Previous opportunities"]');
        const dots = Array.from(sec.querySelectorAll('button[aria-label^="Go to opportunity"]'));
        const counter = sec.querySelector('span[aria-live="polite"]')?.textContent?.trim();
        
        return {
          hasSec: true,
          hasNextBtn: Boolean(nextBtn),
          nextBtnDisabled: nextBtn ? nextBtn.disabled : null,
          hasPrevBtn: Boolean(prevBtn),
          prevBtnDisabled: prevBtn ? prevBtn.disabled : null,
          dotCount: dots.length,
          counter: counter,
        };
      })()
    `,
  });

  console.log("Section inspection:", evalRes.result?.value);

  // Now dispatch a synthetic click and inspect React state
  const clickRes = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const sec = document.getElementById('internships');
        const nextBtn = sec.querySelector('button[aria-label="Next opportunities"]');
        if (!nextBtn) return { error: 'No next button' };

        console.log('Dispatching click to nextBtn...');
        nextBtn.click();
        
        const counterAfter = sec.querySelector('span[aria-live="polite"]')?.textContent?.trim();
        return { counterAfter };
      })()
    `,
  });

  console.log("Click result:", clickRes.result?.value);
  await sleep(1000);

  const checkStateAgain = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const sec = document.getElementById('internships');
        const counter = sec.querySelector('span[aria-live="polite"]')?.textContent?.trim();
        const cards = Array.from(sec.querySelectorAll('[data-testid="internship-card"]'));
        const cardClasses = cards.map(c => c.className);
        return { counter, card0HasBorder2: cardClasses[0].includes('border-2'), card1HasBorder2: cardClasses[1].includes('border-2') };
      })()
    `,
  });
  console.log("State 1s after click:", checkStateAgain.result?.value);

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
