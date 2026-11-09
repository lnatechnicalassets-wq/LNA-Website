import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3025;
const TEMP_PROFILE_DIR = path.join(process.cwd(), ".chrome-profile-verify-final");

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

  if (fs.existsSync(TEMP_PROFILE_DIR)) {
    try {
      fs.rmSync(TEMP_PROFILE_DIR, { recursive: true, force: true });
    } catch {}
  }
  fs.mkdirSync(TEMP_PROFILE_DIR, { recursive: true });

  console.log(`Starting Next.js server on port ${PORT}...`);
  const server = spawn(
    "cmd.exe",
    ["/c", "npx", "next", "start", "-H", "127.0.0.1", "-p", String(PORT)],
    {
      stdio: "inherit",
      env: { ...process.env, PORT: String(PORT) },
    }
  );

  await sleep(3500);

  const chrome = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      "--remote-debugging-port=9265",
      `--user-data-dir=${TEMP_PROFILE_DIR}`,
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await sleep(2500);

  const listRes = await fetch("http://127.0.0.1:9265/json/list");
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

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  async function takeScreenshot(outputPath) {
    const res = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(outputPath, Buffer.from(res.data, "base64"));
    console.log(
      `Saved screenshot: ${path.basename(outputPath)} (${fs.statSync(outputPath).size} bytes)`
    );
  }

  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
  await sleep(4000);

  // Scroll to internships section
  await send("Runtime.evaluate", {
    expression: `
      const sec = document.getElementById('internships');
      if (sec) sec.scrollIntoView({ behavior: 'instant' });
    `,
  });
  await sleep(1000);

  // 1. Initial State: Chaldal is active (1 / 3)
  console.log("\n=== STEP 1: Initial State (Chaldal Active, 1 / 3) ===");
  let state = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const sec = document.getElementById('internships');
        const counter = sec.querySelector('span[aria-live="polite"]')?.textContent?.trim();
        const cards = Array.from(sec.querySelectorAll('[data-testid="internship-card"]'));
        const activeIdx = cards.findIndex(c => c.className.includes('border-2'));
        return { counter, activeIdx };
      })()
    `,
  });
  console.log("Step 1:", state.result?.value);
  await takeScreenshot(path.join(ARTIFACT_DIR, "internship-step1-chaldal.png"));

  // 2. Click Next: Fylo is active (2 / 3)
  console.log("\n=== STEP 2: Click Next (Fylo Active, 2 / 3) ===");
  await send("Runtime.evaluate", {
    expression: `
      const sec = document.getElementById('internships');
      const nextBtn = sec.querySelector('button[aria-label="Next opportunities"]');
      if (nextBtn) nextBtn.click();
    `,
  });
  await sleep(1200);

  state = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const sec = document.getElementById('internships');
        const counter = sec.querySelector('span[aria-live="polite"]')?.textContent?.trim();
        const cards = Array.from(sec.querySelectorAll('[data-testid="internship-card"]'));
        const activeIdx = cards.findIndex(c => c.className.includes('border-2'));
        return { counter, activeIdx };
      })()
    `,
  });
  console.log("Step 2:", state.result?.value);
  await takeScreenshot(path.join(ARTIFACT_DIR, "internship-step2-fylo.png"));

  // 3. Click Next: Dotlines is active (3 / 3)
  console.log("\n=== STEP 3: Click Next (Dotlines Active, 3 / 3) ===");
  await send("Runtime.evaluate", {
    expression: `
      const sec = document.getElementById('internships');
      const nextBtn = sec.querySelector('button[aria-label="Next opportunities"]');
      if (nextBtn) nextBtn.click();
    `,
  });
  await sleep(1200);

  state = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const sec = document.getElementById('internships');
        const counter = sec.querySelector('span[aria-live="polite"]')?.textContent?.trim();
        const cards = Array.from(sec.querySelectorAll('[data-testid="internship-card"]'));
        const activeIdx = cards.findIndex(c => c.className.includes('border-2'));
        return { counter, activeIdx };
      })()
    `,
  });
  console.log("Step 3:", state.result?.value);
  await takeScreenshot(path.join(ARTIFACT_DIR, "internship-step3-dotlines.png"));

  // 4. Click Dot 1: Jump back to Chaldal (1 / 3)
  console.log("\n=== STEP 4: Click Dot 1 (Jump back to Chaldal, 1 / 3) ===");
  await send("Runtime.evaluate", {
    expression: `
      const sec = document.getElementById('internships');
      const dot1 = sec.querySelector('button[aria-label="Go to opportunity 1"]');
      if (dot1) dot1.click();
    `,
  });
  await sleep(1200);

  state = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const sec = document.getElementById('internships');
        const counter = sec.querySelector('span[aria-live="polite"]')?.textContent?.trim();
        const cards = Array.from(sec.querySelectorAll('[data-testid="internship-card"]'));
        const activeIdx = cards.findIndex(c => c.className.includes('border-2'));
        return { counter, activeIdx };
      })()
    `,
  });
  console.log("Step 4:", state.result?.value);

  // 5. Open details modal for Fylo
  console.log("\n=== STEP 5: Open Details Modal for Fylo ===");
  await send("Runtime.evaluate", {
    expression: `
      const sec = document.getElementById('internships');
      const cards = sec.querySelectorAll('[data-testid="internship-card"]');
      if (cards[1]) cards[1].click();
    `,
  });
  await sleep(1500);

  let modalInfo = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const title = dialog ? dialog.querySelector('h2')?.textContent : null;
        const navText = dialog ? dialog.querySelector('span.text-xs')?.textContent : null;
        return { isOpen: Boolean(dialog), title, navText };
      })()
    `,
  });
  console.log("Step 5 Modal State:", modalInfo.result?.value);
  await takeScreenshot(path.join(ARTIFACT_DIR, "internship-modal-fylo.png"));

  // 6. Inside modal, click Next to change to Dotlines
  console.log("\n=== STEP 6: Inside Modal, Click Next to Change to Dotlines ===");
  await send("Runtime.evaluate", {
    expression: `
      const dialog = document.querySelector('[role="dialog"]');
      const nextBtn = dialog ? dialog.querySelector('button[aria-label="Next internship opportunity"]') : null;
      if (nextBtn) nextBtn.click();
    `,
  });
  await sleep(1200);

  modalInfo = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const title = dialog ? dialog.querySelector('h2')?.textContent : null;
        const navText = dialog ? dialog.querySelector('span.text-xs')?.textContent : null;
        return { isOpen: Boolean(dialog), title, navText };
      })()
    `,
  });
  console.log("Step 6 Modal State after changing:", modalInfo.result?.value);
  await takeScreenshot(path.join(ARTIFACT_DIR, "internship-modal-dotlines.png"));

  ws.close();
  chrome.kill();
  try {
    execSync(
      `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
      { stdio: "ignore" }
    );
  } catch {}
  console.log("\nVerification successfully completed!");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
