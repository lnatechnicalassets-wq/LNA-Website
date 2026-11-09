import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3030;
const TEMP_PROFILE_DIR = path.join(process.cwd(), ".chrome-profile-fixed-teal-lounge");

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
      `Saved screenshot: ${path.basename(outputPath)} (${fs.statSync(outputPath).size} bytes)`
    );
  }

  async function evalExpr(expr) {
    const res = await send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
    });
    return res.result.value;
  }

  // ==========================================
  // 1. DESKTOP 1440x900 MEASUREMENTS & CAPTURE
  // ==========================================
  console.log("\n=== 1. Desktop 1440x900 Verification ===");
  await setViewport(1440, 900);
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
  await sleep(3500);

  // Pause carousel autoplay and select MTO (dot 1)
  await evalExpr(`
    const pauseBtn = document.querySelector('button[aria-label*="Pause automatic slide rotation"]');
    if (pauseBtn) pauseBtn.click();
    const dot1 = document.querySelector('[role="tablist"] button:nth-child(1)');
    if (dot1) dot1.click();
  `);
  await sleep(1000);

  const mtoDesktopMetrics = await evalExpr(`
    (() => {
      const hero = document.querySelector('[aria-roledescription="carousel"]');
      const partners = document.querySelector('section[aria-label*="Partner"]') || document.querySelector('section.bg-\\\\[#04262E\\\\]') || document.querySelectorAll('section')[0];
      const heroRect = hero ? hero.getBoundingClientRect() : null;
      const partnersRect = partners ? partners.getBoundingClientRect() : null;
      return {
        heroHeight: hero ? hero.offsetHeight : null,
        heroRectTop: heroRect ? heroRect.top : null,
        heroRectBottom: heroRect ? heroRect.bottom : null,
        partnersTop: partnersRect ? partnersRect.top : null
      };
    })()
  `);
  console.log("Desktop MTO Metrics:", mtoDesktopMetrics);

  await takeScreenshot(path.join(ARTIFACT_DIR, "mto-lounge-desktop-1440.png"));

  // Close-up on MTO mentor cards
  await evalExpr(`
    const showcase = document.querySelector('.grid-cols-4');
    if (showcase) showcase.scrollIntoView({ behavior: 'instant', block: 'center' });
  `);
  await sleep(600);
  await takeScreenshot(path.join(ARTIFACT_DIR, "mto-lounge-nameplates-closeup.png"));

  // Switch to IRGP (dot 2) on Desktop
  await evalExpr(`
    window.scrollTo({ top: 0, behavior: 'instant' });
    const dot2 = document.querySelector('[role="tablist"] button:nth-child(2)');
    if (dot2) dot2.click();
  `);
  await sleep(1000);

  const irgpDesktopMetrics = await evalExpr(`
    (() => {
      const hero = document.querySelector('[aria-roledescription="carousel"]');
      const partners = document.querySelector('section[aria-label*="Partner"]') || document.querySelector('section.bg-\\\\[#04262E\\\\]') || document.querySelectorAll('section')[0];
      const heroRect = hero ? hero.getBoundingClientRect() : null;
      const partnersRect = partners ? partners.getBoundingClientRect() : null;
      return {
        heroHeight: hero ? hero.offsetHeight : null,
        heroRectTop: heroRect ? heroRect.top : null,
        heroRectBottom: heroRect ? heroRect.bottom : null,
        partnersTop: partnersRect ? partnersRect.top : null
      };
    })()
  `);
  console.log("Desktop IRGP Metrics:", irgpDesktopMetrics);
  console.log(
    `Desktop Height Delta: ${Math.abs(
      mtoDesktopMetrics.heroHeight - irgpDesktopMetrics.heroHeight
    )}px | Partners Delta: ${Math.abs(
      mtoDesktopMetrics.partnersTop - irgpDesktopMetrics.partnersTop
    )}px`
  );

  await takeScreenshot(path.join(ARTIFACT_DIR, "irgp-lounge-desktop-1440.png"));

  // Close-up on IRGP mentor cards
  await evalExpr(`
    const showcase = document.querySelector('.grid-cols-6');
    if (showcase) showcase.scrollIntoView({ behavior: 'instant', block: 'center' });
  `);
  await sleep(600);
  await takeScreenshot(path.join(ARTIFACT_DIR, "irgp-lounge-nameplates-closeup.png"));

  // ==========================================
  // 2. MOBILE 390x844 MEASUREMENTS & CAPTURE
  // ==========================================
  console.log("\n=== 2. Mobile 390x844 Verification ===");
  await setViewport(390, 844);
  await evalExpr(`window.scrollTo({ top: 0, behavior: 'instant' });`);
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
  await sleep(3500);

  // Pause carousel autoplay and select MTO (dot 1)
  await evalExpr(`
    const pauseBtn = document.querySelector('button[aria-label*="Pause automatic slide rotation"]');
    if (pauseBtn) pauseBtn.click();
    const dot1 = document.querySelector('[role="tablist"] button:nth-child(1)');
    if (dot1) dot1.click();
  `);
  await sleep(1000);

  const mtoMobileMetrics = await evalExpr(`
    (() => {
      const hero = document.querySelector('[aria-roledescription="carousel"]');
      const partners = document.querySelector('section[aria-label*="Partner"]') || document.querySelector('section.bg-\\\\[#04262E\\\\]') || document.querySelectorAll('section')[0];
      const heroRect = hero ? hero.getBoundingClientRect() : null;
      const partnersRect = partners ? partners.getBoundingClientRect() : null;
      return {
        heroHeight: hero ? hero.offsetHeight : null,
        partnersTop: partnersRect ? partnersRect.top : null
      };
    })()
  `);
  console.log("Mobile MTO Metrics:", mtoMobileMetrics);
  await takeScreenshot(path.join(ARTIFACT_DIR, "mto-lounge-mobile-390.png"));

  // Switch to IRGP (dot 2) on Mobile
  await evalExpr(`
    const dot2 = document.querySelector('[role="tablist"] button:nth-child(2)');
    if (dot2) dot2.click();
  `);
  await sleep(1000);

  const irgpMobileMetrics = await evalExpr(`
    (() => {
      const hero = document.querySelector('[aria-roledescription="carousel"]');
      const partners = document.querySelector('section[aria-label*="Partner"]') || document.querySelector('section.bg-\\\\[#04262E\\\\]') || document.querySelectorAll('section')[0];
      const heroRect = hero ? hero.getBoundingClientRect() : null;
      const partnersRect = partners ? partners.getBoundingClientRect() : null;
      return {
        heroHeight: hero ? hero.offsetHeight : null,
        partnersTop: partnersRect ? partnersRect.top : null
      };
    })()
  `);
  console.log("Mobile IRGP Metrics:", irgpMobileMetrics);
  console.log(
    `Mobile Height Delta: ${Math.abs(
      mtoMobileMetrics.heroHeight - irgpMobileMetrics.heroHeight
    )}px | Partners Delta: ${Math.abs(
      mtoMobileMetrics.partnersTop - irgpMobileMetrics.partnersTop
    )}px`
  );
  await takeScreenshot(path.join(ARTIFACT_DIR, "irgp-lounge-mobile-390.png"));

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
  console.log("\nAll teal lounge hero captures completed successfully!");
}

run().catch((e) => {
  console.error("Capture script failed:", e);
  process.exit(1);
});
