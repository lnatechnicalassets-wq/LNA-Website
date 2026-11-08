import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR =
  "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3010;

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

async function runReview() {
  try {
    execSync(
      `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
      { stdio: "ignore" }
    );
  } catch {}

  console.log(`Starting Next.js production server on port ${PORT}...`);
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

    const tempProfile = path.join(os.tmpdir(), "chrome-review-" + Date.now());
    const chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        "--remote-debugging-port=9235",
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
      const listRes = await fetch("http://127.0.0.1:9235/json/list");
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
        console.log(`Captured: ${path.basename(filePath)} (${fs.statSync(filePath).size} bytes)`);
      }

      async function setViewport(width, height) {
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await sleep(400);
      }

      async function pauseAutoplay() {
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const srBtn = document.querySelector('button[aria-label*="Pause automatic slide rotation"]');
              if (srBtn) srBtn.click();
            })()
          `,
        });
        await sleep(200);
      }

      async function selectSlide(slideIndex) {
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const tabs = document.querySelectorAll('button[role="tab"]');
              if (tabs[${slideIndex}]) {
                tabs[${slideIndex}].click();
              }
            })()
          `,
        });
        await sleep(650);
      }

      async function evaluate(code) {
        const res = await send("Runtime.evaluate", {
          expression: code,
          returnByValue: true,
        });
        return res.result.value;
      }

      // Step 1: Pause autoplay during measurement
      await pauseAutoplay();

      // Check Slide Count & Arrows
      const slideMeta = await evaluate(`
        (() => {
          const slides = document.querySelectorAll('div[role="region"][aria-roledescription="carousel"] div[role="group"][aria-roledescription="slide"]');
          const leftArrows = document.querySelectorAll('button[aria-label*="Previous"], button[aria-label*="prev"]');
          const rightArrows = document.querySelectorAll('button[aria-label*="Next"], button[aria-label*="next"]');
          const tabs = document.querySelectorAll('button[role="tab"]');
          return {
            slideCount: slides.length,
            tabCount: tabs.length,
            leftArrowsCount: leftArrows.length,
            rightArrowsCount: rightArrows.length
          };
        })()
      `);
      console.log("\n--- Slide Metadata & Controls ---", slideMeta);

      // --- CAPTURE MTO & IRGP AT 1440px ---
      console.log("\n--- Capturing 1440px Viewports ---");
      await setViewport(1440, 900);
      await selectSlide(0);
      await takeScreenshot(path.join(ARTIFACT_DIR, "review-hero-mto-1440.png"));

      // Check MTO mentors visible & bounding rects
      const mtoMentorsInfo = await evaluate(`
        (() => {
          const activeSlide = document.querySelector('div[role="group"][aria-roledescription="slide"][aria-hidden="false"]');
          const heading = activeSlide ? activeSlide.querySelector('h3')?.innerText : null;
          const desc = activeSlide ? activeSlide.querySelector('p')?.innerText : null;
          const mentorBtns = Array.from(activeSlide.querySelectorAll('button[aria-label*="View mentor profile"]'));
          const mentorCards = mentorBtns.map(b => {
            const rect = b.getBoundingClientRect();
            const img = b.querySelector('img');
            const h4 = b.querySelector('h4')?.innerText;
            const pRole = b.querySelectorAll('p')[0]?.innerText;
            const pOrg = b.querySelectorAll('p')[1]?.innerText;
            return {
              name: h4,
              role: pRole,
              org: pOrg,
              imgSrc: img ? img.src : null,
              imgComplete: img ? img.complete : false,
              naturalWidth: img ? img.naturalWidth : 0,
              rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
            };
          });
          return { heading, desc, mentorCount: mentorCards.length, mentors: mentorCards };
        })()
      `);
      console.log("MTO Mentors Visible on Slide 1:", mtoMentorsInfo);

      // Switch to Slide 2 (IRGP)
      await selectSlide(1);
      await takeScreenshot(path.join(ARTIFACT_DIR, "review-hero-irgp-1440.png"));

      // Check IRGP mentors visible & bounding rects
      const irgpMentorsInfo = await evaluate(`
        (() => {
          const activeSlide = document.querySelector('div[role="group"][aria-roledescription="slide"][aria-hidden="false"]');
          const heading = activeSlide ? activeSlide.querySelector('h3')?.innerText : null;
          const desc = activeSlide ? activeSlide.querySelector('p')?.innerText : null;
          const mentorBtns = Array.from(activeSlide.querySelectorAll('button[aria-label*="View mentor profile"]'));
          const mentorCards = mentorBtns.map(b => {
            const rect = b.getBoundingClientRect();
            const img = b.querySelector('img');
            const h4 = b.querySelector('h4')?.innerText;
            const pRole = b.querySelectorAll('p')[0]?.innerText;
            const pOrg = b.querySelectorAll('p')[1]?.innerText;
            return {
              name: h4,
              role: pRole,
              org: pOrg,
              imgSrc: img ? img.src : null,
              imgComplete: img ? img.complete : false,
              naturalWidth: img ? img.naturalWidth : 0,
              rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
            };
          });
          return { heading, desc, mentorCount: mentorCards.length, mentors: mentorCards };
        })()
      `);
      console.log("IRGP Mentors Visible on Slide 2:", irgpMentorsInfo);

      // --- CAPTURE MTO & IRGP AT 1920px ---
      console.log("\n--- Capturing 1920px Viewports ---");
      await setViewport(1920, 950);
      await selectSlide(0);
      await takeScreenshot(path.join(ARTIFACT_DIR, "review-hero-mto-1920.png"));

      // Measure layout whitespace & overlap at 1920px
      const layout1920 = await evaluate(`
        (() => {
          const activeSlide = document.querySelector('div[role="group"][aria-roledescription="slide"][aria-hidden="false"]');
          const leftCol = activeSlide.querySelector('.lg\\\\:col-span-5');
          const rightCol = activeSlide.querySelector('.lg\\\\:col-span-7');
          const leftRect = leftCol ? leftCol.getBoundingClientRect() : null;
          const rightRect = rightCol ? rightCol.getBoundingClientRect() : null;
          const heroRegion = document.querySelector('div[role="region"][aria-roledescription="carousel"]');
          const heroRect = heroRegion ? heroRegion.getBoundingClientRect() : null;
          return { heroRect, leftRect, rightRect, gapBetweenCols: rightRect ? rightRect.left - leftRect.right : null };
        })()
      `);
      console.log("Layout Geometry at 1920px (MTO):", layout1920);

      await selectSlide(1);
      await takeScreenshot(path.join(ARTIFACT_DIR, "review-hero-irgp-1920.png"));

      // --- TEST MODAL INTERACTION ---
      console.log("\n--- Testing Modal Interaction on MTO Mentor ---");
      await selectSlide(0);
      // Click Mir Hasib Mahmud
      const modalOpened = await evaluate(`
        (() => {
          const btn = Array.from(document.querySelectorAll('button[aria-label*="Mir Hasib Mahmud"]'))[0];
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        })()
      `);
      await sleep(700);
      await takeScreenshot(path.join(ARTIFACT_DIR, "review-hero-modal-mto.png"));

      const modalInfo = await evaluate(`
        (() => {
          const dialog = document.querySelector('div[role="dialog"]');
          if (!dialog) return null;
          return {
            title: dialog.querySelector('h2, h3, h4')?.innerText,
            roleAndOrg: dialog.innerText.slice(0, 300),
            hasCloseButton: Boolean(dialog.querySelector('button[aria-label*="Close"]'))
          };
        })()
      `);
      console.log("MTO Modal Dialog Details:", modalInfo);

      // Close modal
      await evaluate(`
        (() => {
          const closeBtn = document.querySelector('button[aria-label*="Close mentor details"]');
          if (closeBtn) closeBtn.click();
        })()
      `);
      await sleep(400);

      // Test Modal on IRGP Mentor
      console.log("\n--- Testing Modal Interaction on IRGP Mentor ---");
      await selectSlide(1);
      await evaluate(`
        (() => {
          const btn = Array.from(document.querySelectorAll('button[aria-label*="Shahnawaj Chowdhury"]'))[0];
          if (btn) btn.click();
        })()
      `);
      await sleep(700);
      await takeScreenshot(path.join(ARTIFACT_DIR, "review-hero-modal-irgp.png"));

      const irgpModalInfo = await evaluate(`
        (() => {
          const dialog = document.querySelector('div[role="dialog"]');
          if (!dialog) return null;
          return {
            title: dialog.querySelector('h2, h3, h4')?.innerText,
            roleAndOrg: dialog.innerText.slice(0, 300),
            hasCloseButton: Boolean(dialog.querySelector('button[aria-label*="Close"]'))
          };
        })()
      `);
      console.log("IRGP Modal Dialog Details:", irgpModalInfo);

      // Close modal
      await evaluate(`
        (() => {
          const closeBtn = document.querySelector('button[aria-label*="Close mentor details"]');
          if (closeBtn) closeBtn.click();
        })()
      `);
      await sleep(400);

      ws.close();
      chrome.kill();
      console.log("Review completed successfully!");
    } catch (e) {
      chrome.kill();
      throw e;
    }
  } finally {
    try {
      server.kill();
      execSync(
        `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`,
        { stdio: "ignore" }
      );
    } catch {}
  }
}

runReview().catch((e) => {
  console.error("Review script error:", e);
  process.exit(1);
});
