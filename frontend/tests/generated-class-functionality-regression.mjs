/**
 * Generated-class surface functionality probe.
 * Covers notes/source leveling, notes priority width, study-tool switching,
 * and Mind Map palette alignment against the site button gradient.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const distRoot = path.join(root, "dist");
const artifactDir = "/opt/cursor/artifacts";
fs.mkdirSync(artifactDir, { recursive: true });

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

async function prepareGeneratedClass(page) {
  await page.evaluate(() => {
    localStorage.setItem("synapse.history.nav.collapsed.v1", "true");
    localStorage.setItem("synapse.summary.nav.collapsed.v1", "true");
  });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#appLayout", { timeout: 20000 });

  await page.evaluate(() => {
    const appLayout = document.getElementById("appLayout");
    const analysisStage = document.getElementById("analysisStage");
    const uploadStage = document.getElementById("uploadStage");
    const resultGrid = document.getElementById("resultGrid");
    const summaryContent = document.getElementById("summaryContent");
    const learningShell = document.querySelector(".learning-experience-shell");
    const openAssistantBtn = document.getElementById("openAssistantFab");
    const sourcePanel = document.getElementById("sourceViewerPanel");
    const sourceTabs = document.getElementById("sourceViewerTabs");
    const sourceBody = document.getElementById("sourceViewerBody");

    appLayout.className =
      "app-layout analysis-ready generated-notes-state assistant-closed history-collapsed";
    if (learningShell) learningShell.style.display = "none";
    if (uploadStage) uploadStage.classList.add("d-none");
    if (analysisStage) analysisStage.classList.remove("d-none");
    if (resultGrid) {
      resultGrid.classList.remove("d-none");
      resultGrid.classList.remove("source-open");
    }
    if (openAssistantBtn) openAssistantBtn.style.display = "block";

    if (summaryContent) {
      summaryContent.innerHTML = `
        <h2>Professional Study Guide: Uploaded Material</h2>
        <h3>1. Big Picture: What This Material Is Really About</h3>
        <p>${"Evolutionary psychology frames behaviour as adaptive strategies shaped by ancestral environments. ".repeat(12)}</p>
        <h3>2. The Exam Will Probably Test These Ideas</h3>
        <p>${"Expect short-answer prompts that ask you to connect Lorenz, ethology, and exam-facing mechanisms. ".repeat(10)}</p>
      `;
    }

    if (sourceTabs) {
      sourceTabs.innerHTML = `
        <button type="button" class="source-tab active"><span>Russell Lecture 10 2026.pdf</span></button>
        <button type="button" class="source-tab"><span>Russell Lecture 12.pdf</span></button>
      `;
    }
    if (sourceBody) {
      sourceBody.innerHTML = `
        <div class="source-viewer-empty" style="padding:24px">
          <h4>Source excerpt</h4>
          <p>${"Prepared lecture PDF preview content for alignment checks. ".repeat(18)}</p>
        </div>
      `;
    }
    if (sourcePanel) sourcePanel.classList.add("d-none");

    if (typeof window.switchTool === "function") {
      window.switchTool("mindmap");
    }
    if (typeof window.renderMindMap === "function") {
      window.renderMindMap({
        title: "Psych109L",
        branches: [
          {
            title: "1. Big Picture",
            points: [{ title: "Core claim", children: [{ title: "Evidence" }] }]
          },
          {
            title: "2. Exam ideas",
            points: [{ title: "Likely question", children: [] }]
          }
        ]
      });
    }
  });

  await page.waitForSelector(".notes-card", { timeout: 10000 });
}

async function openSources(page) {
  await page.evaluate(() => {
    const resultGrid = document.getElementById("resultGrid");
    const sourcePanel = document.getElementById("sourceViewerPanel");
    const appLayout = document.getElementById("appLayout");
    if (resultGrid) resultGrid.classList.add("source-open");
    if (sourcePanel) sourcePanel.classList.remove("d-none");
    if (appLayout) appLayout.classList.add("source-viewer-open");
    if (typeof window.toggleSourceViewer === "function") {
      window.sourceViewerOpen = true;
    }
  });
}

function parseRgb(color) {
  const match = String(color || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3])
  };
}

function isSiteBlue(rgb) {
  if (!rgb) return false;
  // Site primary around #4a7cff — blue channel dominant, not purple-heavy.
  return rgb.b > rgb.r + 20 && rgb.b >= rgb.g && rgb.r < 140;
}

async function main() {
  const chromeCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);

  let executablePath = chromeCandidates.find(candidate => fs.existsSync(candidate));
  if (!executablePath) {
    console.log("generated-class-functionality-regression: skipped (no Chrome binary)");
    return;
  }

  if (!fs.existsSync(path.join(distRoot, "frontend/index.html"))) {
    console.log("generated-class-functionality-regression: building frontend dist first");
    const { spawnSync } = await import("node:child_process");
    const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8", timeout: 180000 });
    if (build.status !== 0) {
      throw new Error(`build failed: ${build.stderr || build.stdout}`);
    }
  }

  const { server, port } = await startStaticServer();
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,960"]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(`http://127.0.0.1:${port}/frontend/index.html`, { waitUntil: "networkidle0", timeout: 60000 });
    await prepareGeneratedClass(page);

    const toolResults = await page.evaluate(() => {
      const tools = ["mindmap", "visualguide", "timeline", "masterygraph", "quiz", "flashcards", "broadcast"];
      const outcomes = [];
      for (const tool of tools) {
        if (typeof window.switchTool === "function") window.switchTool(tool);
        const activeButtons = Array.from(document.querySelectorAll(".tool-switch-btn.active")).map(btn => btn.id);
        const activePanels = Array.from(document.querySelectorAll(".tool-panel.active")).map(panel => panel.id);
        outcomes.push({ tool, activeButtons, activePanels });
      }
      if (typeof window.switchTool === "function") window.switchTool("mindmap");
      return outcomes;
    });

    for (const outcome of toolResults) {
      assert.equal(outcome.activeButtons.length, 1, `${outcome.tool} should activate exactly one tool button`);
      assert.equal(outcome.activePanels.length, 1, `${outcome.tool} should activate exactly one tool panel`);
    }

    const mindMapBtn = await page.$("#toolBtnMindMap");
    assert.ok(mindMapBtn, "Mind Map button should exist");
    await page.evaluate(() => {
      if (typeof window.switchTool === "function") window.switchTool("mindmap");
    });
    const mindMapColor = await page.evaluate(() => {
      const btn = document.getElementById("toolBtnMindMap");
      const styles = getComputedStyle(btn);
      return {
        backgroundImage: styles.backgroundImage,
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });
    const gradientMatch = String(mindMapColor.backgroundImage || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const sample = gradientMatch
      ? { r: Number(gradientMatch[1]), g: Number(gradientMatch[2]), b: Number(gradientMatch[3]) }
      : parseRgb(mindMapColor.backgroundColor);
    assert.ok(isSiteBlue(sample), `Mind Map active color should match site blue palette, got ${JSON.stringify(mindMapColor)}`);
    assert.doesNotMatch(
      String(mindMapColor.backgroundImage || ""),
      /143,\s*99,\s*255|8f63ff/i,
      "Mind Map tab should not use the old purple accent"
    );

    await openSources(page);
    const layout = await page.evaluate(() => {
      const notes = document.querySelector(".notes-card");
      const sources = document.getElementById("sourceViewerPanel");
      const notesRect = notes.getBoundingClientRect();
      const sourcesRect = sources.getBoundingClientRect();
      const notesToolbar = document.querySelector(".notes-toolbar");
      const sourceTabs = document.querySelector(".source-viewer-tabs");
      const toolbarTop = notesToolbar?.getBoundingClientRect().top ?? notesRect.top;
      const tabsTop = sourceTabs?.getBoundingClientRect().top ?? sourcesRect.top;
      return {
        notesWidth: notesRect.width,
        sourcesWidth: sourcesRect.width,
        notesTop: notesRect.top,
        sourcesTop: sourcesRect.top,
        toolbarTop,
        tabsTop,
        topDelta: Math.abs(notesRect.top - sourcesRect.top),
        headerDelta: Math.abs(toolbarTop - tabsTop),
        ratio: notesRect.width / Math.max(1, sourcesRect.width),
        sourceViewerOpen: document.getElementById("appLayout")?.classList.contains("source-viewer-open")
      };
    });

    assert.ok(layout.notesWidth > layout.sourcesWidth, "generated notes should be wider than the source preview");
    assert.ok(layout.ratio >= 1.35, `notes should own priority space (ratio=${layout.ratio.toFixed(2)})`);
    assert.ok(layout.topDelta <= 8, `notes and source panes should share one top level (delta=${layout.topDelta})`);
    assert.ok(layout.headerDelta <= 24, `Study Notes header and source tabs should sit near the same level (delta=${layout.headerDelta})`);
    assert.equal(layout.sourceViewerOpen, true, "layout should mark source-viewer-open");

    await page.screenshot({
      path: path.join(artifactDir, "generated-class-notes-source-priority.png"),
      fullPage: false
    });

    const featureChecks = await page.evaluate(() => {
      const checks = {};
      checks.hasFullNotes = Boolean(document.getElementById("fullNotesBtn"));
      checks.hasSourcesBtn = Boolean(document.getElementById("sourceViewerBtn"));
      checks.hasPdfBtn = Boolean(document.getElementById("downloadNotesBtn"));
      checks.hasTranslate = Boolean(document.getElementById("notesTranslateLanguage"));
      checks.hasOpenTutor = Boolean(document.getElementById("openAssistantFab"));
      checks.hasMindMapPanel = Boolean(document.getElementById("toolPanelMindMap"));
      checks.hasQuizPanel = Boolean(document.getElementById("toolPanelQuiz"));
      checks.hasFlashcardsPanel = Boolean(document.getElementById("toolPanelFlashcards"));
      checks.hasBroadcastPanel = Boolean(document.getElementById("toolPanelBroadcast"));
      checks.hasTimelinePanel = Boolean(document.getElementById("toolPanelTimeline"));
      checks.hasMasteryPanel = Boolean(document.getElementById("toolPanelMasteryGraph"));
      checks.hasVisualGuidePanel = Boolean(document.getElementById("toolPanelVisualGuide"));
      return checks;
    });

    for (const [key, value] of Object.entries(featureChecks)) {
      assert.ok(value, `generated class should expose ${key}`);
    }

    console.log("generated-class-functionality-regression: passed");
    console.log(JSON.stringify({ layout, mindMapColor, toolCount: toolResults.length }, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
