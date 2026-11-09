import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3014;
const TEMP_PROFILE_DIR = path.join(process.cwd(), ".chrome-profile-irgp");

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

  console.log(`Starting Next.js production server on port ${PORT}...`);
  const server = spawn(
    "cmd.exe",
    ["/c", "npx", "next", "start", "-H", "127.0.0.1", "-p", String(PORT)],
    {
      stdio: "inherit",
      env: { ...process.env, PORT: String(PORT) },
    }
  );

  let chrome = null;

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    console.log("Server ready!");

    chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9241",
        `--user-data-dir=${TEMP_PROFILE_DIR}`,
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "about:blank",
      ],
      { stdio: "ignore" }
    );

    await sleep(2500);

    const listRes = await fetch("http://127.0.0.1:9241/json/list");
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

    // 1. Desktop 1440 x 900 - IRGP Slide
    console.log("\n=== Capturing Desktop 1440x900 IRGP Slide ===");
    await setViewport(1440, 900);
    await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
    await sleep(2500);

    // Switch to slide 2 (IRGP)
    await send("Runtime.evaluate", {
      expression: `
        const btn2 = document.querySelector('[role="tablist"] button:nth-child(2)');
        if (btn2) btn2.click();
      `,
    });
    await sleep(1000);

    // Capture IRGP Hero Desktop
    await takeScreenshot(path.join(ARTIFACT_DIR, "irgp-refinement-desktop-1440.png"));

    // Check interaction: Click "View Learner Experiences" and verify scroll position
    console.log("\n=== Testing 'View Learner Experiences' Scroll Interaction ===");
    const scrollResult = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('a, button')).find(
            el => el.textContent.includes('View Learner Experiences')
          );
          if (!btn) return { found: false };
          btn.click();
          return { found: true };
        })()
      `,
    });
    console.log("View Learner Experiences button clicked:", scrollResult);
    await sleep(1500);

    const scrollPos = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `
        (() => {
          const reviewsSection = document.getElementById('reviews');
          const rect = reviewsSection ? reviewsSection.getBoundingClientRect() : null;
          return {
            windowScrollY: window.scrollY,
            reviewsTop: rect ? rect.top : null,
          };
        })()
      `,
    });
    console.log("Scroll position after click:", scrollPos.result?.value);
    await takeScreenshot(path.join(ARTIFACT_DIR, "irgp-scrolled-to-reviews.png"));

    // Navigate back to top
    await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
    await sleep(2000);

    // 2. Mobile 390 x 844 - IRGP Slide
    console.log("\n=== Capturing Mobile 390x844 IRGP Slide ===");
    await setViewport(390, 844);
    await sleep(1000);

    // Switch to slide 2 (IRGP)
    await send("Runtime.evaluate", {
      expression: `
        const btn2 = document.querySelector('[role="tablist"] button:nth-child(2)');
        if (btn2) btn2.click();
      `,
    });
    await sleep(1200);

    await takeScreenshot(path.join(ARTIFACT_DIR, "irgp-refinement-mobile-390.png"));

    // Also capture full mobile page scrolled down into the 2-column mentor grid on mobile
    await send("Runtime.evaluate", {
      expression: `window.scrollBy(0, 350);`,
    });
    await sleep(800);
    await takeScreenshot(path.join(ARTIFACT_DIR, "irgp-refinement-mobile-grid-closeup.png"));

    ws.close();
    chrome.kill();
    console.log("Screenshot run finished successfully!");
  } finally {
    if (chrome) chrome.kill();
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
  }
}

run().catch((e) => {
  console.error("Capture failed:", e);
  process.exit(1);
});
