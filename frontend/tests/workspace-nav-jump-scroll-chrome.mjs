/**
 * Chrome probe: left-rail outline scrolling + Materials/Companion jumps.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { prepareChromeProbe } from "./chrome-probe-guard.mjs";

const probe = prepareChromeProbe("workspace-nav-jump-scroll-chrome");
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
      const safePath = urlPath === "/" ? "/frontend/index.html" : urlPath;
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

async function enterGeneratedNotes(page) {
  await page.evaluate(() => {
    const appLayout = document.getElementById("appLayout");
    const analysisStage = document.getElementById("analysisStage");
    const resultGrid = document.getElementById("resultGrid");
    const sections = document.getElementById("sections");
    const summaryContent = document.getElementById("summaryContent");
    const learningShell = document.querySelector(".learning-experience-shell");

    appLayout.className =
      "app-layout analysis-ready generated-notes-state assistant-closed has-learning-rail";
    if (learningShell) learningShell.style.display = "";
    analysisStage?.classList.remove("d-none");
    resultGrid?.classList.remove("d-none");
    document.getElementById("uploadStage")?.classList.add("d-none");

    if (summaryContent) {
      summaryContent.innerHTML = `<h2>Generated notes fixture</h2><p>${"Body. ".repeat(40)}</p>`;
    }
    if (sections) {
      sections.innerHTML = Array.from({ length: 42 }, (_, index) => {
        const n = index + 1;
        return `<div class="section-nav-group"><div class="section-nav-row"><button class="section-btn section-nav-main is-leaf" type="button"><span class="section-nav-leaf"></span><span>${n}. Section title number ${n}</span></button></div></div>`;
      }).join("");
    }
    window.setWorkspaceNavTab?.("outline", { persist: false, expandRail: true });
  });
  await sleep(180);
}

async function run() {
  const { server, port } = await startStaticServer();
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,960"],
    defaultViewport: { width: 1440, height: 960 },
  });
  const page = await browser.newPage();

  try {
    await page.goto(`http://127.0.0.1:${port}/frontend/index.html`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await page.waitForSelector("#historyNav", { timeout: 20000 });
    await enterGeneratedNotes(page);

    const scroll = await page.evaluate(() => {
      const list = document.querySelector("#summaryNav .section-list");
      const panel = document.getElementById("summaryNav");
      if (!list || !panel) return null;
      const before = list.scrollTop;
      list.scrollTop = 240;
      return {
        overflowY: getComputedStyle(list).overflowY,
        listHeight: Math.round(list.getBoundingClientRect().height),
        scrollHeight: list.scrollHeight,
        clientHeight: list.clientHeight,
        canScroll: list.scrollHeight > list.clientHeight + 8,
        scrolled: list.scrollTop > before,
        panelFlex: getComputedStyle(panel).flexGrow,
      };
    });
    assert.ok(scroll, "outline list should exist");
    assert.match(scroll.overflowY, /auto|scroll/, `outline overflow-y should scroll (got ${scroll.overflowY})`);
    assert.equal(scroll.canScroll, true, "42 sections must overflow the visible rail");
    assert.equal(scroll.scrolled, true, "outline list should accept scrollTop changes");
    await page.screenshot({ path: path.join(artifactDir, "workspace-outline-scroll.png") });

    await page.click(".learning-rail-companion");
    await sleep(220);
    let state = await page.evaluate(() => ({
      classes: document.getElementById("appLayout")?.className || "",
      mode: document.getElementById("appLayout")?.dataset.learningExperienceMode || "",
      analysisHidden: document.getElementById("analysisStage")?.classList.contains("d-none"),
      companionDisplay: getComputedStyle(document.getElementById("companionWorkspace")).display,
      tablistHidden: Boolean(document.querySelector(".workspace-nav-tabs")?.hidden),
    }));
    assert.ok(!state.classes.includes("generated-notes-state"), "companion jump leaves generated notes");
    assert.ok(state.classes.includes("initial-state"), "companion jump returns to workspace home");
    assert.equal(state.mode, "companion", "companion mode should activate");
    assert.equal(state.analysisHidden, true, "analysis stage should hide");
    assert.notEqual(state.companionDisplay, "none", "companion workspace should show");
    assert.equal(state.tablistHidden, true, "outline tabs hide after leaving generated notes");
    await page.screenshot({ path: path.join(artifactDir, "workspace-jump-companion.png") });

    await enterGeneratedNotes(page);
    await page.click(".learning-rail-materials");
    await sleep(220);
    state = await page.evaluate(() => ({
      classes: document.getElementById("appLayout")?.className || "",
      mode: document.getElementById("appLayout")?.dataset.learningExperienceMode || "",
      uploadHidden: document.getElementById("uploadStage")?.classList.contains("d-none"),
      uploadDisplay: getComputedStyle(document.getElementById("uploadStage")).display,
    }));
    assert.ok(!state.classes.includes("generated-notes-state"), "materials jump leaves generated notes");
    assert.equal(state.mode, "materials", "materials mode should activate");
    assert.equal(state.uploadHidden, false, "upload stage should not stay d-none");
    assert.notEqual(state.uploadDisplay, "none", "materials upload should show");
    await page.screenshot({ path: path.join(artifactDir, "workspace-jump-materials.png") });

    console.log("workspace-nav-jump-scroll-chrome: passed");
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
