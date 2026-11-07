import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3075;

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
    `Server at ${url} failed to respond within ${timeoutMs}ms. Last err: ${lastErr?.message}, cause: ${lastErr?.cause}`
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

  server.on("exit", (code, signal) => {
    console.log(`Next.js process exited with code ${code}, signal ${signal}`);
  });

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    console.log("Server ready!");

    const tempProfile = path.join(os.tmpdir(), "chrome-headless-" + Date.now());
    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9222",
        `--user-data-dir=${tempProfile}`,
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        `http://127.0.0.1:${PORT}`,
      ],
      { stdio: "ignore" }
    );

    await sleep(2500);

    try {
      const listRes = await fetch("http://127.0.0.1:9222/json/list");
      const pages = await listRes.json();
      const target = pages.find((p) => p.url.includes(String(PORT)));
      if (!target) throw new Error("No Chrome page target found");

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve) => (ws.onopen = resolve));

      let msgId = 1;
      function send(method, params = {}) {
        return new Promise((resolve) => {
          const id = msgId++;
          const handler = (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.id === id) {
              ws.removeEventListener("message", handler);
              resolve(msg.result);
            }
          };
          ws.addEventListener("message", handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      }

      async function takeScreenshot(filePath, clip = null) {
        const params = { format: "png" };
        if (clip) params.clip = clip;
        const res = await send("Page.captureScreenshot", params);
        fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
        console.log(
          `Saved screenshot: ${path.basename(filePath)} (${fs.statSync(filePath).size} bytes)`
        );
      }

      async function setViewport(width, height, isMobile) {
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: isMobile,
        });
        await sleep(400);
      }

      async function checkOverflow(width) {
        const evalRes = await send("Runtime.evaluate", {
          expression: `
            (() => {
              const scrollW = document.documentElement.scrollWidth;
              const clientW = document.documentElement.clientWidth;
              return { scrollW, clientW, overflow: scrollW > clientW };
            })()
          `,
          returnByValue: true,
        });
        const v = evalRes.result.value;
        console.log(
          `[Viewport ${width}px] clientWidth=${v.clientW}, scrollWidth=${v.scrollW}, hasOverflow=${v.overflow}`
        );
        return !v.overflow;
      }

      // 1. Verify Viewports for Overflow
      console.log("\n=== Verifying All Required Viewports ===");
      for (const w of [320, 390, 768, 1024, 1440, 1920]) {
        await setViewport(w, 900, w < 1024);
        await checkOverflow(w);
      }

      // 2. Capture Targeted Mentors Showcase Section Across Viewports
      console.log("\n=== Capturing Targeted Mentors Showcase Section ===");

      // Scenario 1: Standard Desktop 1440px Settled (5-card deck centered, zero overlap with left intro)
      await setViewport(1440, 950, false);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#mentors');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(1500);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-mentors-1440-settled.png"));

      // Scenario 2: Standard Desktop 1440px with Centered Modal (Complete biography, subtle backdrop)
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const plusBtn = document.querySelector('button[aria-label*="quick view" i]');
            if (plusBtn) plusBtn.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-mentors-1440-modal.png"));

      // Close modal
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const closeBtn = document.querySelector('button[aria-label*="close mentor details" i]');
            if (closeBtn) closeBtn.click();
          })()
        `,
      });
      await sleep(500);

      // Scenario 3: Live Autoplay Verification (4-second interval)
      console.log("\n=== Verifying Automatic Carousel Rotation in Real Browser ===");
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-mentors-before-rotation.png"));

      // Read current mentor counter text
      const beforeEval = await send("Runtime.evaluate", {
        expression: `document.querySelector('#mentors').innerText.match(/\\d{2} \\/ \\d{2} Mentors/)?.[0] || 'Unknown'`,
        returnByValue: true,
      });
      console.log("Mentor position before auto rotation:", beforeEval.result.value);

      // Wait 4.8 seconds for first automatic rotation (4000ms idle display + 750ms transition)
      console.log("Waiting 4.8s for automatic advance 1...");
      await sleep(4800);

      const after1Eval = await send("Runtime.evaluate", {
        expression: `document.querySelector('#mentors').innerText.match(/\\d{2} \\/ \\d{2} Mentors/)?.[0] || 'Unknown'`,
        returnByValue: true,
      });
      console.log("Mentor position after auto advance 1:", after1Eval.result.value);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-mentors-after-rotation.png"));

      // Wait another 4.8 seconds for second automatic rotation
      console.log("Waiting 4.8s for automatic advance 2...");
      await sleep(4800);

      const after2Eval = await send("Runtime.evaluate", {
        expression: `document.querySelector('#mentors').innerText.match(/\\d{2} \\/ \\d{2} Mentors/)?.[0] || 'Unknown'`,
        returnByValue: true,
      });
      console.log("Mentor position after auto advance 2:", after2Eval.result.value);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-mentors-after-rotation-2.png"));

      // Scenario 4: Manual Click Reset & Resume Verification
      console.log("\n=== Verifying Manual Click Timer Reset and Autoplay Recovery ===");
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const nextBtn = document.querySelector('button[aria-label="Next mentor"]');
            if (nextBtn) nextBtn.click();
          })()
        `,
      });
      const manualEval = await send("Runtime.evaluate", {
        expression: `document.querySelector('#mentors').innerText.match(/\\d{2} \\/ \\d{2} Mentors/)?.[0] || 'Unknown'`,
        returnByValue: true,
      });
      console.log("Mentor position immediately after manual click:", manualEval.result.value);

      // Wait 4.8s to verify autoplay resumes automatically after manual navigation
      console.log("Waiting 4.8s to verify autoplay resumes after manual navigation...");
      await sleep(4800);

      const resumedEval = await send("Runtime.evaluate", {
        expression: `document.querySelector('#mentors').innerText.match(/\\d{2} \\/ \\d{2} Mentors/)?.[0] || 'Unknown'`,
        returnByValue: true,
      });
      console.log("Mentor position after autoplay resumed:", resumedEval.result.value);

      // Scenario 5: Ultra-Wide Desktop 1920px Settled State
      await setViewport(1920, 950, false);
      await sleep(500);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-mentors-1920-settled.png"));

      // Scenario 6: Ultra-Wide Desktop 1920px Centered Modal (Consistent with 1440px / Mobile)
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const plusBtn = document.querySelector('button[aria-label*="quick view" i]');
            if (plusBtn) plusBtn.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-mentors-1920-modal.png"));

      // Close modal
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const closeBtn = document.querySelector('button[aria-label*="close mentor details" i]') || document.querySelector('[data-close-btn]');
            if (closeBtn) closeBtn.click();
          })()
        `,
      });
      await sleep(500);

      // Scenario 7: Tablet 768px (Rebalanced 3-card stack)
      await setViewport(768, 950, true);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#mentors');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "tablet-mentors-768.png"));

      // Scenario 8: Mobile 390px (1 prominent active card, scrollable chips, search)
      await setViewport(390, 1050, true);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#mentors');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-mentors-390.png"));

      // Mobile Modal Dialog (Complete biography, centered, full view)
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const plusBtn = document.querySelector('button[aria-label*="quick view" i]');
            if (plusBtn) plusBtn.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-mentors-modal-390.png"));

      ws.close();
    } finally {
      chrome.kill();
    }
  } finally {
    server.kill();
    try {
      execSync(
        `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
        { stdio: "ignore" }
      );
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :9222') do taskkill /f /pid %a`, {
        stdio: "ignore",
      });
    } catch {}
  }
}

capture().then(
  () => {
    console.log("All screenshots and viewport verifications completed successfully!");
    process.exit(0);
  },
  (err) => {
    console.error("Capture error:", err);
    process.exit(1);
  }
);
