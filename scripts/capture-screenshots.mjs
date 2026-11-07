import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3005;

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
      for (const w of [320, 390, 768, 1024, 1280, 1440, 1920]) {
        await setViewport(w, 900, w < 1024);
        await checkOverflow(w);
      }

      // 2. Capture Targeted Section 5: Learner Reviews Across Viewports
      console.log("\n=== Capturing Targeted Section 5: Learner Reviews ===");

      // Scenario 1: Standard Desktop 1440px Settled State
      await setViewport(1440, 950, false);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#reviews');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(1500);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-reviews-1440-settled.png"));

      // Scenario 2: Desktop 1280px Settled State
      await setViewport(1280, 950, false);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#reviews');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-reviews-1280-settled.png"));

      // Scenario 3: Identity Verification (Position 1: Nusrat Jahan)
      await setViewport(1440, 950, false);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tab1 = document.querySelector('button[aria-label*="Go to testimonial 1: Nusrat Jahan"]');
            if (tab1) tab1.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-reviews-identity-position-1.png"));

      // Scenario 4: Identity Verification (Position 4: Mahmudul Alam)
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tab4 = document.querySelector('button[aria-label*="Go to testimonial 4: Mahmudul Alam"]');
            if (tab4) tab4.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-reviews-identity-position-4.png"));

      // Scenario 5: Identity Verification (Position 5: Farzana Yasmin)
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tab5 = document.querySelector('button[aria-label*="Go to testimonial 5: Farzana Yasmin"]');
            if (tab5) tab5.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-reviews-identity-position-5.png"));

      // Scenario 6: Ultra-Wide Desktop 1920px Settled View
      await setViewport(1920, 950, false);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tab1 = document.querySelector('button[aria-label*="Go to testimonial 1: Nusrat Jahan"]');
            if (tab1) tab1.click();
            const sec = document.querySelector('#reviews');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-reviews-1920-settled.png"));

      // Scenario 7: Small Desktop 1024px Layout
      await setViewport(1024, 950, false);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#reviews');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-reviews-1024.png"));

      // Scenario 8: Tablet 768px Layout
      await setViewport(768, 950, true);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#reviews');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "tablet-reviews-768.png"));

      // Scenario 9: Mobile 390px Viewport (Default review)
      await setViewport(390, 1050, true);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#reviews');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-reviews-390.png"));

      // Scenario 10: Mobile 390px Viewport with Longer Testimonial (Mahmudul Alam)
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tab4 = document.querySelector('button[aria-label*="Go to testimonial 4 (mobile): Mahmudul Alam"]');
            if (tab4) tab4.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-reviews-390-long.png"));

      // Scenario 11: Compact Mobile 320px Viewport
      await setViewport(320, 1050, true);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tab1 = document.querySelector('button[aria-label*="Go to testimonial 1 (mobile): Nusrat Jahan"]');
            if (tab1) tab1.click();
            const sec = document.querySelector('#reviews');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-reviews-320.png"));

      // Scenario 12: Standard Desktop 1440px with Success Stories Modal Dialog
      await setViewport(1440, 950, false);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const ctaBtn = document.querySelector('button[aria-label*="See more learner success stories" i]');
            if (ctaBtn) ctaBtn.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-reviews-1440-modal.png"));

      // Close modal
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const closeBtn = document.querySelector('button[aria-label*="close" i]');
            if (closeBtn) closeBtn.click();
          })()
        `,
      });
      await sleep(500);

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
