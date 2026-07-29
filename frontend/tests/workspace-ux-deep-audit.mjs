/**
 * Deep browser UX audit for Synapse (production + local).
 * Walks real pages, captures screenshots, and scores friction heuristics.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prepareChromeProbe } from "./chrome-probe-guard.mjs";

const probe = prepareChromeProbe("workspace-ux-deep-audit");
if (!probe.ok) {
  console.log(probe.reason);
  process.exit(0);
}
const { puppeteer, executablePath } = probe;

const artifactDir = "/opt/cursor/artifacts/ux-audit";
fs.mkdirSync(artifactDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGETS = [
  {
    id: "production",
    origin: "https://synapse-ai-study-assistant-tutor.vercel.app",
  },
  {
    id: "local",
    origin: "http://127.0.0.1:5175",
  },
];

const findings = [];

function note(severity, area, title, detail, evidence = {}) {
  findings.push({ severity, area, title, detail, ...evidence, at: new Date().toISOString() });
}

async function shot(page, name) {
  const file = path.join(artifactDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function measureA11yBasics(page) {
  return page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button, a, [role='button']"));
    const unlabeled = buttons.filter((el) => {
      const label = (
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        el.textContent ||
        ""
      ).replace(/\s+/g, " ").trim();
      return label.length < 1;
    }).length;

    const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
    const unlabeledInputs = inputs.filter((el) => {
      if (el.type === "hidden") return false;
      const id = el.id;
      const byFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const aria = el.getAttribute("aria-label") || el.getAttribute("placeholder") || "";
      return !byFor && aria.trim().length < 1;
    }).length;

    const textNodes = Array.from(document.querySelectorAll("p, li, h1, h2, h3, button, a, span"))
      .slice(0, 200)
      .map((el) => {
        const style = getComputedStyle(el);
        const color = style.color;
        const bg = style.backgroundColor;
        return { tag: el.tagName, color, bg, text: (el.textContent || "").slice(0, 40) };
      });

    return {
      title: document.title,
      unlabeledButtons: unlabeled,
      unlabeledInputs,
      headingCount: document.querySelectorAll("h1,h2,h3").length,
      h1Count: document.querySelectorAll("h1").length,
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      sampleText: textNodes.slice(0, 8),
    };
  });
}

async function clickText(page, text, { exact = false, timeout = 4000 } = {}) {
  const handle = await page.waitForFunction(
    (needle, exactMatch) => {
      const nodes = Array.from(document.querySelectorAll("button, a, [role='button'], [role='tab']"));
      return nodes.find((el) => {
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        return exactMatch ? t === needle : t.includes(needle);
      }) || null;
    },
    { timeout },
    text,
    exact
  ).catch(() => null);
  if (!handle) return false;
  await page.evaluate((needle, exactMatch) => {
    const nodes = Array.from(document.querySelectorAll("button, a, [role='button'], [role='tab']"));
    const el = nodes.find((node) => {
      const t = (node.textContent || "").replace(/\s+/g, " ").trim();
      return exactMatch ? t === needle : t.includes(needle);
    });
    el?.click();
  }, text, exact);
  await sleep(350);
  return true;
}

async function auditLanding(page, target) {
  await page.goto(`${target.origin}/`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(800);
  await shot(page, `${target.id}-01-landing-hero`);
  const a11y = await measureA11yBasics(page);
  if (a11y.overflowX > 8) {
    note("high", "landing", "Horizontal overflow on landing", `overflowX=${a11y.overflowX}px`, { target: target.id });
  }
  if (a11y.h1Count !== 1) {
    note("medium", "landing", "Landing heading structure odd", `Found ${a11y.h1Count} h1 elements`, { target: target.id });
  }

  // Pricing honesty check from earlier work - $0.00 is bad UX
  const pricing = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      hasZeroPrice: /\$0\.00/.test(text),
      hasFree: /Free/.test(text),
      hasGetStarted: /Get Started/i.test(text),
    };
  });
  if (pricing.hasZeroPrice) {
    note(
      "high",
      "landing",
      "Pricing cards show $0.00",
      "Pro plans rendering as $0.00 looks broken/untrustworthy and hurts conversion trust.",
      { target: target.id }
    );
  }

  // Hero clutter / fabricated metrics (may already be fixed on local)
  const heroSignals = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      sourceTypes: /6\s*source types/i.test(text),
      studyFormats: /7\s*study formats/i.test(text),
      alwaysOn: /23\/7|24\/7/i.test(text),
      masteryUp: /Up 19 points/i.test(text),
    };
  });
  if (heroSignals.sourceTypes || heroSignals.studyFormats || heroSignals.alwaysOn) {
    note(
      "medium",
      "landing",
      "Marketing metrics may feel fabricated",
      `Signals: ${JSON.stringify(heroSignals)}. Prefer product-truthful claims over invented counters.`,
      { target: target.id }
    );
  }

  await page.setViewport({ width: 390, height: 844 });
  await sleep(400);
  await shot(page, `${target.id}-02-landing-mobile`);
  const mobileOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  if (mobileOverflow > 8) {
    note("high", "landing", "Mobile landing horizontal overflow", `overflowX=${mobileOverflow}px`, { target: target.id });
  }
  await page.setViewport({ width: 1440, height: 960 });
}

async function auditAuth(page, target) {
  await page.goto(`${target.origin}/frontend/login.html`, { waitUntil: "networkidle2", timeout: 60000 }).catch(async () => {
    await page.goto(`${target.origin}/login.html`, { waitUntil: "networkidle2", timeout: 60000 });
  });
  await sleep(500);
  await shot(page, `${target.id}-03-login`);
  const login = await page.evaluate(() => {
    const email = document.querySelector('input[type="email"], input[name="email"], #email');
    const password = document.querySelector('input[type="password"], #password');
    const submit = Array.from(document.querySelectorAll("button")).find((b) => /sign in|log in|continue/i.test(b.textContent || ""));
    return {
      hasEmail: Boolean(email),
      hasPassword: Boolean(password),
      hasSubmit: Boolean(submit),
      title: document.title,
      bodySnippet: (document.body.innerText || "").slice(0, 280),
    };
  });
  if (!login.hasEmail || !login.hasPassword) {
    note("high", "auth", "Login form incomplete or missing fields", JSON.stringify(login), { target: target.id });
  }

  await page.goto(`${target.origin}/frontend/signup.html`, { waitUntil: "networkidle2", timeout: 60000 }).catch(async () => {
    await page.goto(`${target.origin}/signup.html`, { waitUntil: "networkidle2", timeout: 60000 });
  });
  await sleep(400);
  await shot(page, `${target.id}-04-signup`);
}

async function auditWorkspace(page, target) {
  // Prefer trailing-slash directory URLs. `/frontend` and some hosts' `/frontend/index.html`
  // redirects can resolve relative assets against `/` and leave the workspace half-booted.
  const candidates = [
    `${target.origin}/frontend/`,
    `${target.origin}/frontend/index.html`,
    `${target.origin}/app.html`,
  ];
  let loaded = false;
  for (const url of candidates) {
    try {
      const res = await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
      if (res && res.status() < 400) {
        loaded = true;
        break;
      }
    } catch {
      // try next
    }
  }
  if (!loaded) {
    note("critical", "workspace", "Could not load workspace", "No workspace URL responded", { target: target.id });
    return;
  }
  await page.waitForSelector("#appLayout, #historyNav, .app-layout", { timeout: 25000 }).catch(() => null);
  await sleep(900);
  await shot(page, `${target.id}-05-workspace-home`);

  const home = await page.evaluate(() => {
    const rail = document.getElementById("historyNav");
    const tabs = document.querySelector(".workspace-nav-tabs");
    const materials = document.querySelector(".learning-rail-materials");
    const companion = document.querySelector(".learning-rail-companion");
    const focus = document.querySelector(".learning-rail-focus-room");
    const hide = document.getElementById("historyNavToggle");
    return {
      hasRail: Boolean(rail),
      tabsHidden: tabs ? tabs.hidden || getComputedStyle(tabs).display === "none" : true,
      hasMaterials: Boolean(materials),
      hasCompanion: Boolean(companion),
      hasFocus: Boolean(focus),
      hasHide: Boolean(hide),
      mode: document.getElementById("appLayout")?.dataset.learningExperienceMode || "",
      classes: document.getElementById("appLayout")?.className || "",
      uploadVisible: (() => {
        const el = document.getElementById("uploadStage");
        if (!el) return false;
        const style = getComputedStyle(el);
        return style.display !== "none" && !el.classList.contains("d-none");
      })(),
    };
  });

  if (!home.hasRail) {
    note("critical", "workspace", "Learning rail missing", JSON.stringify(home), { target: target.id });
  }
  if (!home.tabsHidden && home.classes.includes("initial-state")) {
    note("high", "workspace", "Outline tabs visible on home", "Outline should appear only for generated notes", { target: target.id });
  }
  if (!home.hasHide) {
    note("medium", "workspace", "No hide control for left rail", "Users cannot reclaim reading space", { target: target.id });
  }

  // Companion jump
  if (home.hasCompanion) {
    await page.evaluate(() => {
      const btn = document.querySelector(".learning-rail-companion");
      if (typeof window.setLearningExperienceMode === "function") {
        window.setLearningExperienceMode("companion");
      } else {
        btn?.click();
      }
    });
    await sleep(500);
    await shot(page, `${target.id}-06-companion`);
    const companionState = await page.evaluate(() => ({
      mode: document.getElementById("appLayout")?.dataset.learningExperienceMode || "",
      companionVisible: (() => {
        const el = document.getElementById("companionWorkspace");
        if (!el) return false;
        return getComputedStyle(el).display !== "none" && !el.classList.contains("d-none");
      })(),
      composer: Boolean(document.querySelector(".companion-composer, textarea, [data-learning-companion-send]")),
      openAssistantType: typeof window.openAssistant,
    }));
    if (companionState.mode !== "companion" || !companionState.companionVisible) {
      note("high", "workspace", "Learning companion jump failed", JSON.stringify(companionState), { target: target.id });
    }
    if (companionState.openAssistantType !== "function") {
      note("critical", "workspace", "window.openAssistant shadowed / missing", companionState.openAssistantType, { target: target.id });
    }
    if (!companionState.composer) {
      note("medium", "workspace", "Companion composer not obvious", "Primary chat input hard to find after jump", { target: target.id });
    }
  }

  // Materials jump back
  if (home.hasMaterials) {
    await page.evaluate(() => {
      if (typeof window.setLearningExperienceMode === "function") {
        window.setLearningExperienceMode("materials");
      } else {
        document.querySelector(".learning-rail-materials")?.click();
      }
    });
    await sleep(450);
    await shot(page, `${target.id}-07-materials`);
    const materialsState = await page.evaluate(() => ({
      mode: document.getElementById("appLayout")?.dataset.learningExperienceMode || "",
      uploadVisible: (() => {
        const el = document.getElementById("uploadStage");
        if (!el) return false;
        return getComputedStyle(el).display !== "none" && !el.classList.contains("d-none");
      })(),
    }));
    if (materialsState.mode !== "materials" || !materialsState.uploadVisible) {
      note("high", "workspace", "Materials jump failed", JSON.stringify(materialsState), { target: target.id });
    }
  }

  // Hide/show rail
  if (home.hasHide) {
    await page.evaluate(() => {
      if (typeof window.toggleHistoryNav === "function") window.toggleHistoryNav(true);
      else document.getElementById("historyNavToggle")?.click();
    });
    await sleep(300);
    const collapsed = await page.evaluate(() => ({
      collapsed: document.getElementById("appLayout")?.classList.contains("history-collapsed"),
      expandVisible: (() => {
        const el = document.getElementById("historyNavExpand");
        return Boolean(el) && !el.hidden;
      })(),
      notesLeft: document.querySelector(".notes-area")?.getBoundingClientRect().left || 0,
    }));
    await shot(page, `${target.id}-08-rail-collapsed`);
    if (!collapsed.collapsed || !collapsed.expandVisible) {
      note("high", "workspace", "Rail hide/show broken", JSON.stringify(collapsed), { target: target.id });
    }
    if (collapsed.expandVisible) {
      await page.evaluate(() => {
        if (typeof window.toggleHistoryNav === "function") window.toggleHistoryNav(false);
        else document.getElementById("historyNavExpand")?.click();
      });
      await sleep(300);
    }
  }

  // Simulate generated notes deeply (local can use latest UX; production may lag)
  await page.evaluate(() => {
    const appLayout = document.getElementById("appLayout");
    if (!appLayout) return;
    const analysisStage = document.getElementById("analysisStage");
    const resultGrid = document.getElementById("resultGrid");
    const sections = document.getElementById("sections");
    const summaryContent = document.getElementById("summaryContent");
    appLayout.className = "app-layout analysis-ready generated-notes-state assistant-closed has-learning-rail";
    analysisStage?.classList.remove("d-none");
    resultGrid?.classList.remove("d-none");
    document.getElementById("uploadStage")?.classList.add("d-none");
    document.querySelector(".learning-experience-shell")?.setAttribute("style", "display:none");
    if (summaryContent) {
      summaryContent.innerHTML = `<h2 id="section-1-big-picture">1. Big Picture</h2><p>${"Readable paragraph about money markets. ".repeat(20)}</p><h3 id="section-1-distinction">A useful distinction</h3><p>Nested detail.</p><h2 id="section-2-exam">2. The Exam Will Probably Test These Ideas</h2><p>${"Exam guidance. ".repeat(12)}</p>`;
    }
    if (sections) {
      sections.innerHTML = `
        <div class="section-nav-group section-nav-group--branch" data-has-children="true">
          <div class="section-nav-row"><button class="section-btn section-nav-main has-children" type="button" aria-expanded="false"><i class="bi bi-chevron-right section-nav-caret"></i><span>1. Big Picture</span></button></div>
          <div class="section-subnav" hidden>
            <div class="section-nav-group nested"><div class="section-nav-row"><button class="section-btn section-nav-main is-leaf" type="button"><span class="section-nav-leaf"></span><span>A useful distinction</span></button></div></div>
          </div>
        </div>
        ${Array.from({ length: 30 }, (_, i) => `<div class="section-nav-group"><div class="section-nav-row"><button class="section-btn section-nav-main is-leaf" type="button"><span class="section-nav-leaf"></span><span>${i + 2}. Extra section ${i + 2}</span></button></div></div>`).join("")}
      `;
      const branch = sections.querySelector(".section-nav-group--branch .section-nav-main");
      branch?.addEventListener("click", () => {
        const group = branch.closest(".section-nav-group");
        const list = group.querySelector(":scope > .section-subnav");
        const expanded = !group.classList.contains("expanded");
        group.classList.toggle("expanded", expanded);
        if (list) list.hidden = !expanded;
        branch.setAttribute("aria-expanded", String(expanded));
        const caret = branch.querySelector(".section-nav-caret");
        if (caret) caret.className = expanded ? "bi bi-chevron-down section-nav-caret" : "bi bi-chevron-right section-nav-caret";
      });
    }
    window.setWorkspaceNavTab?.("outline", { persist: false, expandRail: true });
  });
  await sleep(400);
  await shot(page, `${target.id}-09-generated-outline`);

  const generated = await page.evaluate(() => {
    const list = document.querySelector("#summaryNav .section-list");
    const tabs = document.querySelector(".workspace-nav-tabs");
    const notes = document.querySelector(".notes-card, #summaryContent");
    const openTutor = document.getElementById("openAssistantFab");
    const sources = document.getElementById("sourceViewerBtn");
    if (list) list.scrollTop = 220;
    return {
      tabsVisible: tabs ? !tabs.hidden && getComputedStyle(tabs).display !== "none" : false,
      canScrollOutline: list ? list.scrollHeight > list.clientHeight + 8 && list.scrollTop > 0 : false,
      notesWidth: Math.round(notes?.getBoundingClientRect().width || 0),
      hasOpenTutor: Boolean(openTutor),
      hasSources: Boolean(sources),
      outlineHidden: Boolean(document.getElementById("summaryNav")?.hidden),
      openAssistantType: typeof window.openAssistant,
    };
  });
  if (!generated.tabsVisible) {
    note("high", "generated-notes", "Outline tabs not visible in generated state", JSON.stringify(generated), { target: target.id });
  }
  if (!generated.canScrollOutline) {
    note("high", "generated-notes", "Outline list still not scrollable", JSON.stringify(generated), { target: target.id });
  }
  if (generated.openAssistantType !== "function") {
    note("critical", "generated-notes", "window.openAssistant not a function (id collision?)", generated.openAssistantType, { target: target.id });
  }
  if (generated.notesWidth > 0 && generated.notesWidth < 420) {
    note("high", "generated-notes", "Notes column feels squashed", `notesWidth=${generated.notesWidth}`, { target: target.id });
  }

  // Expand accordion
  await page.evaluate(() => {
    document.querySelector(".section-nav-group--branch .section-nav-main.has-children")?.click();
  });
  await sleep(250);
  const expanded = await page.evaluate(() => {
    const group = document.querySelector(".section-nav-group--branch");
    return {
      expanded: group?.classList.contains("expanded"),
      nestedVisible: group ? !group.querySelector(":scope > .section-subnav")?.hidden : false,
    };
  });
  await shot(page, `${target.id}-10-outline-expanded`);
  if (!expanded.expanded || !expanded.nestedVisible) {
    note("medium", "generated-notes", "Outline accordion expand weak/broken", JSON.stringify(expanded), { target: target.id });
  }

  // Open tutor + sources combos
  if (generated.hasOpenTutor || generated.openAssistantType === "function") {
    await page.evaluate(() => {
      if (typeof window.openAssistant === "function") window.openAssistant();
      else document.getElementById("openAssistantFab")?.click();
    });
    await sleep(350);
    await shot(page, `${target.id}-11-tutor-open`);
    const tutor = await page.evaluate(() => ({
      closed: document.getElementById("appLayout")?.classList.contains("assistant-closed"),
      notesWidth: Math.round(document.querySelector(".notes-card, #summaryContent")?.getBoundingClientRect().width || 0),
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    }));
    if (tutor.closed) note("high", "generated-notes", "Open Tutor did not open", JSON.stringify(tutor), { target: target.id });
    if (tutor.notesWidth > 0 && tutor.notesWidth < 300) {
      note("high", "generated-notes", "Tutor open crushes notes", `notesWidth=${tutor.notesWidth}`, { target: target.id });
    }
    if (tutor.overflowX > 24) {
      note("medium", "generated-notes", "Tutor open causes page overflow", `overflowX=${tutor.overflowX}`, { target: target.id });
    }
  }

  if (generated.hasSources) {
    await page.evaluate(() => {
      document.getElementById("resultGrid")?.classList.add("source-open");
      window.toggleSourceViewer?.(true);
    });
    await sleep(300);
    await shot(page, `${target.id}-12-sources-tutor`);
  }

  // Jump away from generated notes via companion
  await page.evaluate(() => {
    if (typeof window.setLearningExperienceMode === "function") {
      window.setLearningExperienceMode("companion");
    } else {
      document.querySelector(".learning-rail-companion")?.click();
    }
  });
  await sleep(450);
  const escaped = await page.evaluate(() => ({
    classes: document.getElementById("appLayout")?.className || "",
    mode: document.getElementById("appLayout")?.dataset.learningExperienceMode || "",
    companionVisible: (() => {
      const el = document.getElementById("companionWorkspace");
      if (!el) return false;
      return getComputedStyle(el).display !== "none" && !el.classList.contains("d-none");
    })(),
    blankMain: (() => {
      const upload = document.getElementById("uploadStage");
      const companion = document.getElementById("companionWorkspace");
      const analysis = document.getElementById("analysisStage");
      const uploadOk = upload && !upload.classList.contains("d-none") && getComputedStyle(upload).display !== "none";
      const companionOk = companion && !companion.classList.contains("d-none") && getComputedStyle(companion).display !== "none";
      const analysisHidden = !analysis || analysis.classList.contains("d-none") || getComputedStyle(analysis).display === "none";
      return analysisHidden && !uploadOk && !companionOk;
    })(),
  }));
  await shot(page, `${target.id}-13-escape-to-companion`);
  if (escaped.classes.includes("generated-notes-state")) {
    note("critical", "workspace", "Stuck in generated notes after Companion click", JSON.stringify(escaped), { target: target.id });
  }
  if (escaped.blankMain) {
    note("critical", "workspace", "Blank main after leaving generated notes", JSON.stringify(escaped), { target: target.id });
  }

  // Mobile workspace — reload home for a clean materials surface
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => {
    if (typeof window.openWorkspaceHome === "function") window.openWorkspaceHome("materials");
    else if (typeof window.setLearningExperienceMode === "function") window.setLearningExperienceMode("materials");
  });
  await sleep(500);
  await shot(page, `${target.id}-14-workspace-mobile`);
  const mobile = await page.evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    mobileNav: Boolean(document.querySelector(".mobile-nav, #mobileNav, .mobile-menu-btn, .navbar-toggler, [data-bs-toggle='offcanvas']")),
    railHidden: getComputedStyle(document.getElementById("historyNav") || document.body).display === "none",
    uploadVisible: (() => {
      const el = document.getElementById("uploadStage");
      if (!el) return false;
      return getComputedStyle(el).display !== "none" && !el.classList.contains("d-none");
    })(),
    topbarVisible: (() => {
      const el = document.querySelector(".mobile-topbar");
      if (!el) return false;
      return getComputedStyle(el).display !== "none";
    })(),
  }));
  if (mobile.overflowX > 8) {
    note("high", "mobile", "Workspace mobile overflow", JSON.stringify(mobile), { target: target.id });
  }
  if (!mobile.uploadVisible) {
    note("high", "mobile", "Mobile materials content missing", JSON.stringify(mobile), { target: target.id });
  }
  if (!mobile.mobileNav && !mobile.railHidden) {
    note("medium", "mobile", "No clear mobile nav alternative", "Desktop rail may dominate small screens", { target: target.id });
  }
  if (mobile.railHidden && !mobile.topbarVisible) {
    note("high", "mobile", "No mobile topbar when desktop rail hidden", JSON.stringify(mobile), { target: target.id });
  }
  await page.setViewport({ width: 1440, height: 960 });
}

async function auditFocusRoom(page, target) {
  const urls = [`${target.origin}/frontend/focus-room.html`, `${target.origin}/focus-room.html`];
  for (const url of urls) {
    try {
      const res = await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
      if (res && res.status() < 400) break;
    } catch {
      // continue
    }
  }
  await sleep(1000);
  await shot(page, `${target.id}-15-focus-room`);
  const focus = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      title: document.title,
      hasEnter: /enter|start|focus/i.test(text),
      hasTimer: /timer|pomodoro|mm:ss|\d+:\d+/i.test(text),
      controls: Array.from(document.querySelectorAll("button")).slice(0, 12).map((b) => (b.textContent || "").trim()).filter(Boolean),
    };
  });
  if (!focus.hasEnter && focus.controls.length < 1) {
    note("medium", "focus-room", "Focus Room entry affordance unclear", JSON.stringify(focus), { target: target.id });
  }
}

async function auditTarget(browser, target) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });
  page.setDefaultTimeout(20000);
  try {
    await auditLanding(page, target);
    await auditAuth(page, target);
    await auditWorkspace(page, target);
    await auditFocusRoom(page, target);
  } catch (error) {
    note("critical", "audit", `Audit crashed on ${target.id}`, String(error?.stack || error), { target: target.id });
  } finally {
    await page.close();
  }
}

async function run() {
  if (process.env.SYNAPSE_UX_AUDIT !== "1" && process.env.SYNAPSE_UX_AUDIT !== "true") {
    console.log("workspace-ux-deep-audit: skipped (set SYNAPSE_UX_AUDIT=1 to run)");
    return;
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1440,960"],
  });

  try {
    for (const target of TARGETS) {
      await auditTarget(browser, target);
    }
  } finally {
    await browser.close();
  }

  const summary = {
    counts: {
      critical: findings.filter((f) => f.severity === "critical").length,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
    },
    findings,
  };
  fs.writeFileSync(path.join(artifactDir, "ux-audit-findings.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`ux-audit: wrote ${findings.length} findings to ${artifactDir}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
