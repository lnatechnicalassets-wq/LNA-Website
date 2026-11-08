import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ARTIFACT_DIR = "C:/Users/refat/.gemini/antigravity/brain/c0a9f902-1d07-4d4e-8d3a-e34931387069";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 3022;
const DEBUG_PORT = 9248;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {}
    await sleep(350);
  }
  throw new Error(`Server failed to respond at ${url} within ${timeoutMs}ms`);
}

async function runReview() {
  console.log("=== Lead Nation Academy - Targeted Pass Visual & Interaction Verification ===");

  // Clean any hanging port
  try {
    execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`, { stdio: "ignore" });
  } catch {}
  try {
    execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${DEBUG_PORT}') do taskkill /f /pid %a`, { stdio: "ignore" });
  } catch {}

  const server = spawn("cmd.exe", ["/c", "npx", "next", "start", "-H", "127.0.0.1", "-p", String(PORT)], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(PORT) },
  });

  const tempProfile = path.join(process.cwd(), ".temp-chrome-" + Date.now());
  let chrome;

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    console.log("✓ Next.js production server running on port " + PORT);

    chrome = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${tempProfile}`,
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "about:blank",
      ],
      { stdio: "ignore" }
    );

    await sleep(2500);

    const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const pages = await listRes.json();
    const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    let reqId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener("message", handler);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("DOM.enable");

    // =========================================================================
    // 1. DESKTOP REVIEW (1440 x 900)
    // =========================================================================
    console.log("\n--- 1. Desktop Review (1440 x 900) ---");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
    await sleep(2500);

    // Progressive scroll to trigger all image loads and observer entries
    await send("Runtime.evaluate", {
      expression: `(async () => {
        const totalHeight = document.body.scrollHeight;
        for (let y = 0; y < totalHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      })()`,
      awaitPromise: true,
    });
    await sleep(1500);

    // Section sequence check
    const sectionAudit = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const sections = Array.from(document.querySelectorAll("main > div > section, main > section, footer")).map(el => ({
          tagName: el.tagName,
          id: el.id || "(no-id)",
          ariaLabel: el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || "(none)",
          textHeading: el.querySelector("h1, h2, h3, h4")?.innerText?.trim()?.split("\\n")[0] || "(no-heading)",
          height: el.offsetHeight,
          offsetTop: el.offsetTop,
        }));

        const bodyWidth = document.body.scrollWidth;
        const windowWidth = window.innerWidth;
        const hasHorizontalScroll = bodyWidth > windowWidth;

        // Check Course Card dimensions on Desktop
        const courseCards = Array.from(document.querySelectorAll("#courses [data-testid='course-card']")).map(c => ({
          id: c.getAttribute("data-course-id"),
          offsetWidth: c.offsetWidth,
          offsetHeight: c.offsetHeight,
        }));

        return {
          sections,
          bodyWidth,
          windowWidth,
          hasHorizontalScroll,
          courseCards,
        };
      })()`,
    });

    console.log("Sections detected:", JSON.stringify(sectionAudit.result.value.sections, null, 2));
    console.log("Desktop horizontal scroll:", sectionAudit.result.value.hasHorizontalScroll ? "FAIL" : "PASS (No overflow)");
    console.log("Desktop course card dimensions:", sectionAudit.result.value.courseCards);

    // Capture Full Desktop Page Screenshot
    const fullDesktopRes = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    const desktopPath = path.join(ARTIFACT_DIR, "homepage-desktop-full.png");
    fs.writeFileSync(desktopPath, Buffer.from(fullDesktopRes.data, "base64"));
    console.log(`✓ Saved desktop full-page screenshot: ${desktopPath} (${fs.statSync(desktopPath).size} bytes)`);

    // Capture Close-up of Desktop Course Cards
    await send("Runtime.evaluate", {
      expression: `document.getElementById('courses').scrollIntoView({ behavior: 'instant', block: 'center' });`,
    });
    await sleep(1000);
    const courseCloseupRes = await send("Page.captureScreenshot", { format: "png" });
    const courseCloseupPath = path.join(ARTIFACT_DIR, "courses-desktop-cards.png");
    fs.writeFileSync(courseCloseupPath, Buffer.from(courseCloseupRes.data, "base64"));
    console.log(`✓ Saved close-up desktop course cards screenshot: ${courseCloseupPath} (${fs.statSync(courseCloseupPath).size} bytes)`);

    // Scroll back to top
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, 0);` });
    await sleep(600);

    // =========================================================================
    // 2. HERO SLIDE 2 (IRGP) CHECK
    // =========================================================================
    console.log("\n--- Checking Hero Slide 2 (IRGP) ---");
    await send("Runtime.evaluate", {
      expression: `(() => {
        const dots = Array.from(document.querySelectorAll("button[aria-label*='slide' i], button[aria-label*='Go to slide' i]"));
        if (dots.length >= 2) dots[1].click();
      })()`,
    });
    await sleep(1500);

    const irgpCheck = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const irgpSlide = document.querySelector("[aria-roledescription='slide'][aria-hidden='false']");
        const heading = irgpSlide?.querySelector("h1")?.innerText || "";
        const mentorCards = irgpSlide?.querySelectorAll("img[alt]").length || 0;
        return { heading, visibleMentors: mentorCards };
      })()`,
    });
    console.log("IRGP slide switch check:", irgpCheck.result.value);

    // Switch back to Slide 1 (MTO)
    await send("Runtime.evaluate", {
      expression: `(() => {
        const dots = Array.from(document.querySelectorAll("button[aria-label*='slide' i], button[aria-label*='Go to slide' i]"));
        if (dots.length >= 1) dots[0].click();
      })()`,
    });
    await sleep(1000);

    // =========================================================================
    // 3. INTERACTION TESTS
    // =========================================================================
    console.log("\n--- Testing Interactions ---");

    // Course Modal
    const courseModalTest = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const mtoCard = document.querySelector("#courses [data-course-id='mto-readiness']");
        if (mtoCard) {
          mtoCard.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()`,
    });
    await sleep(800);

    const courseModalState = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const dialog = document.querySelector("[role='dialog']");
        const open = !!dialog;
        const heading = dialog?.querySelector("h2, h3")?.innerText;
        const closeBtn = dialog?.querySelector("button[aria-label*='close' i], button:has(svg.lucide-x)");
        if (closeBtn) closeBtn.click();
        return { modalOpened: open, title: heading, closed: !!closeBtn };
      })()`,
    });
    console.log("MTO Course modal test:", courseModalState.result.value);
    await sleep(500);

    // Internship Modal
    const internModalTest = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const card = document.querySelector("#internships [data-testid='internship-card']");
        if (card) {
          card.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()`,
    });
    await sleep(800);

    const internModalState = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const dialog = document.querySelector("[role='dialog']");
        const open = !!dialog;
        const heading = dialog?.querySelector("h2, h3")?.innerText;
        const closeBtn = dialog?.querySelector("button[aria-label*='close' i], button:has(svg.lucide-x)");
        if (closeBtn) closeBtn.click();
        return { modalOpened: open, title: heading, closed: !!closeBtn };
      })()`,
    });
    console.log("Internship modal test:", internModalState.result.value);
    await sleep(500);

    // Footer Links Navigation Audit
    const footerLinkAudit = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const links = Array.from(document.querySelectorAll("footer a[href]")).map(a => ({
          text: a.innerText.trim().replace("\\n", " "),
          href: a.getAttribute("href"),
        }));
        return links;
      })()`,
    });
    console.log("Footer links audit:", JSON.stringify(footerLinkAudit.result.value, null, 2));

    // =========================================================================
    // 4. MOBILE REVIEW (390 x 844)
    // =========================================================================
    console.log("\n--- 4. Mobile Review (390 x 844) ---");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await send("Page.navigate", { url: `http://127.0.0.1:${PORT}` });
    await sleep(2500);

    // Capture Close-up of Mobile Hero
    const heroMobileCloseupRes = await send("Page.captureScreenshot", { format: "png" });
    const heroMobileCloseupPath = path.join(ARTIFACT_DIR, "hero-mobile-closeup.png");
    fs.writeFileSync(heroMobileCloseupPath, Buffer.from(heroMobileCloseupRes.data, "base64"));
    console.log(`✓ Saved close-up mobile hero screenshot: ${heroMobileCloseupPath} (${fs.statSync(heroMobileCloseupPath).size} bytes)`);

    // Progressive scroll on mobile to trigger all image loads
    await send("Runtime.evaluate", {
      expression: `(async () => {
        const totalHeight = document.body.scrollHeight;
        for (let y = 0; y < totalHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 100));
        }
        window.scrollTo(0, 0);
      })()`,
      awaitPromise: true,
    });
    await sleep(1500);

    const mobileAudit = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        return {
          bodyWidth: document.body.scrollWidth,
          windowWidth: window.innerWidth,
          hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
          heroHeading: document.querySelector("h1")?.innerText?.replace("\\n", " "),
          coursesCount: document.querySelectorAll("#courses [data-testid='course-card']").length,
          internshipsCount: document.querySelectorAll("#internships [data-testid='internship-card']").length,
        };
      })()`,
    });
    console.log("Mobile audit:", mobileAudit.result.value);
    console.log("Mobile horizontal scroll:", mobileAudit.result.value.hasHorizontalScroll ? "FAIL" : "PASS (No overflow)");

    // Capture Full Mobile Page Screenshot
    const fullMobileRes = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    const mobilePath = path.join(ARTIFACT_DIR, "homepage-mobile-full.png");
    fs.writeFileSync(mobilePath, Buffer.from(fullMobileRes.data, "base64"));
    console.log(`✓ Saved mobile full-page screenshot: ${mobilePath} (${fs.statSync(mobilePath).size} bytes)`);

    ws.close();
    console.log("\n=== Targeted Pass Review Finished Successfully ===");
  } finally {
    if (chrome) {
      chrome.kill("SIGKILL");
    }
    server.kill("SIGKILL");
    try {
      if (fs.existsSync(tempProfile)) {
        fs.rmSync(tempProfile, { recursive: true, force: true });
      }
    } catch {}
    try {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /f /pid %a`, { stdio: "ignore" });
    } catch {}
    try {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${DEBUG_PORT}') do taskkill /f /pid %a`, { stdio: "ignore" });
    } catch {}
  }
}

runReview().catch((err) => {
  console.error("Review script error:", err);
  process.exit(1);
});
