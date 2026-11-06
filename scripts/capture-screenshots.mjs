import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3060;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await sleep(350);
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function capture() {
  console.log(`Starting Next.js server on port ${PORT}...`);
  const server = spawn("cmd.exe", ["/c", "pnpm", "start", "-p", String(PORT)], {
    stdio: "ignore",
    env: { ...process.env, PORT: String(PORT) },
  });

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    console.log("Server ready!");

    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9222",
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
      for (const w of [320, 390, 768, 1024, 1440]) {
        await setViewport(w, 900, w < 1024);
        await checkOverflow(w);
      }

      // 2. Capture Desktop (1440px)
      console.log("\n=== Capturing Desktop Viewport (1440px) ===");
      await setViewport(1440, 1050, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-hero-1440.png"));

      // 3. Capture Tablet (768px)
      console.log("\n=== Capturing Tablet Viewport (768px) ===");
      await setViewport(768, 1100, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "tablet-hero-768.png"));

      // 4. Capture Mobile (390px)
      console.log("\n=== Capturing Mobile Viewport (390px) ===");
      await setViewport(390, 1000, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-hero-390.png"));

      // 5. Capture Targeted Partners Section view across viewports
      console.log("\n=== Capturing Targeted Partners Section ===");
      await setViewport(1440, 700, false);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('section[aria-label*="Corporate Sector Alignments"]');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'center' });
          })()
        `,
      });
      await sleep(300);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-partners-1440.png"));

      // 6. Capture Targeted Courses Section View Across Viewports
      console.log("\n=== Capturing Targeted Courses Section ===");
      // Desktop Courses Grid
      await setViewport(1440, 1200, false);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#courses');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(400);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-courses-1440.png"));

      // Tablet Courses Grid
      await setViewport(768, 1400, true);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#courses');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(400);
      await takeScreenshot(path.join(ARTIFACT_DIR, "tablet-courses-768.png"));

      // Mobile Courses Grid
      await setViewport(390, 1400, true);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const sec = document.querySelector('#courses');
            if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'start' });
          })()
        `,
      });
      await sleep(400);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-courses-390.png"));

      // 7. Capture Individual Cards: Normal vs Hover for 2, 3, 4, 5, 6 Mentors
      console.log("\n=== Capturing Normal & Hover States for 2, 3, 4, 5, 6 Mentors ===");
      await setViewport(1440, 1000, false);

      for (const count of [2, 3, 4, 5, 6]) {
        // Move mouse away to reset any hover state
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: 0,
          y: 0,
        });
        await sleep(300);

        // Scroll card into view and get precise coordinates
        const cardBox = await send("Runtime.evaluate", {
          expression: `
            (() => {
              const card = document.querySelector('[data-mentor-count="${count}"]');
              if (!card) return null;
              card.scrollIntoView({ behavior: 'instant', block: 'center' });
              const r = card.getBoundingClientRect();
              return {
                pageX: window.scrollX + r.left,
                pageY: window.scrollY + r.top,
                width: r.width,
                height: r.height,
                vpX: r.left + r.width / 2,
                vpY: r.top + r.height / 2
              };
            })()
          `,
          returnByValue: true,
        });

        if (!cardBox.result.value) {
          console.warn(`Card with ${count} mentors not found!`);
          continue;
        }

        const box = cardBox.result.value;
        await sleep(400);

        // 7a. Normal State Screenshot (with 4px margin around card border)
        await takeScreenshot(path.join(ARTIFACT_DIR, `courses-card-${count}mentors-normal.png`), {
          x: Math.max(0, Math.round(box.pageX - 4)),
          y: Math.max(0, Math.round(box.pageY - 4)),
          width: Math.round(box.width + 8),
          height: Math.round(box.height + 8),
          scale: 1,
        });

        // 7b. Hover State: dispatch mouse event to card center
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: Math.round(box.vpX),
          y: Math.round(box.vpY),
        });

        // Wait 700ms for the 500ms transition to fully complete
        await sleep(700);

        // Re-query precise card position to account for any micro-scroll
        const hoverCardBox = await send("Runtime.evaluate", {
          expression: `
            (() => {
              const card = document.querySelector('[data-mentor-count="${count}"]');
              if (!card) return null;
              const r = card.getBoundingClientRect();
              return {
                pageX: window.scrollX + r.left,
                pageY: window.scrollY + r.top,
                width: r.width,
                height: r.height
              };
            })()
          `,
          returnByValue: true,
        });
        const hBox = hoverCardBox.result?.value || box;

        // Capture Hover State Screenshot (with 4px margin around card border)
        await takeScreenshot(path.join(ARTIFACT_DIR, `courses-card-${count}mentors-hover.png`), {
          x: Math.max(0, Math.round(hBox.pageX - 4)),
          y: Math.max(0, Math.round(hBox.pageY - 4)),
          width: Math.round(hBox.width + 8),
          height: Math.round(hBox.height + 8),
          scale: 1,
        });

        console.log(
          `✓ Successfully verified and captured ${count}-mentor normal and hover states.`
        );
      }

      // Move mouse away
      await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: 0,
        y: 0,
      });

      // 8. Capture Full Page Screenshots
      console.log("\n=== Capturing Full Page Screenshots ===");
      await send("Runtime.evaluate", {
        expression: `window.scrollTo(0, 0);`,
      });
      await setViewport(1440, 5600, false);
      await takeScreenshot(path.join(ARTIFACT_DIR, "desktop-1440.png"));

      await setViewport(768, 6200, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "tablet-768.png"));

      await setViewport(390, 7400, true);
      await takeScreenshot(path.join(ARTIFACT_DIR, "mobile-390.png"));

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
