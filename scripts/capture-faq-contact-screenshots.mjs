import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3006;

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

    const tempProfile = path.join(os.tmpdir(), "chrome-headless-faq-" + Date.now());
    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9223",
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
      const listRes = await fetch("http://127.0.0.1:9223/json/list");
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

      // Check overflow across viewports
      console.log("\n=== Checking Viewports for Overflow ===");
      for (const w of [320, 390, 768, 1024, 1280, 1440, 1920]) {
        await setViewport(w, 900, w < 1024);
        await checkOverflow(w);
      }

      // Helper to scroll section into view
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

      console.log("\n=== Capturing FAQ Section ===");
      // FAQ Desktop 1440
      await setViewport(1440, 950, false);
      await scrollToSection("#faq");
      await takeScreenshot(path.join(ARTIFACT_DIR, "faq-1440-default.png"));

      // Expand FAQ 3 (Schedule)
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const btn = document.querySelector('#faq-header-faq-03');
            if (btn) btn.click();
          })()
        `,
      });
      await sleep(500);
      await takeScreenshot(path.join(ARTIFACT_DIR, "faq-1440-expanded-item3.png"));

      // FAQ 1920
      await setViewport(1920, 950, false);
      await scrollToSection("#faq");
      await takeScreenshot(path.join(ARTIFACT_DIR, "faq-1920.png"));

      // FAQ 1280
      await setViewport(1280, 950, false);
      await scrollToSection("#faq");
      await takeScreenshot(path.join(ARTIFACT_DIR, "faq-1280.png"));

      // FAQ 1024
      await setViewport(1024, 950, false);
      await scrollToSection("#faq");
      await takeScreenshot(path.join(ARTIFACT_DIR, "faq-1024.png"));

      // FAQ 768
      await setViewport(768, 950, true);
      await scrollToSection("#faq");
      await takeScreenshot(path.join(ARTIFACT_DIR, "faq-768.png"));

      // FAQ 390
      await setViewport(390, 1050, true);
      await scrollToSection("#faq");
      await takeScreenshot(path.join(ARTIFACT_DIR, "faq-390.png"));

      // FAQ 320
      await setViewport(320, 1050, true);
      await scrollToSection("#faq");
      await takeScreenshot(path.join(ARTIFACT_DIR, "faq-320.png"));

      console.log("\n=== Capturing Contact Us Section ===");
      // Contact Desktop 1440 Default
      await setViewport(1440, 950, false);
      await scrollToSection("#contact");
      await takeScreenshot(path.join(ARTIFACT_DIR, "contact-1440-default.png"));

      // Click "Class Schedule" shortcut card
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const scheduleBtn = buttons.find(b => b.textContent && b.textContent.includes('Class Schedule'));
            if (scheduleBtn) scheduleBtn.click();
          })()
        `,
      });
      await sleep(500);
      await takeScreenshot(path.join(ARTIFACT_DIR, "contact-1440-shortcut-selected.png"));

      // Trigger validation error by submitting empty form
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Send Message'));
            if (submitBtn) submitBtn.click();
          })()
        `,
      });
      await sleep(600);
      await takeScreenshot(path.join(ARTIFACT_DIR, "contact-1440-validation-error.png"));

      // Contact 1920
      await setViewport(1920, 950, false);
      await scrollToSection("#contact");
      await takeScreenshot(path.join(ARTIFACT_DIR, "contact-1920.png"));

      // Contact 1280
      await setViewport(1280, 950, false);
      await scrollToSection("#contact");
      await takeScreenshot(path.join(ARTIFACT_DIR, "contact-1280.png"));

      // Contact 1024
      await setViewport(1024, 950, false);
      await scrollToSection("#contact");
      await takeScreenshot(path.join(ARTIFACT_DIR, "contact-1024.png"));

      // Contact 768
      await setViewport(768, 950, true);
      await scrollToSection("#contact");
      await takeScreenshot(path.join(ARTIFACT_DIR, "contact-768.png"));

      // Contact 390
      await setViewport(390, 1050, true);
      await scrollToSection("#contact");
      await takeScreenshot(path.join(ARTIFACT_DIR, "contact-390.png"));

      // Contact 320
      await setViewport(320, 1050, true);
      await scrollToSection("#contact");
      await takeScreenshot(path.join(ARTIFACT_DIR, "contact-320.png"));

      console.log("\n=== Verifying FAQ to Contact CTA Click ===");
      await setViewport(1440, 950, false);
      await scrollToSection("#faq");
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const faqContactBtn = document.querySelector('#faq a[href="#contact"]');
            if (faqContactBtn) faqContactBtn.click();
          })()
        `,
      });
      await sleep(800);
      const scrollPos = await send("Runtime.evaluate", {
        expression: `window.scrollY`,
        returnByValue: true,
      });
      console.log(`Scroll position after FAQ Contact Us CTA click: ${scrollPos.result.value}px`);

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
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :9223') do taskkill /f /pid %a`, {
        stdio: "ignore",
      });
    } catch {}
  }
}

capture().then(
  () => {
    console.log("\nAll FAQ and Contact Us visual captures finished successfully!");
    process.exit(0);
  },
  (err) => {
    console.error("Capture error:", err);
    process.exit(1);
  }
);
