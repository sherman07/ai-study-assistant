/**
 * Chrome probe for the notes/source resizable split divider.
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

async function prepareSplit(page) {
  await page.evaluate(() => {
    localStorage.setItem("synapse.history.nav.collapsed.v1", "true");
    localStorage.removeItem("synapse.notes.source.split.ratio.v1");
  });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#appLayout", { timeout: 20000 });

  await page.evaluate(() => {
    const appLayout = document.getElementById("appLayout");
    const analysisStage = document.getElementById("analysisStage");
    const uploadStage = document.getElementById("uploadStage");
    const resultGrid = document.getElementById("resultGrid");
    const summaryContent = document.getElementById("summaryContent");
    const sourcePanel = document.getElementById("sourceViewerPanel");
    const sourceBody = document.getElementById("sourceViewerBody");
    const openAssistantBtn = document.getElementById("openAssistantFab");

    appLayout.className =
      "app-layout analysis-ready generated-notes-state assistant-closed history-collapsed source-viewer-open";
    if (uploadStage) uploadStage.classList.add("d-none");
    if (analysisStage) analysisStage.classList.remove("d-none");
    if (resultGrid) {
      resultGrid.classList.remove("d-none");
      resultGrid.classList.add("source-open");
    }
    if (openAssistantBtn) openAssistantBtn.style.display = "block";
    if (summaryContent) {
      summaryContent.innerHTML = `<h2>Study Notes</h2><p>${"Generated note content. ".repeat(40)}</p>`;
    }
    if (sourceBody) {
      sourceBody.innerHTML = `
        <iframe title="mock-source" srcdoc="<p>Mock PDF/iframe source</p>" style="width:100%;height:100%;border:0"></iframe>
      `;
    }
    if (sourcePanel) sourcePanel.classList.remove("d-none");
    if (typeof window.bindNotesSourceSplitter === "function") {
      window.bindNotesSourceSplitter();
    } else if (typeof window.applyNotesSourceSplitRatio === "function") {
      window.applyNotesSourceSplitRatio(0.7478);
    } else {
      // Fallback: trigger the same boot-bound helpers if already attached via listeners.
      document.getElementById("notesSourceSplitter")?.dispatchEvent(new Event("pointermove"));
    }
  });

  await page.waitForSelector("#notesSourceSplitter", { timeout: 10000 });
  await page.evaluate(() => {
    if (typeof window.applyNotesSourceSplitRatio === "function") {
      window.applyNotesSourceSplitRatio(0.7478);
    } else {
      const grid = document.getElementById("resultGrid");
      grid?.style.setProperty("--notes-split-notes", "74.78fr");
      grid?.style.setProperty("--notes-split-source", "25.22fr");
    }
    const splitter = document.getElementById("notesSourceSplitter");
    if (splitter) {
      splitter.hidden = false;
      splitter.style.display = "flex";
    }
  });
}

async function main() {
  const chromeCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/local/bin/google-chrome"
  ].filter(Boolean);
  const executablePath = chromeCandidates.find(candidate => fs.existsSync(candidate));
  if (!executablePath) {
    console.log("notes-source-split-chrome: skipped (no Chrome binary)");
    return;
  }

  if (!fs.existsSync(path.join(distRoot, "frontend/index.html"))) {
    const { spawnSync } = await import("node:child_process");
    const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8", timeout: 180000 });
    if (build.status !== 0) throw new Error(`build failed: ${build.stderr || build.stdout}`);
  } else {
    // Rebuild so the latest splitter markup/CSS/JS are in dist.
    const { spawnSync } = await import("node:child_process");
    const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8", timeout: 180000 });
    if (build.status !== 0) throw new Error(`build failed: ${build.stderr || build.stdout}`);
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
    await prepareSplit(page);

    // Expose helpers if the combined controller attached them on window via boot Object.assign.
    // bindNotesSourceSplitter may not be exported; drive via DOM events + CSS vars.
    const before = await page.evaluate(() => {
      const notes = document.querySelector(".notes-card").getBoundingClientRect();
      const sources = document.getElementById("sourceViewerPanel").getBoundingClientRect();
      const splitter = document.getElementById("notesSourceSplitter").getBoundingClientRect();
      return {
        notesWidth: notes.width,
        sourcesWidth: sources.width,
        splitterLeft: splitter.left,
        cursor: getComputedStyle(document.getElementById("notesSourceSplitter")).cursor
      };
    });

    assert.equal(before.cursor, "col-resize", "splitter cursor should be col-resize");
    assert.ok(before.notesWidth > before.sourcesWidth, "default split should favor notes");

    const splitterHandle = await page.$("#notesSourceSplitter");
    const box = await splitterHandle.boundingBox();
    assert.ok(box, "splitter should be visible");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 160, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();

    const afterLeft = await page.evaluate(() => {
      const notes = document.querySelector(".notes-card").getBoundingClientRect();
      const sources = document.getElementById("sourceViewerPanel").getBoundingClientRect();
      const resizing = document.body.classList.contains("notes-source-split-resizing");
      return {
        notesWidth: notes.width,
        sourcesWidth: sources.width,
        resizing,
        stored: localStorage.getItem("synapse.notes.source.split.ratio.v1")
      };
    });

    assert.equal(afterLeft.resizing, false, "drag end should clear resizing state");
    assert.ok(afterLeft.notesWidth < before.notesWidth - 40, "dragging left should shrink notes");
    assert.ok(afterLeft.sourcesWidth > before.sourcesWidth + 40, "dragging left should enlarge source preview");
    assert.ok(afterLeft.stored, "ratio should persist to localStorage");

    // Double-click reset
    await splitterHandle.click({ clickCount: 2 });
    const reset = await page.evaluate(() => {
      const notes = document.querySelector(".notes-card").getBoundingClientRect();
      const sources = document.getElementById("sourceViewerPanel").getBoundingClientRect();
      return {
        notesWidth: notes.width,
        sourcesWidth: sources.width,
        stored: localStorage.getItem("synapse.notes.source.split.ratio.v1")
      };
    });
    assert.ok(Math.abs(reset.notesWidth - before.notesWidth) < 30, "double-click should restore default notes width");
    assert.ok(!reset.stored || Number(reset.stored) > 0.7, "reset should clear or restore the default ratio");

    // Mobile: splitter hidden / stacked
    await page.setViewport({ width: 900, height: 1200 });
    await page.waitForTimeout?.(200).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 250));
    const mobile = await page.evaluate(() => {
      const splitter = document.getElementById("notesSourceSplitter");
      const notes = document.querySelector(".notes-card").getBoundingClientRect();
      const sources = document.getElementById("sourceViewerPanel").getBoundingClientRect();
      const style = getComputedStyle(splitter);
      return {
        display: style.display,
        stacked: sources.top >= notes.bottom - 2
      };
    });
    assert.equal(mobile.display, "none", "mobile should hide the horizontal splitter");
    assert.equal(mobile.stacked, true, "mobile should stack notes above sources");

    await page.screenshot({
      path: path.join(artifactDir, "notes-source-resizable-split.png"),
      fullPage: false
    });

    console.log("notes-source-split-chrome: passed");
    console.log(JSON.stringify({ before, afterLeft, reset, mobile }, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
