/**
 * Chrome probe: companion AI-gated dock + in-chat quiz/flashcards/broadcast.
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

async function openCompanion(page) {
  await page.waitForSelector("#appLayout", { timeout: 20000 });
  await page.waitForFunction(() => typeof window.setLearningExperienceMode === "function", { timeout: 20000 });
  await page.evaluate(() => {
    const appLayout = document.getElementById("appLayout");
    if (appLayout) {
      appLayout.classList.add("initial-state", "has-learning-rail", "assistant-closed");
      appLayout.classList.remove("generated-notes-state", "analysis-ready");
    }
    window.setLearningExperienceMode("companion");
  });
  await page.waitForFunction(() => {
    const layout = document.getElementById("appLayout");
    const companion = document.getElementById("companionWorkspace");
    if (!layout || !companion) return false;
    return layout.dataset.learningExperienceMode === "companion"
      && getComputedStyle(companion).display !== "none";
  }, { timeout: 20000 });
  await page.waitForSelector("[data-learning-companion-starter='stuck']", { timeout: 20000 });
}

async function main() {
  assert.ok(fs.existsSync(path.join(distRoot, "frontend/index.html")), "dist build required");
  const { server, port } = await startStaticServer();
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,1100"],
    defaultViewport: { width: 1440, height: 1100 },
  });

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      window.__companionTestCalls = [];
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init = {}) => {
        const url = String(input || "");
        let body = null;
        try {
          body = init.body ? JSON.parse(init.body) : null;
        } catch {
          body = null;
        }
        window.__companionTestCalls.push({ url, body });
        if (url.includes("/learning-companion/respond")) {
          return new Response(JSON.stringify({
            reply: "I can quiz you and make flashcards from what we just covered.",
            state: "practice",
            mastery: 30,
            suggested_actions: ["Give me a hint"],
            suggested_tools: [
              { id: "quiz", label: "Quiz me", reason: "Ready to practice" },
              { id: "flashcards", label: "Flashcards", reason: "Ready for recall cards" },
              { id: "broadcast", label: "AI Broadcast", reason: "Good for audio review" },
            ],
            requires_research: false,
            research_sources: [],
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (url.includes("/quiz/generate")) {
          return new Response(JSON.stringify({
            title: "Companion Quiz",
            questions: [
              {
                type: "single_choice",
                question: "Which organelle makes ATP?",
                options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi"],
                correct_option_indexes: [1],
                explanation: "Mitochondria produce ATP.",
              },
            ],
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (url.includes("/flashcards/generate")) {
          return new Response(JSON.stringify({
            title: "Companion Cards",
            cards: [
              { front: "What makes ATP?", back: "Mitochondria", hint: "Powerhouse" },
              { front: "Where does glycolysis happen?", back: "Cytoplasm" },
            ],
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (url.includes("/broadcast/generate")) {
          return new Response(JSON.stringify({
            title: "Companion Broadcast",
            summary: "A short audio outline of cellular energy.",
            sections: [{ title: "Opening", script: "Today we review ATP production." }],
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return originalFetch(input, init);
      };
    });

    await page.goto(`http://127.0.0.1:${port}/frontend/index.html`, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForSelector("#appLayout", { timeout: 20000 });
    await openCompanion(page);

    const beforeDock = await page.$eval(
      "[data-learning-companion-dock-state]",
      node => node.getAttribute("data-learning-companion-dock-state"),
    );
    assert.equal(beforeDock, "hidden", "practice dock stays hidden until AI suggests tools");

    await page.click('[data-learning-companion-starter="stuck"]');
    await page.waitForFunction(
      () => document.querySelector('[data-learning-companion-dock-state="suggested"]'),
      { timeout: 20000 },
    );
    await page.screenshot({ path: path.join(artifactDir, "companion-ai-dock-suggested.png"), fullPage: true });

    const dockLabels = await page.$$eval(
      "[data-learning-companion-dock]",
      nodes => nodes.map(node => node.getAttribute("data-learning-companion-dock")),
    );
    assert.deepEqual(dockLabels, ["quiz", "flashcards", "broadcast"]);

    await page.click('[data-learning-companion-dock="flashcards"]');
    await page.waitForSelector('[data-companion-artifact="flashcards"]', { timeout: 15000 });
    await page.click("[data-companion-flashcard-flip='true']");
    const flipped = await page.$eval(".companion-flashcard", node => node.classList.contains("is-flipped"));
    assert.equal(flipped, true, "flashcards flip inside the chat");
    await page.screenshot({ path: path.join(artifactDir, "companion-inchat-flashcards.png"), fullPage: true });

    await page.click('[data-learning-companion-dock="quiz"]');
    await page.waitForSelector('[data-companion-artifact="quiz"]', { timeout: 15000 });
    await page.click('[data-companion-quiz-option="1"]');
    await page.click("[data-companion-quiz-check='true']");
    const quizFeedback = await page.$eval(".companion-quiz-feedback", node => node.textContent);
    assert.match(quizFeedback, /Nice|matches/i);
    await page.screenshot({ path: path.join(artifactDir, "companion-inchat-quiz.png"), fullPage: true });

    await page.click('[data-learning-companion-dock="broadcast"]');
    await page.waitForSelector('[data-companion-artifact="broadcast"]', { timeout: 15000 });
    const broadcastText = await page.$eval('[data-companion-artifact="broadcast"]', node => node.textContent);
    assert.match(broadcastText, /ATP|Opening|audio/i);
    await page.screenshot({ path: path.join(artifactDir, "companion-inchat-broadcast.png"), fullPage: true });

    const calls = await page.evaluate(() => window.__companionTestCalls);
    assert.ok(calls.some(call => call.url.includes("/quiz/generate")));
    assert.ok(calls.some(call => call.url.includes("/flashcards/generate")));
    assert.ok(calls.some(call => call.url.includes("/broadcast/generate")));
    assert.ok(calls.some(call => call.url.includes("/learning-companion/respond")));

    console.log("companion-practice-chrome: passed");
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
