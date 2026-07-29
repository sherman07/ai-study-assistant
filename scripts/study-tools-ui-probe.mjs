import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const OUT = "/opt/cursor/artifacts/study-tools-probe";
fs.mkdirSync(OUT, { recursive: true });

const chromePath = process.env.CHROME_PATH
  || "/usr/bin/google-chrome-stable"
  || "/usr/bin/google-chrome";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,1100"],
  defaultViewport: { width: 1440, height: 1100 },
});

const page = await browser.newPage();
const notes = [];
const log = (msg) => {
  notes.push(msg);
  console.log(msg);
};

try {
  await page.goto("https://synapse-ai-study-assistant-tutor.vercel.app/frontend/index.html", {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, "01-workspace.png"), fullPage: true });

  const inventory = await page.evaluate(() => {
    const tools = [...document.querySelectorAll(".tool-switch-btn")].map((btn) => ({
      id: btn.id,
      text: (btn.textContent || "").replace(/\s+/g, " ").trim(),
      active: btn.classList.contains("active"),
      disabled: btn.disabled,
      ariaPressed: btn.getAttribute("aria-pressed"),
      role: btn.getAttribute("role"),
    }));
    const panels = [...document.querySelectorAll(".tool-panel")].map((panel) => ({
      id: panel.id,
      active: panel.classList.contains("active"),
      hasLaunch: Boolean(panel.querySelector(".study-tool-launch")),
      textHead: (panel.querySelector("h3")?.textContent || "").trim(),
    }));
    return {
      title: document.title,
      hasStudyTools: Boolean(document.querySelector(".study-tools-card")),
      hasNotes: Boolean(document.querySelector(".summary-card, .study-notes-card, #summaryContent")),
      tools,
      panels,
      bodyTextSample: (document.body?.innerText || "").slice(0, 500),
    };
  });
  log(JSON.stringify(inventory, null, 2));
  fs.writeFileSync(path.join(OUT, "inventory.json"), JSON.stringify(inventory, null, 2));

  // Click each visible study tool tab and capture state
  for (const tool of inventory.tools) {
    if (!tool.id) continue;
    try {
      await page.click(`#${tool.id}`);
      await sleep(700);
      const state = await page.evaluate((id) => {
        const btn = document.getElementById(id);
        const panelId = btn?.id?.replace("toolBtn", "toolPanel")
          ?.replace("MindMap", "MindMap")
          ?.replace("VisualGuide", "VisualGuide")
          ?.replace("Timeline", "Timeline")
          ?.replace("MasteryGraph", "MasteryGraph")
          ?.replace("Quiz", "Quiz")
          ?.replace("Flashcards", "Flashcards")
          ?.replace("Broadcast", "Broadcast");
        // Prefer active panel
        const active = document.querySelector(".tool-panel.active");
        return {
          clicked: id,
          buttonText: (btn?.textContent || "").replace(/\s+/g, " ").trim(),
          activePanel: active?.id || null,
          launchTitle: active?.querySelector(".study-tool-launch h4")?.textContent || null,
          launchCopy: active?.querySelector(".study-tool-launch p")?.textContent || null,
          panelHead: active?.querySelector(".tool-panel-head h3")?.textContent || null,
          alertsLikely: [...document.querySelectorAll("button")].some((b) => /generate/i.test(b.textContent || "")),
          htmlSnippet: (active?.innerHTML || "").slice(0, 400),
        };
      }, tool.id);
      log(`TOOL ${tool.id}: ${JSON.stringify(state)}`);
      await page.screenshot({
        path: path.join(OUT, `tool-${tool.id}.png`),
        fullPage: false,
      });
    } catch (error) {
      log(`TOOL ${tool.id} failed: ${error.message}`);
    }
  }

  // Mobile viewport pass
  await page.setViewport({ width: 390, height: 844 });
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, "02-mobile-tools.png"), fullPage: true });
  const mobile = await page.evaluate(() => {
    const switcher = document.querySelector(".tool-switcher");
    if (!switcher) return { hasSwitcher: false };
    const style = getComputedStyle(switcher);
    return {
      hasSwitcher: true,
      overflowX: style.overflowX,
      flexWrap: style.flexWrap,
      scrollWidth: switcher.scrollWidth,
      clientWidth: switcher.clientWidth,
      wrapsOrScrolls: switcher.scrollWidth > switcher.clientWidth || style.flexWrap === "wrap",
      buttonCount: switcher.querySelectorAll(".tool-switch-btn").length,
    };
  });
  log(`MOBILE: ${JSON.stringify(mobile)}`);
  fs.writeFileSync(path.join(OUT, "mobile.json"), JSON.stringify(mobile, null, 2));
  fs.writeFileSync(path.join(OUT, "notes.txt"), notes.join("\n"));
} catch (error) {
  log(`FATAL: ${error.stack || error.message}`);
  await page.screenshot({ path: path.join(OUT, "fatal.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}
