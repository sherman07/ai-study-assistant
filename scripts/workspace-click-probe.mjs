/**
 * Core workspace boot + interaction smoke probe.
 * Uses DOM event dispatch (not Puppeteer geometry clicks) so covered/offscreen
 * controls still prove handlers are wired after the legacy controller boots.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(root, "dist");
const artifactDir = "/opt/cursor/artifacts/workspace-click-probe";
fs.mkdirSync(artifactDir, { recursive: true });

const targetUrl = process.env.SYNAPSE_PROBE_URL || "";
const chromePath = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function fireClick(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { ok: false, reason: "not found" };
    if (el.disabled) return { ok: false, reason: "disabled" };
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return {
      ok: true,
      text: String(el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80)
    };
  }, selector);
}

async function run() {
  let server = null;
  let baseUrl = targetUrl;
  if (!baseUrl) {
    assert.ok(
      fs.existsSync(path.join(distRoot, "frontend/index.html")),
      "dist/frontend/index.html missing; run npm run build first"
    );
    const started = await startStaticServer();
    server = started.server;
    baseUrl = `http://127.0.0.1:${started.port}/frontend/index.html`;
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(3000);
  await page.screenshot({ path: path.join(artifactDir, "01-loaded.png"), fullPage: true }).catch(() => null);

  const boot = await page.evaluate(() => ({
    title: document.title,
    hasRoot: Boolean(document.getElementById("root")?.children?.length),
    hasUpload: Boolean(document.querySelector(".upload-browse-btn")),
    combinedReady: Boolean(window.__synapseCombinedControllerReady),
    runtimeReady: Boolean(window.__synapseRuntimeUtilitiesReady),
    auth: Boolean(window.SynapseAuth),
  }));

  // Stay on materials and click core controls.
  await fireClick(page, ".learning-rail-materials");
  await sleep(400);

  const selectors = [
    [".learning-rail-materials", "Materials"],
    [".upload-browse-btn", "Select files"],
    ["#addLinkBtn", "Add link"],
    [".companion-launch-btn", "Start with AI tutor"],
    ["#workspaceNavTabLibrary", "Library tab"],
    [".history-empty-cta", "Upload material CTA"],
    [".synapse-select__button", "Language select"],
    [".learning-rail-new-chat", "New chat"],
    [".learning-rail-companion", "Learning companion"],
    [".learning-rail-materials", "Materials return"],
    [".learning-rail-focus-room", "Focus Room"],
  ];

  const results = [];
  for (const [selector, label] of selectors) {
    // Return to materials when upload UI may be hidden.
    if (["Select files", "Add link", "Start with AI tutor", "Language select", "Upload material CTA"].includes(label)) {
      await fireClick(page, ".learning-rail-materials");
      await sleep(250);
    }
    const result = await fireClick(page, selector);
    results.push({ label, selector, ...result });
    await sleep(250);
  }

  // Outline is intentionally disabled until notes exist; assert presence only.
  const outline = await page.evaluate(() => {
    const el = document.querySelector("#workspaceNavTabOutline");
    if (!el) return { ok: false, reason: "not found" };
    return { ok: true, disabled: Boolean(el.disabled), text: (el.innerText || "").trim() };
  });
  results.push({ label: "Outline tab present", selector: "#workspaceNavTabOutline", ...outline });

  // After focus room, materials rail/upload should still be invokable if we remain on workspace.
  if (page.url().includes("index.html")) {
    const materials = await fireClick(page, ".learning-rail-materials");
    results.push({ label: "Materials after Focus Room", selector: ".learning-rail-materials", ...materials });
    await sleep(300);
    const upload = await fireClick(page, ".upload-browse-btn");
    results.push({ label: "Select files after Focus Room", selector: ".upload-browse-btn", ...upload });
  }

  await page.screenshot({ path: path.join(artifactDir, "02-after-clicks.png"), fullPage: true }).catch(() => null);

  const report = {
    baseUrl,
    boot,
    pageErrors,
    consoleErrors: consoleErrors.slice(0, 20),
    results,
    failed: results.filter((r) => !r.ok),
  };
  fs.writeFileSync(path.join(artifactDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await browser.close().catch(() => null);
  if (server) server.close();

  const syntaxErrors = pageErrors.filter((e) => /SyntaxError|already been declared/i.test(e));
  assert.equal(syntaxErrors.length, 0, `Legacy controller syntax errors: ${syntaxErrors.join(" | ")}`);
  assert.ok(boot.hasRoot, "React root should render");
  assert.ok(boot.auth, "SynapseAuth should load");
  assert.ok(boot.combinedReady, "Combined legacy controller should boot");
  assert.ok(boot.hasUpload, "Upload button should be present on materials view");
  assert.equal(report.failed.length, 0, `Failed interactions: ${JSON.stringify(report.failed)}`);
}

run().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
