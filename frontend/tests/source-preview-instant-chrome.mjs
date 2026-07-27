/**
 * Chrome probe: PDF source opens as exact local pages (no browser PDF chrome).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const distRoot = path.join(root, "dist");
const artifactDir = "/opt/cursor/artifacts";
fs.mkdirSync(artifactDir, { recursive: true });

// Minimal valid PDF bytes.
const MINI_PDF = Buffer.from(
  "%PDF-1.1\n1 0 obj<<>>endobj\n2 0 obj<< /Length 44 >>stream\nBT /F1 24 Tf 100 700 Td (Synapse) Tj ET\nendstream\nendobj\n3 0 obj<< /Type /Page /Parent 4 0 R /Contents 2 0 R >>endobj\n4 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 612 792] >>endobj\n5 0 obj<< /Type /Catalog /Pages 4 0 R >>endobj\nxref\n0 6\ntrailer<< /Root 5 0 R /Size 6 >>\nstartxref\n0\n%%EOF\n"
);

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

async function main() {
  const chrome = ["/usr/bin/google-chrome", "/usr/local/bin/google-chrome", "/usr/bin/chromium"].find(p => fs.existsSync(p));
  if (!chrome) {
    console.log("source-preview-instant-chrome: skipped (no Chrome)");
    return;
  }

  const build = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8", timeout: 180000 });
  if (build.status !== 0) throw new Error(build.stderr || build.stdout);

  assert.ok(fs.existsSync(path.join(distRoot, "frontend/vendor/pdfjs/pdf.min.js")), "build should ship PDF.js");

  const { server, port } = await startStaticServer();
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,960"]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto(`http://127.0.0.1:${port}/frontend/index.html`, { waitUntil: "networkidle0", timeout: 60000 });

    await page.evaluate(async (pdfBase64) => {
      const binary = atob(pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });

      window.sourceViewerItems = [{
        id: "pdf:test",
        name: "Russell Lecture10 2026.pdf",
        title: "Russell Lecture10 2026.pdf",
        kind: "pdf",
        size: blob.size,
        blob
      }];
      window.activeSourceItemId = "pdf:test";
      window.sourceViewerOpen = true;
      window.sourceViewerZoom = 100;

      const appLayout = document.getElementById("appLayout");
      const analysisStage = document.getElementById("analysisStage");
      const uploadStage = document.getElementById("uploadStage");
      const resultGrid = document.getElementById("resultGrid");
      const sourcePanel = document.getElementById("sourceViewerPanel");
      appLayout.className = "app-layout analysis-ready generated-notes-state assistant-closed history-collapsed source-viewer-open";
      uploadStage?.classList.add("d-none");
      analysisStage?.classList.remove("d-none");
      resultGrid?.classList.remove("d-none");
      resultGrid?.classList.add("source-open");
      sourcePanel?.classList.remove("d-none");

      if (typeof window.renderSourceViewer === "function") {
        window.renderSourceViewer();
      } else if (typeof window.renderNativePdfPreview === "function") {
        window.renderNativePdfPreview(window.sourceViewerItems[0]);
      } else if (typeof window.toggleSourceViewer === "function") {
        window.toggleSourceViewer(true);
      }
    }, MINI_PDF.toString("base64"));

    await page.waitForFunction(() => {
      const body = document.getElementById("sourceViewerBody");
      return Boolean(
        body?.querySelector(".source-pdf-page-canvas") ||
        body?.querySelector(".source-pdf-page-skeleton") ||
        /could not render this PDF/i.test(body?.textContent || "")
      );
    }, { timeout: 15000 });

    // Allow page render to finish when PDF.js is available.
    await page.waitForFunction(() => {
      const body = document.getElementById("sourceViewerBody");
      return Boolean(body?.querySelector(".source-pdf-page-canvas")) ||
        /could not render this PDF|Could not load the local PDF/i.test(body?.textContent || "");
    }, { timeout: 20000 }).catch(() => {});

    const result = await page.evaluate(() => {
      const chromeEl = document.querySelector(".source-viewer-chrome");
      const toolbar = document.querySelector(".source-viewer-toolbar");
      const body = document.getElementById("sourceViewerBody");
      const iframe = document.querySelector(".source-native-pdf-frame, iframe.source-frame");
      const canvas = body?.querySelector(".source-pdf-page-canvas");
      const openBtn = document.getElementById("sourceOpenExternalBtn");
      const fitBtn = document.getElementById("sourceFitWidthBtn");
      const zoomLabel = document.getElementById("sourceZoomLabel");
      const loading = /Preparing source preview/i.test(body?.textContent || "");
      const unreachable = /could not reach its hosted service/i.test(body?.textContent || "");
      return {
        hasChrome: Boolean(chromeEl),
        toolbarDisplay: toolbar ? getComputedStyle(toolbar).display : "missing",
        hasIframe: Boolean(iframe),
        hasCanvas: Boolean(canvas),
        openVisible: openBtn ? getComputedStyle(openBtn).display !== "none" : false,
        fitVisible: fitBtn ? getComputedStyle(fitBtn).display !== "none" : false,
        zoomVisible: zoomLabel ? getComputedStyle(zoomLabel).display !== "none" : false,
        loading,
        unreachable,
        bodyClass: body?.querySelector(".source-pdf-page-renderer") ? "pages" : "other",
        text: (body?.textContent || "").slice(0, 240)
      };
    });

    assert.equal(result.hasChrome, true, "compact source chrome should exist");
    assert.ok(result.toolbarDisplay === "none" || result.toolbarDisplay === "missing", "legacy toolbar should be hidden");
    assert.equal(result.loading, false, "PDF should not show preparing spinner");
    assert.equal(result.unreachable, false, "PDF should not depend on hosted service");
    assert.equal(result.hasIframe, false, "browser PDF iframe chrome should not be used");
    assert.equal(result.hasCanvas, true, "PDF should render exact pages to canvas");
    assert.equal(result.openVisible, true, "Synapse open control should stay visible");
    assert.equal(result.fitVisible, true, "Synapse fit-width control should stay visible");
    assert.equal(result.zoomVisible, true, "Synapse zoom label should stay visible");
    assert.equal(result.bodyClass, "pages", "PDF should use the page renderer stage");

    await page.screenshot({ path: path.join(artifactDir, "source-preview-page-renderer.png"), fullPage: false });
    console.log("source-preview-instant-chrome: passed");
    console.log(JSON.stringify({ result }, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
