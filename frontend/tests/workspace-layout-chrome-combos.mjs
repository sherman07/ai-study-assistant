/**
 * Chrome layout combo probe for Generated Study Notes.
 * Exercises history hide/show, Sources, Open Tutor, and combinations.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { prepareChromeProbe } from "./chrome-probe-guard.mjs";

const probe = prepareChromeProbe("workspace-layout-chrome-combos");
if (!probe.ok) {
  console.log(probe.reason);
  process.exit(0);
}
const { puppeteer, executablePath, distRoot } = probe;
const artifactDir = "/opt/cursor/artifacts";
fs.mkdirSync(artifactDir, { recursive: true });

const MIN_NOTES_WIDTH = {
  default: 520,
  sources: 320,
  tutor: 360,
  sourcesTutor: 320,
  historyCollapsed: 640,
};

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
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
    server.on("error", reject);
  });
}

async function prepareGeneratedNotes(page) {
  await page.evaluate(() => {
    localStorage.setItem("synapse.history.nav.collapsed.v1", "false");
    localStorage.setItem("synapse.summary.nav.collapsed.v1", "false");
  });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#appLayout", { timeout: 20000 });
  await page.waitForSelector("#historyNav", { timeout: 20000 });

  await page.evaluate(() => {
    const appLayout = document.getElementById("appLayout");
    const analysisStage = document.getElementById("analysisStage");
    const resultGrid = document.getElementById("resultGrid");
    const summaryContent = document.getElementById("summaryContent");
    const summaryNav = document.getElementById("summaryNav");
    const sectionList = document.getElementById("sectionList");
    const learningShell = document.querySelector(".learning-experience-shell");
    const openAssistantBtn = document.getElementById("openAssistantFab");
    const sourcePanel = document.getElementById("sourceViewerPanel");

    appLayout.className =
      "app-layout analysis-ready generated-notes-state assistant-closed has-learning-rail";
    if (learningShell) learningShell.style.display = "none";
    if (analysisStage) analysisStage.classList.remove("d-none");
    if (resultGrid) {
      resultGrid.classList.remove("d-none");
      resultGrid.classList.remove("source-open");
    }
    if (summaryNav) summaryNav.classList.remove("collapsed");
    if (openAssistantBtn) openAssistantBtn.style.display = "block";

    if (sectionList) {
      sectionList.innerHTML = `
        <button class="section-nav-main active" type="button">Nature of the material</button>
        <button class="section-nav-main" type="button">Money and interest</button>
        <button class="section-nav-main" type="button">Financial markets</button>
      `;
    }

    if (summaryContent) {
      summaryContent.innerHTML = `
        <h2>Professional Study Guide: Money, Interest, and Financial Markets</h2>
        <h3>Nature: What This Material Is Really About</h3>
        <p>${"Macroeconomics links money, interest rates, and asset markets into one coherent system. ".repeat(18)}</p>
        <h3>Core Mechanisms</h3>
        <p>${"Liquidity preference, loanable funds, and expectations jointly shape short-run rates. ".repeat(16)}</p>
        <h3>Study Checkpoint</h3>
        <p>${"Explain how an open-market purchase affects reserves, deposits, and short-term rates. ".repeat(14)}</p>
      `;
    }

    if (sourcePanel) {
      sourcePanel.classList.remove("d-none");
      const body = sourcePanel.querySelector("#sourceViewerBody") || sourcePanel;
      body.innerHTML = `
        <div class="source-viewer-empty" style="padding:24px">
          <h4>Source excerpt</h4>
          <p>${"Original lecture notes describing money demand and bond markets. ".repeat(20)}</p>
        </div>
      `;
    }

    if (typeof window.setWorkspaceNavTab === "function") {
      window.setWorkspaceNavTab("outline", { persist: false, expandRail: true });
    } else if (typeof window.applyHistoryNavCollapsed === "function") {
      window.applyHistoryNavCollapsed();
    } else if (typeof window.toggleHistoryNav === "function") {
      window.toggleHistoryNav(false);
    }
  });

  await page.waitForSelector(".notes-card", { timeout: 10000 });
}

async function measure(page, label) {
  return page.evaluate((combo) => {
    const notes = document.querySelector(".notes-card");
    const notesArea = document.querySelector(".notes-area");
    const summary = document.querySelector(".summary-content");
    const history = document.getElementById("historyNav");
    const expand = document.getElementById("historyNavExpand");
    const sources = document.getElementById("sourceViewerPanel");
    const assistant = document.getElementById("assistant");
    const appLayout = document.getElementById("appLayout");
    const resultGrid = document.getElementById("resultGrid");

    const notesRect = notes?.getBoundingClientRect();
    const areaRect = notesArea?.getBoundingClientRect();
    const summaryRect = summary?.getBoundingClientRect();
    const historyRect = history?.getBoundingClientRect();
    const sourcesRect = sources?.getBoundingClientRect();
    const assistantRect = assistant?.getBoundingClientRect();

    const overflowX = Math.max(
      0,
      (document.documentElement.scrollWidth || 0) - (window.innerWidth || 0)
    );

    return {
      combo,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      classes: appLayout?.className || "",
      sourceOpen: Boolean(resultGrid?.classList.contains("source-open")),
      historyHidden: Boolean(expand && !expand.hidden),
      historyWidth: Math.round(historyRect?.width || 0),
      historyLeft: Math.round(historyRect?.left || 0),
      notesWidth: Math.round(notesRect?.width || 0),
      notesLeft: Math.round(notesRect?.left || 0),
      areaWidth: Math.round(areaRect?.width || 0),
      summaryWidth: Math.round(summaryRect?.width || 0),
      sourcesWidth: Math.round(sourcesRect?.width || 0),
      sourcesVisible: Boolean(sources && getComputedStyle(sources).display !== "none" && (sourcesRect?.width || 0) > 40),
      assistantWidth: Math.round(assistantRect?.width || 0),
      assistantVisible: Boolean(
        assistant && !assistant.classList.contains("hidden") && getComputedStyle(assistant).display !== "none"
      ),
      overflowX,
      notesOverlapsHistory:
        Boolean(notesRect && historyRect) &&
        historyRect.width > 40 &&
        historyRect.right > notesRect.left + 8 &&
        historyRect.left < notesRect.right,
    };
  }, label);
}

async function screenshot(page, name) {
  const file = path.join(artifactDir, `workspace-layout-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function setSources(page, open) {
  await page.evaluate((desired) => {
    const resultGrid = document.getElementById("resultGrid");
    const btn = document.getElementById("sourceViewerBtn");
    if (typeof window.toggleSourceViewer === "function") {
      window.toggleSourceViewer(desired);
    }
    if (resultGrid) resultGrid.classList.toggle("source-open", desired);
    if (btn) btn.classList.toggle("active", desired);
  }, open);
}

async function setTutor(page, open) {
  await page.evaluate((desired) => {
    if (desired) {
      if (typeof window.openAssistant === "function") window.openAssistant();
      else {
        document.getElementById("appLayout")?.classList.remove("assistant-closed");
        document.getElementById("assistant")?.classList.remove("hidden");
        const fab = document.getElementById("openAssistantFab");
        if (fab) fab.style.display = "none";
      }
    } else if (typeof window.closeAssistant === "function") {
      window.closeAssistant();
    } else {
      document.getElementById("appLayout")?.classList.add("assistant-closed");
      document.getElementById("assistant")?.classList.add("hidden");
      const fab = document.getElementById("openAssistantFab");
      if (fab) fab.style.display = "block";
    }
  }, open);
}

async function setHistoryCollapsed(page, collapsed) {
  await page.evaluate((desired) => {
    if (typeof window.toggleHistoryNav === "function") {
      window.toggleHistoryNav(desired);
      return;
    }
    document.getElementById("appLayout")?.classList.toggle("history-collapsed", desired);
    document.getElementById("historyNav")?.classList.toggle("collapsed", desired);
    const expand = document.getElementById("historyNavExpand");
    if (expand) expand.hidden = !desired;
  }, collapsed);
}

function assertReadable(m, minWidth) {
  assert.ok(m.notesWidth >= minWidth, `${m.combo}: notes width ${m.notesWidth} < ${minWidth}`);
  assert.ok(m.summaryWidth >= Math.min(240, minWidth - 40), `${m.combo}: summary too narrow (${m.summaryWidth})`);
  assert.ok(m.overflowX <= 24, `${m.combo}: horizontal overflow ${m.overflowX}px`);
  assert.equal(m.notesOverlapsHistory, false, `${m.combo}: notes overlap history rail`);
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
  const results = [];

  try {
    await page.goto(`http://127.0.0.1:${port}/frontend/index.html`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await prepareGeneratedNotes(page);

    const combos = [
      {
        name: "baseline",
        historyCollapsed: false,
        sources: false,
        tutor: false,
        min: MIN_NOTES_WIDTH.default,
      },
      {
        name: "history-hidden",
        historyCollapsed: true,
        sources: false,
        tutor: false,
        min: MIN_NOTES_WIDTH.historyCollapsed,
      },
      {
        name: "sources",
        historyCollapsed: false,
        sources: true,
        tutor: false,
        min: MIN_NOTES_WIDTH.sources,
      },
      {
        name: "tutor",
        historyCollapsed: false,
        sources: false,
        tutor: true,
        min: MIN_NOTES_WIDTH.tutor,
      },
      {
        name: "sources-tutor",
        historyCollapsed: false,
        sources: true,
        tutor: true,
        min: MIN_NOTES_WIDTH.sourcesTutor,
      },
      {
        name: "history-hidden-sources-tutor",
        historyCollapsed: true,
        sources: true,
        tutor: true,
        min: MIN_NOTES_WIDTH.sourcesTutor,
      },
      {
        name: "history-hidden-sources",
        historyCollapsed: true,
        sources: true,
        tutor: false,
        min: MIN_NOTES_WIDTH.sources,
      },
    ];

    for (const combo of combos) {
      await setHistoryCollapsed(page, combo.historyCollapsed);
      await setTutor(page, combo.tutor);
      await setSources(page, combo.sources);
      await sleep(220);
      const m = await measure(page, combo.name);
      results.push(m);
      await screenshot(page, combo.name);
      assertReadable(m, combo.min);
      if (combo.sources) {
        assert.equal(m.sourceOpen, true, `${combo.name}: sources should be open`);
      }
      if (combo.tutor) {
        assert.equal(m.assistantVisible, true, `${combo.name}: tutor should be visible`);
      }
      if (combo.historyCollapsed) {
        assert.equal(m.historyHidden, true, `${combo.name}: expand control should show`);
        assert.ok(m.historyLeft < 8, `${combo.name}: history should be off-canvas (left=${m.historyLeft})`);
      } else {
        assert.equal(m.historyHidden, false, `${combo.name}: expand control should hide`);
        assert.ok(m.notesLeft >= 250, `${combo.name}: notes should clear open history (left=${m.notesLeft})`);
      }
    }

    // Unified rail: Library ↔ Outline should not change notes width.
    await setHistoryCollapsed(page, false);
    await setTutor(page, false);
    await setSources(page, false);
    await page.evaluate(() => window.setWorkspaceNavTab?.("outline", { persist: false, expandRail: true }));
    await sleep(180);
    const outlineMeasure = await measure(page, "tab-outline");
    await page.click("#workspaceNavTabLibrary");
    await sleep(180);
    const libraryMeasure = await measure(page, "tab-library");
    await screenshot(page, "tab-library");
    assert.equal(outlineMeasure.notesWidth, libraryMeasure.notesWidth, "Library/Outline tabs must share one rail width");
    assert.ok(libraryMeasure.notesWidth >= MIN_NOTES_WIDTH.default, "unified rail should keep notes wide");

    // Click-path smoke: hide via left chevron, show via right chevron.
    await setHistoryCollapsed(page, false);
    await setTutor(page, false);
    await setSources(page, false);
    await page.click("#historyNavToggle");
    await sleep(200);
    let m = await measure(page, "click-hide-history");
    assert.equal(m.historyHidden, true, "click hide should reveal expand button");
    await page.click("#historyNavExpand");
    await sleep(200);
    m = await measure(page, "click-show-history");
    assert.equal(m.historyHidden, false, "click show should restore history");
    assert.ok(m.notesLeft >= 250, "restored history should reserve space");

    // Narrow laptop viewport with sources + tutor.
    await page.setViewport({ width: 1280, height: 900 });
    await setHistoryCollapsed(page, false);
    await setTutor(page, true);
    await setSources(page, true);
    await sleep(250);
    m = await measure(page, "laptop-sources-tutor");
    results.push(m);
    await screenshot(page, "laptop-sources-tutor");
    assertReadable(m, 260);

    console.log(
      "workspace-layout-chrome-combos: passed\n" +
        results.map((r) => `${r.combo}: notes=${r.notesWidth}px area=${r.areaWidth}px overflow=${r.overflowX}`).join("\n")
    );
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
