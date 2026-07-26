/**
 * Chrome functional probe for Outline-only-when-generated + accordion dropdowns.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { buildGeneratedNoteNavigation } from "../src/legacy/notesNavigation.js";
import { prepareChromeProbe } from "./chrome-probe-guard.mjs";

const probe = prepareChromeProbe("workspace-outline-accordion-chrome");
if (!probe.ok) {
  console.log(probe.reason);
  process.exit(0);
}
const { puppeteer, executablePath, distRoot } = probe;
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

const SAMPLE_NOTES = `# Guide

## 1. Big Picture: What This Material Is Really About

Overview body.

### A useful distinction

Nested detail under section 1.

### Why markets move together

More nested detail under section 1.

## 2. The Exam Will Probably Test These Ideas

Exam body.

### Likely exam questions in natural wording

Question bank.

## 3. What You Actually Need To Understand

Core understanding.
`;

async function mountOutlineTree(page) {
  const tree = buildGeneratedNoteNavigation(SAMPLE_NOTES);
  await page.evaluate((entries) => {
    const escapeHTML = (value) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    function createSectionButton(entry, depth = 0) {
      const title = String(entry?.title || "").trim();
      const children = Array.isArray(entry?.children) ? entry.children : [];
      const hasChildren = children.length > 0;
      const group = document.createElement("div");
      group.className = `section-nav-group${depth ? " nested" : ""}${hasChildren ? " section-nav-group--branch" : ""}`;
      group.dataset.sectionDepth = String(depth);
      group.dataset.hasChildren = String(hasChildren);
      const row = document.createElement("div");
      row.className = "section-nav-row";
      const targetId = entry?.anchor || "";
      const listId = targetId ? `${targetId}-children` : "";
      const mainButton = document.createElement("button");
      mainButton.type = "button";
      mainButton.className = `section-btn section-nav-main${hasChildren ? " has-children" : " is-leaf"}`;
      mainButton.dataset.sectionTitle = title;
      mainButton.dataset.sectionAnchor = targetId;
      mainButton.dataset.hasChildren = String(hasChildren);
      mainButton.innerHTML = hasChildren
        ? `<i class="bi bi-chevron-right section-nav-caret" aria-hidden="true"></i><span>${escapeHTML(title)}</span>`
        : `<span class="section-nav-leaf" aria-hidden="true"></span><span>${escapeHTML(title)}</span>`;

      let childList = null;
      const setExpanded = (expanded) => {
        if (!hasChildren || !childList) return;
        group.classList.toggle("expanded", expanded);
        childList.hidden = !expanded;
        mainButton.setAttribute("aria-expanded", String(expanded));
        const caret = mainButton.querySelector(".section-nav-caret");
        if (caret) {
          caret.className = expanded
            ? "bi bi-chevron-down section-nav-caret"
            : "bi bi-chevron-right section-nav-caret";
        }
      };

      mainButton.addEventListener("click", () => {
        document.querySelectorAll(".section-nav-main").forEach((button) => {
          button.classList.toggle("active", button.dataset.sectionTitle === title);
        });
        document.querySelectorAll(".section-nav-group--branch").forEach((branch) => {
          const activeBtn = branch.querySelector(".section-nav-main.active");
          if (!activeBtn) return;
          const rootBtn = branch.querySelector(":scope > .section-nav-row > .section-nav-main");
          if (rootBtn === activeBtn) return;
          const nested = branch.querySelector(":scope > .section-subnav");
          if (nested) nested.hidden = false;
          branch.classList.add("expanded");
          if (rootBtn) {
            rootBtn.setAttribute("aria-expanded", "true");
            const caret = rootBtn.querySelector(".section-nav-caret");
            if (caret) caret.className = "bi bi-chevron-down section-nav-caret";
          }
        });
        if (hasChildren) setExpanded(!group.classList.contains("expanded"));
      });

      row.appendChild(mainButton);
      group.appendChild(row);
      if (!hasChildren) return group;

      mainButton.setAttribute("aria-haspopup", "tree");
      mainButton.setAttribute("aria-expanded", "false");
      if (listId) mainButton.setAttribute("aria-controls", listId);
      childList = document.createElement("div");
      childList.className = "section-subnav";
      childList.hidden = true;
      if (listId) childList.id = listId;
      children.forEach((child) => childList.appendChild(createSectionButton(child, depth + 1)));
      group.appendChild(childList);
      return group;
    }

    const appLayout = document.getElementById("appLayout");
    const analysisStage = document.getElementById("analysisStage");
    const resultGrid = document.getElementById("resultGrid");
    const summaryContent = document.getElementById("summaryContent");
    const sections = document.getElementById("sections");
    const summaryNavDescription = document.getElementById("summaryNavDescription");

    appLayout.className =
      "app-layout analysis-ready generated-notes-state assistant-closed has-learning-rail";
    document.querySelector(".learning-experience-shell")?.style.setProperty("display", "none");
    analysisStage?.classList.remove("d-none");
    resultGrid?.classList.remove("d-none");
    if (summaryContent) {
      summaryContent.innerHTML = entries
        .map(
          (entry) =>
            `<h2 id="${entry.anchor}">${escapeHTML(entry.title)}</h2>` +
            (entry.children || [])
              .map((child) => `<h3 id="${child.anchor}">${escapeHTML(child.title)}</h3><p>Detail</p>`)
              .join("")
        )
        .join("");
    }
    if (summaryNavDescription) {
      summaryNavDescription.textContent = "6 generated sections from this note.";
    }
    sections.innerHTML = "";
    entries.forEach((entry) => sections.appendChild(createSectionButton(entry)));
    window.setWorkspaceNavTab?.("outline", { persist: false, expandRail: true });
  }, tree);
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
    await page.waitForSelector("#appLayout", { timeout: 20000 });

    // Outside generated notes: Outline controls must stay hidden.
    await page.evaluate(() => {
      document.getElementById("appLayout").className = "app-layout initial-state has-learning-rail";
      window.setWorkspaceNavTab?.("outline", { persist: false, expandRail: true });
    });
    await sleep(120);
    let state = await page.evaluate(() => ({
      tablistHidden: Boolean(document.querySelector(".workspace-nav-tabs")?.hidden),
      outlineHidden: Boolean(document.getElementById("summaryNav")?.hidden),
      tab: document.getElementById("appLayout")?.getAttribute("data-workspace-nav-tab"),
    }));
    assert.equal(state.tablistHidden, true, "Outline tabs hidden before generated notes");
    assert.equal(state.outlineHidden, true, "Outline panel hidden before generated notes");
    assert.equal(state.tab, "library", "non-generated workspace stays on Library");
    await page.screenshot({ path: path.join(artifactDir, "workspace-outline-home-library.png") });

    await mountOutlineTree(page);
    await sleep(200);

    state = await page.evaluate(() => ({
      tablistHidden: Boolean(document.querySelector(".workspace-nav-tabs")?.hidden),
      outlineHidden: Boolean(document.getElementById("summaryNav")?.hidden),
      tab: document.getElementById("appLayout")?.getAttribute("data-workspace-nav-tab"),
      branches: document.querySelectorAll(".section-nav-group--branch").length,
      visibleNested: Array.from(document.querySelectorAll(".section-subnav")).filter((node) => !node.hidden).length,
    }));
    assert.equal(state.tablistHidden, false, "Outline tabs visible on generated notes");
    assert.equal(state.outlineHidden, false, "Outline panel visible on generated notes");
    assert.equal(state.tab, "outline", "generated notes open on Outline");
    assert.equal(state.branches, 2, "two expandable big sections should exist");
    assert.equal(state.visibleNested, 0, "subsections start collapsed");

    const firstBranch = ".section-nav-group--branch .section-nav-main.has-children";
    await page.click(firstBranch);
    await sleep(160);
    state = await page.evaluate(() => {
      const branch = document.querySelector(".section-nav-group--branch");
      const nested = branch?.querySelector(":scope > .section-subnav");
      const nestedButtons = nested ? Array.from(nested.querySelectorAll(":scope > .section-nav-group > .section-nav-row > .section-nav-main")) : [];
      return {
        expanded: branch?.classList.contains("expanded"),
        nestedHidden: Boolean(nested?.hidden),
        nestedCount: nestedButtons.length,
        nestedTitles: nestedButtons.map((btn) => btn.dataset.sectionTitle),
        caret: branch?.querySelector(".section-nav-caret")?.className || "",
      };
    });
    assert.equal(state.expanded, true, "big section expands on click");
    assert.equal(state.nestedHidden, false, "nested list becomes visible");
    assert.equal(state.nestedCount, 2, "section 1 drops down into two subsections");
    assert.deepEqual(state.nestedTitles, ["A useful distinction", "Why markets move together"]);
    assert.match(state.caret, /bi-chevron-down/, "expanded caret points down");
    await page.screenshot({ path: path.join(artifactDir, "workspace-outline-expanded.png") });

    await page.click(`${firstBranch}`);
    await sleep(140);
    state = await page.evaluate(() => {
      const branch = document.querySelector(".section-nav-group--branch");
      return {
        expanded: branch?.classList.contains("expanded"),
        nestedHidden: Boolean(branch?.querySelector(":scope > .section-subnav")?.hidden),
      };
    });
    assert.equal(state.expanded, false, "second click collapses the big section");
    assert.equal(state.nestedHidden, true, "nested list hides again");

    await page.click(firstBranch);
    await sleep(120);
    await page.click(".section-nav-group--branch .section-nav-group.nested .section-nav-main");
    await sleep(140);
    state = await page.evaluate(() => {
      const branch = document.querySelector(".section-nav-group--branch");
      const active = document.querySelector(".section-nav-main.active");
      return {
        parentExpanded: branch?.classList.contains("expanded"),
        activeTitle: active?.dataset.sectionTitle || "",
        activeIsNested: Boolean(active?.closest(".section-nav-group.nested")),
      };
    });
    assert.equal(state.parentExpanded, true, "parent stays open when choosing a subsection");
    assert.equal(state.activeIsNested, true, "nested subsection becomes active");
    assert.ok(state.activeTitle, "active subsection has a title");
    await page.screenshot({ path: path.join(artifactDir, "workspace-outline-nested-active.png") });

    console.log("workspace-outline-accordion-chrome: passed");
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
