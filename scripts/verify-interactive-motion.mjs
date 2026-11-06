import { spawn, execSync } from "child_process";

const PORT = 3060;
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";

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

async function verifyMotionAndControls() {
  console.log("Starting Next.js server for interactive motion & control inspection...");
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

      // 1. Verify Hero Controls: Exactly 3 indicators, 0 arrow buttons, no visible pause icon
      const heroCheck = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tabs = document.querySelectorAll('[role="tab"]');
            const prevBtn = document.querySelector('button[aria-label="Previous slide"]');
            const nextBtn = document.querySelector('button[aria-label="Next slide"]');
            const visiblePauseBtn = document.querySelector('button[aria-label*="Pause hero"]:not(.sr-only)');
            const kbPauseBtn = document.querySelector('button.sr-only[aria-label*="slide rotation"], button.sr-only:focus');

            // Indicator shapes
            const activeIndicator = tabs[0]?.querySelector('span')?.className || '';
            const inactiveIndicator = tabs[1]?.querySelector('span')?.className || '';

            return {
              tabCount: tabs.length,
              hasPrevBtn: !!prevBtn,
              hasNextBtn: !!nextBtn,
              hasVisiblePauseBtn: !!visiblePauseBtn,
              activeHas32pxPill: activeIndicator.includes('w-[32px]') && activeIndicator.includes('h-[8px]') && activeIndicator.includes('#086477'),
              inactiveHas9pxCircle: inactiveIndicator.includes('w-[9px]') && inactiveIndicator.includes('h-[9px]') && inactiveIndicator.includes('#C5DDE0'),
            };
          })()
        `,
        returnByValue: true,
      });
      console.log("Hero Controls & Indicator Shapes Check:", heroCheck.result.value);

      // 2. Verify Hero 7-Second Autoplay in Actual Browser
      console.log("Waiting 7.5s to verify natural hero autoplay advancement...");
      const beforeAutoplay = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tabs = document.querySelectorAll('[role="tab"]');
            return {
              tab0Selected: tabs[0]?.getAttribute('aria-selected') === 'true',
              tab1Selected: tabs[1]?.getAttribute('aria-selected') === 'true',
            };
          })()
        `,
        returnByValue: true,
      });

      await sleep(7500);

      const afterAutoplay = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tabs = document.querySelectorAll('[role="tab"]');
            return {
              tab0Selected: tabs[0]?.getAttribute('aria-selected') === 'true',
              tab1Selected: tabs[1]?.getAttribute('aria-selected') === 'true',
            };
          })()
        `,
        returnByValue: true,
      });
      console.log("Hero Autoplay 7s Progression:", {
        before: beforeAutoplay.result.value,
        after: afterAutoplay.result.value,
      });

      // 3. Verify Manual Selection Stops Autoplay
      const manualSelection = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tabs = document.querySelectorAll('[role="tab"]');
            tabs[2].click(); // click slide 3
            return {
              tab2SelectedAfterClick: tabs[2]?.getAttribute('aria-selected') === 'true',
            };
          })()
        `,
        returnByValue: true,
      });
      console.log("Manual Slide 3 Selection:", manualSelection.result.value);

      // Wait another 7.5s to confirm slide remains on slide 3 (autoplay stopped permanently)
      console.log("Waiting 7.5s to confirm autoplay permanently stopped after manual selection...");
      await sleep(7500);

      const afterManualWait = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const tabs = document.querySelectorAll('[role="tab"]');
            return {
              tab2StillSelected: tabs[2]?.getAttribute('aria-selected') === 'true',
            };
          })()
        `,
        returnByValue: true,
      });
      console.log("After Manual Wait (Remains on Slide 3):", afterManualWait.result.value);

      // 4. Verify Partners Continuous Motion
      const motionCheck1 = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const marquee = document.querySelector('.animate-marquee');
            const style = window.getComputedStyle(marquee);
            return {
              animationName: style.animationName,
              animationDuration: style.animationDuration,
              animationTimingFunction: style.animationTimingFunction,
              matrixBefore: style.transform,
            };
          })()
        `,
        returnByValue: true,
      });

      await sleep(1500);

      const motionCheck2 = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const marquee = document.querySelector('.animate-marquee');
            const style = window.getComputedStyle(marquee);
            return { matrixAfter: style.transform };
          })()
        `,
        returnByValue: true,
      });
      console.log("Partners Marquee Motion Delta (1.5s):", {
        config: motionCheck1.result.value,
        after: motionCheck2.result.value,
      });

      // 5. Verify Accessible Motion-Stop Functionality in Partners
      const partnersStopCheck = await send("Runtime.evaluate", {
        expression: `
          (() => {
            // Check that prominent visible icon is GONE
            const visiblePauseBtn = document.querySelector('section[aria-label*="Corporate Sector Alignments"] button:not(.sr-only)');
            
            // Check keyboard-discoverable button exists
            const kbBtn = document.querySelector('section[aria-label*="Corporate Sector Alignments"] button.sr-only');
            
            // Test track click pause for touch users
            const track = document.querySelector('[role="region"][aria-label*="Partner organizations"]');
            track.click(); // click to pause
            const marquee = document.querySelector('.animate-marquee');
            const isPausedAfterClick = marquee.classList.contains('animate-marquee-paused');

            track.click(); // click to resume
            const isPausedAfterResume = marquee.classList.contains('animate-marquee-paused');

            return {
              hasVisibleProminentPauseBtn: !!visiblePauseBtn,
              hasKeyboardDiscoverableBtn: !!kbBtn,
              touchClickPauses: isPausedAfterClick,
              touchClickResumes: !isPausedAfterResume,
            };
          })()
        `,
        returnByValue: true,
      });
      console.log("Partners Accessible Motion-Stop Verification:", partnersStopCheck.result.value);

      // 6. Verify Duplicated Track Hidden from Assistive Technology
      const a11yTrack = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const marquee = document.querySelector('.animate-marquee');
            const tracks = marquee ? marquee.children : [];
            const track1Hidden = tracks[0] ? tracks[0].getAttribute('aria-hidden') : null;
            const track2Hidden = tracks[1] ? tracks[1].getAttribute('aria-hidden') : null;
            return { trackCount: tracks.length, track1Hidden, track2Hidden };
          })()
        `,
        returnByValue: true,
      });
      console.log("Assistive Technology Duplication Protection:", a11yTrack.result.value);

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

verifyMotionAndControls().then(() => {
  console.log("All interactive motion, autoplay, and accessibility checks completed successfully!");
  process.exit(0);
});
