import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3008;

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

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    console.log("Server ready!");

    const tempProfile = path.join(os.tmpdir(), "chrome-headless-reviews-" + Date.now());
    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9224",
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
      const listRes = await fetch("http://127.0.0.1:9224/json/list");
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

      async function takeScreenshot(filePath) {
        const params = { format: "png" };
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

      async function scrollToSection(selector) {
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const el = document.querySelector('${selector}');
              if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
            })()
          `,
        });
        await sleep(600);
      }

      console.log("\n=== Checking Viewports for Overflow ===");
      for (const w of [320, 390, 768, 1024, 1280, 1440, 1920]) {
        await setViewport(w, 950, w < 1024);
        await checkOverflow(w);
      }

      console.log("\n=== Capturing Section 5 (Real Learning. Real Impact.) Across Viewports ===");

      // 1. Desktop 1920
      await setViewport(1920, 950, false);
      await scrollToSection("#reviews");
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-1920.png"));

      // 2. Desktop 1440 Default
      await setViewport(1440, 950, false);
      await scrollToSection("#reviews");
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-1440.png"));

      // 3. Desktop 1280
      await setViewport(1280, 950, false);
      await scrollToSection("#reviews");
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-1280.png"));

      // 4. Tablet / Small Desktop 1024
      await setViewport(1024, 950, false);
      await scrollToSection("#reviews");
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-1024.png"));

      // 5. Tablet 768
      await setViewport(768, 950, true);
      await scrollToSection("#reviews");
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-768.png"));

      // 6. Mobile 390
      await setViewport(390, 1050, true);
      await scrollToSection("#reviews");
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-390.png"));

      // 7. Mobile 320
      await setViewport(320, 1050, true);
      await scrollToSection("#reviews");
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-320.png"));

      console.log("\n=== Capturing Interactive States ===");

      // 8. Testimonial advance to next review
      await setViewport(1440, 950, false);
      await scrollToSection("#reviews");
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const nextBtn = document.querySelector('button[aria-label="Next testimonial"]');
            if (nextBtn) nextBtn.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-1440-next-review.png"));

      // 9. Gallery Lightbox Open
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const photoBtn = document.querySelector('button[aria-label^="Open photo 1"]');
            if (photoBtn) photoBtn.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-1440-gallery-lightbox.png"));

      // Close Lightbox
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const closeBtn = document.querySelector('button[aria-label="Close Lightbox"]');
            if (closeBtn) closeBtn.click();
          })()
        `,
      });
      await sleep(500);

      // 10. IRGP Success Story Modal Open
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const storyBtn = document.querySelector('button[aria-label^="Explore details of Industry Readiness"]');
            if (storyBtn) storyBtn.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-1440-story-modal.png"));

      // Close Modal
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const closeBtn = document.querySelector('button[aria-label="Close"]');
            if (closeBtn) closeBtn.click();
          })()
        `,
      });
      await sleep(500);

      // 11. Outcomes Strip Tooltip Open
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const infoBtn = document.querySelector('button[aria-label^="About Career Progress"]');
            if (infoBtn) infoBtn.click();
          })()
        `,
      });
      await sleep(400);
      await takeScreenshot(path.join(ARTIFACT_DIR, "reviews-1440-outcomes-tooltip.png"));

      console.log("\nAll Section 5 upgraded captures completed successfully!");
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
    } catch {}
  }
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
