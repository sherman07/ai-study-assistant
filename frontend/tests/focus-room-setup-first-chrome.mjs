/**
 * Chrome probe: Focus Room opens on setup first, then enters session.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { prepareChromeProbe } from "./chrome-probe-guard.mjs";

const probe = prepareChromeProbe("focus-room-setup-first-chrome");
if (!probe.ok) {
  console.log(probe.reason);
  process.exit(0);
}
const { puppeteer, executablePath, distRoot, root } = probe;
const artifactDir = "/opt/cursor/artifacts";
fs.mkdirSync(artifactDir, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".json": "application/json",
      ".woff2": "font/woff2",
    }[ext] || "application/octet-stream"
  );
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const safePath = urlPath === "/" ? "/frontend/focus-room.html" : urlPath;
      const filePath = path.join(distRoot, safePath.replace(/^\//, ""));
      if (!filePath.startsWith(distRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType(filePath) });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
    server.on("error", reject);
  });
}

async function main() {
  assert.ok(fs.existsSync(path.join(distRoot, "frontend/focus-room.html")), "dist build required");
  const { server, port } = await startStaticServer();
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,1100"],
    defaultViewport: { width: 1440, height: 1100 },
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      window.SYNAPSE_FOCUS_ROOM_ENABLED = true;
      window.localStorage.clear();
    });

    await page.goto(`http://127.0.0.1:${port}/frontend/focus-room.html#/focus-room`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    await page.waitForSelector("#focusRoomSurface", { timeout: 30000 });
    await page.waitForSelector("[data-focus-setup='true']", { timeout: 20000 });

    const setupState = await page.evaluate(() => ({
      view: document.getElementById("focusRoomSurface")?.getAttribute("data-focus-room-view"),
      setupVisible: Boolean(document.querySelector("[data-focus-setup='true']")),
      enterVisible: Boolean(document.querySelector("[data-focus-enter='true']")),
      sessionDock: Boolean(document.querySelector(".focus-session-dock, .bottom-control-dock, .focus-session-view .focus-session-dock")),
    }));
    assert.equal(setupState.view, "setup", "Focus Room should open on setup first");
    assert.equal(setupState.setupVisible, true);
    assert.equal(setupState.enterVisible, true);
    await page.screenshot({ path: path.join(artifactDir, "focus-room-setup-first.png"), fullPage: true });

    const sceneButtons = await page.$$(".scene-card");
    assert.ok(sceneButtons.length >= 2, "setup should show multiple scenes");
    await sceneButtons[1].click();
    await sleep(250);

    await page.click("[data-focus-topics-toggle='true']");
    await page.waitForSelector("[data-focus-topics-popover='true']", { timeout: 10000 });
    await page.click("[data-focus-topic-add='true']");
    await sleep(200);
    const titled = await page.evaluate(() => {
      const inputs = [...document.querySelectorAll("[data-focus-topic-title]")];
      if (inputs.length < 2) return { ok: false, count: inputs.length };
      const setValue = (el, value) => {
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        proto?.set?.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setValue(inputs[0], "Topic Alpha");
      setValue(inputs[1], "Topic Beta");
      return { ok: true, count: inputs.length, first: inputs[0].value, second: inputs[1].value };
    });
    assert.equal(titled.ok, true, "setup topics editor should support multiple topics");
    assert.equal(titled.first, "Topic Alpha");
    assert.equal(titled.second, "Topic Beta");
    await sleep(150);

    const durationButtons = await page.$$(".innook-duration");
    assert.ok(durationButtons.length >= 5, "setup should expose duration presets including infinity");
    await durationButtons[2].click(); // 50
    await sleep(150);

    const musicButtons = await page.$$(".innook-rail-group .innook-rail-icon");
    assert.ok(musicButtons.length >= 5, "setup should expose music atmosphere icons");
    await musicButtons[0].click();
    await sleep(150);

    await page.click("[data-focus-enter='true']");
    await page.waitForFunction(
      () => document.getElementById("focusRoomSurface")?.getAttribute("data-focus-room-view") === "session",
      { timeout: 15000 },
    );
    await page.waitForSelector(".focus-room-header", { timeout: 15000 });
    await sleep(300);

    const sessionState = await page.evaluate(() => ({
      view: document.getElementById("focusRoomSurface")?.getAttribute("data-focus-room-view"),
      setupGone: !document.querySelector("[data-focus-setup='true']"),
      hasTimer: Boolean(document.querySelector(".timer-editor, .focus-session-dock, .dock-timer-block")),
      hasHeader: Boolean(document.querySelector(".focus-room-header")),
      activeTopic: document.querySelector("[data-focus-active-topic='true'] strong")?.textContent || "",
    }));
    assert.equal(sessionState.view, "session");
    assert.equal(sessionState.setupGone, true);
    assert.equal(sessionState.hasHeader, true);
    assert.equal(sessionState.hasTimer, true);
    assert.match(sessionState.activeTopic, /Topic Alpha/);
    await page.screenshot({ path: path.join(artifactDir, "focus-room-session-after-setup.png"), fullPage: true });

    await page.click("[data-focus-topic-finish-dock='true']");
    await sleep(250);
    const afterFinish = await page.evaluate(() => document.querySelector("[data-focus-active-topic='true'] strong")?.textContent || "");
    assert.match(afterFinish, /Topic Beta/, "finishing active topic should switch to the next topic");

    // Open settings and return to setup
    await page.click('button[aria-label="Open room settings"]');
    await page.waitForSelector("[data-focus-topics='true']", { timeout: 10000 });
    await page.waitForSelector("[data-focus-return-setup='true']", { timeout: 10000 });
    await page.click("[data-focus-return-setup='true']");
    await page.waitForSelector("[data-focus-setup='true']", { timeout: 15000 });
    const backState = await page.evaluate(() => document.getElementById("focusRoomSurface")?.getAttribute("data-focus-room-view"));
    assert.equal(backState, "setup", "Change scene & setup should return to setup");

    // Infinity count-up path
    await page.click(".innook-duration-infinity");
    await sleep(150);
    await page.click("[data-focus-enter='true']");
    await page.waitForFunction(
      () => document.getElementById("focusRoomSurface")?.getAttribute("data-focus-room-view") === "session",
      { timeout: 15000 },
    );
    await page.screenshot({ path: path.join(artifactDir, "focus-room-return-setup.png"), fullPage: true });

    console.log("focus-room-setup-first-chrome: passed");
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
