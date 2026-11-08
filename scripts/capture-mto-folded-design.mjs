import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3030;
const TEMP_PROFILE_DIR = path.join(process.cwd(), ".chrome-profile-folded-mto");

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
      "--remote-debugging-port=9280",
      `--user-data-dir=${TEMP_PROFILE_DIR}`,
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await sleep(2500);

  const listRes = await fetch("http://127.0.0.1:9280/json/list");
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
      `Saved screenshot: ${path.basename(outputPath)} (${
        fs.statSync(outputPath).size
      } bytes)`
    );
  }

  // 1. Desktop 1440x900 - MTO Slide (Folded Pearl Layers with 2-1-2 Mentors)
  console.log("\n=== 1. Capturing Desktop 1440x900 MTO Hero Slide ===");
  await setViewport(1440, 900);
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
  await sleep(3500);

  // Pause carousel autoplay and ensure Slide 1 (MTO) is active
  await send("Runtime.evaluate", {
    expression: `
      const pauseBtn = document.querySelector('button[aria-label*="Pause automatic slide rotation"]');
      if (pauseBtn) pauseBtn.click();
      const dot1 = document.querySelector('[role="tablist"] button:nth-child(1)');
      if (dot1) dot1.click();
    `,
  });
  await sleep(1500);
  await takeScreenshot(path.join(ARTIFACT_DIR, "mto-folded-desktop-1440.png"));

  // 2. Readable Close-up of MTO Mentor Nameplates
  console.log("\n=== 2. Capturing MTO Nameplates Close-up ===");
  await send("Runtime.evaluate", {
    expression: `
      const mtoShowcase = document.querySelector('.max-w-\\\\[640px\\\\]') || document.querySelector('.grid-cols-4');
      if (mtoShowcase) mtoShowcase.scrollIntoView({ behavior: 'instant', block: 'center' });
    `,
  });
  await sleep(600);
  await takeScreenshot(
    path.join(ARTIFACT_DIR, "mto-folded-nameplates-closeup.png")
  );

  // 3. Mobile 390x844 - MTO Slide (Header, Title, Stats, and All 5 Mentors)
  console.log("\n=== 3. Capturing Mobile 390x844 MTO Slide ===");
  await setViewport(390, 844);
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
  await sleep(3000);

  await send("Runtime.evaluate", {
    expression: `
      const pauseBtn = document.querySelector('button[aria-label*="Pause automatic slide rotation"]');
      if (pauseBtn) pauseBtn.click();
      const dot1 = document.querySelector('[role="tablist"] button:nth-child(1)');
      if (dot1) dot1.click();
    `,
  });
  await sleep(1500);
  await takeScreenshot(path.join(ARTIFACT_DIR, "mto-folded-mobile-hero-390.png"));

  // Scroll down to capture the 2-1-2 mentor grid completely on mobile
  await send("Runtime.evaluate", {
    expression: `window.scrollBy(0, 360);`,
  });
  await sleep(800);
  await takeScreenshot(path.join(ARTIFACT_DIR, "mto-folded-mobile-390.png"));

  // 4. Desktop 1440x900 - IRGP Slide Confirmation (Confirming IRGP remains 100% unchanged)
  console.log("\n=== 4. Confirming IRGP Hero Slide (Unchanged) ===");
  await setViewport(1440, 900);
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
  await sleep(2500);
  await send("Runtime.evaluate", {
    expression: `
      const dot2 = document.querySelector('[role="tablist"] button:nth-child(2)');
      if (dot2) dot2.click();
    `,
  });
  await sleep(1500);
  await takeScreenshot(
    path.join(ARTIFACT_DIR, "irgp-slide-confirmed-unchanged.png")
  );

  ws.close();
  chrome.kill();
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
  console.log("\nAll MTO captures completed successfully!");
}

run().catch((e) => {
  console.error("Capture script failed:", e);
  process.exit(1);
});
