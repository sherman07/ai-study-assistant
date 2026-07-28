function openVisualModal(index) {
  const item = getLearningFigureByMarker(index);
  if (!item || !item.url) return;
  const title = cleanSourceFigureDisplayText(item.title) || `Source figure ${Number(index) + 1}`;
  const sourceTitle = cleanSourceFigureDisplayText(item.source_title || `Source ${item.source_index || ""}`);
  const metaParts = [
    sourceTitle,
    cleanSourceFigureDisplayText(item.location || ""),
    cleanSourceFigureDisplayText(item.visual_kind || "")
  ].filter(Boolean);
  const explanation = renderVisualExplanationSections(item);
  // One visual overlay at a time; remove any prior modal before opening another.
  document.querySelector(".visual-modal")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "visual-modal";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", title);
  overlay.innerHTML = `
    <div class="visual-modal-content">
      <button class="visual-modal-close" type="button" aria-label="Close visual"><i class="bi bi-x-lg"></i></button>
      <img src="${escapeAttr(item.url)}" alt="${escapeAttr(title)}">
      <div class="visual-modal-caption">
        <span class="inline-visual-kicker">In-text source</span>
        ${title ? `<h4>${escapeHTML(title)}</h4>` : ""}
        ${metaParts.length ? `<p class="visual-source-meta">${escapeHTML(metaParts.join(" • "))}</p>` : ""}
        ${explanation}
      </div>
    </div>
  `;
  const closeModal = () => {
    window.removeEventListener("keydown", onKeyDown, true);
    overlay.remove();
  };
  const onKeyDown = event => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeModal();
  };
  overlay.addEventListener("click", event => {
    if (event.target === overlay || event.target.closest(".visual-modal-close")) closeModal();
  });
  // Capture phase so Escape closes the visual before source-viewer shortcuts.
  window.addEventListener("keydown", onKeyDown, true);
  document.body.appendChild(overlay);
  overlay.querySelector(".visual-modal-close")?.focus?.();
}


function renderMissingInlineVisualCard(index, item = null) {
  const visualIndex = Number(index);
  const label = Number.isFinite(visualIndex) ? `Source figure ${visualIndex + 1}` : "Source figure";
  const title = cleanSourceFigureDisplayText(item?.title || "") || "Figure unavailable";
  return `
    <figure id="inline-visual-${Number.isFinite(visualIndex) ? visualIndex : 0}" class="inline-visual-card missing" aria-label="${escapeAttr(label)} unavailable">
      <figcaption>
        <div class="inline-visual-kicker">In-text source</div>
        <h4>${escapeHTML(title)}</h4>
        <p>Figure unavailable. This image could not be extracted from the uploaded source. Regenerate notes or view the original PDF.</p>
      </figcaption>
    </figure>
  `;
}

function renderInlineVisualCard(index) {
  const item = getLearningFigureByMarker(index);
  if (!item || !item.url) {
    return renderMissingInlineVisualCard(index, item);
  }
  const title = cleanSourceFigureDisplayText(item.title) || `Source figure ${Number(index) + 1}`;
  const source = cleanSourceFigureDisplayText(item.source_title || `Source ${item.source_index || ""}`);
  const caption = getVisualDetailText(item, ["what_shows", "caption"]);
  const explanation = renderVisualExplanationSections(item, { compact: true });
  return `
    <figure id="inline-visual-${Number(index)}" class="inline-visual-card" onclick="openVisualModal(${Number(index)})">
      <div class="inline-visual-image-wrap">
        <img src="${escapeAttr(item.url)}" alt="${escapeAttr(title)}" loading="lazy">
      </div>
      <figcaption>
        <div class="inline-visual-kicker">In-text source</div>
        <h4>${escapeHTML(title)}</h4>
        <p><strong>${escapeHTML(source)}</strong></p>
        ${caption ? `<p>${escapeHTML(shorten(caption, 180))}</p>` : ""}
        ${explanation}
      </figcaption>
    </figure>
  `;
}

function focusInlineVisual(index) {
  const visualIndex = Number(index);
  if (!Number.isFinite(visualIndex)) return;
  const card = document.getElementById(`inline-visual-${visualIndex}`);
  if (!card) {
    openVisualModal(visualIndex);
    return;
  }
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.remove("visual-focus-pulse");
  // Restart the pulse animation even when the user clicks the same reference twice.
  requestAnimationFrame(() => {
    card.classList.add("visual-focus-pulse");
    window.setTimeout(() => card.classList.remove("visual-focus-pulse"), 1800);
  });
}

function renderInlineVisualReference(index, shownIndex = null) {
  const item = getLearningFigureByMarker(index);
  const referenceIndex = Number.isFinite(Number(shownIndex)) ? Number(shownIndex) : Number(index);
  const label = `Source figure ${referenceIndex + 1}`;
  const title = cleanSourceFigureDisplayText(item?.title || "") || label;
  const location = cleanSourceFigureDisplayText(item?.location || "");
  const targetIndex = referenceIndex;
  return `
    <p class="inline-visual-reference">
      <button type="button" onclick="focusInlineVisual(${targetIndex})">${escapeHTML(label)}</button>
      <span>${escapeHTML(title)}${location ? ` · ${escapeHTML(location)}` : ""}</span>
    </p>
  `;
}

window.focusInlineVisual = focusInlineVisual;

function renderSections() {
  sectionsContainer.innerHTML = "";

  const mobileSectionsContainer = document.getElementById("mobileSections");
  if (mobileSectionsContainer) mobileSectionsContainer.innerHTML = "";

  const navigationEntries = typeof buildGeneratedNoteNavigation === "function"
    ? buildGeneratedNoteNavigation(fullSummary, sections)
    : Object.entries(sections).map(([title, markdown]) => ({ title, markdown }));
  const summaryNavDescription = document.getElementById("summaryNavDescription");

  if (navigationEntries.length === 0) {
    const empty = `<div class="text-secondary small">No sections generated yet.</div>`;
    sectionsContainer.innerHTML = empty;
    if (mobileSectionsContainer) mobileSectionsContainer.innerHTML = empty;
    if (summaryNavDescription) summaryNavDescription.textContent = "No generated headings are available for this note yet.";
    return;
  }

  if (summaryNavDescription) {
    const count = countNavigationNodes(navigationEntries);
    summaryNavDescription.textContent = `${count} generated section${count === 1 ? "" : "s"} from this note.`;
  }

  navigationEntries.forEach(entry => {
    sectionsContainer.appendChild(createSectionButton(entry, false));
    if (mobileSectionsContainer) {
      mobileSectionsContainer.appendChild(createSectionButton(entry, true));
    }
  });
}

function flattenNavigationEntries(entries = []) {
  return entries.flatMap(entry => [entry, ...flattenNavigationEntries(entry.children || [])]);
}

function countNavigationNodes(entries = []) {
  return flattenNavigationEntries(entries).length;
}

function syncGeneratedHeadingAnchors(navigationEntries = []) {
  if (!summaryContent) return;
  const entriesByTitle = new Map();
  flattenNavigationEntries(navigationEntries).forEach(entry => {
    const key = String(entry.title || "").trim().toLowerCase();
    if (key && !entriesByTitle.has(key)) entriesByTitle.set(key, entry);
  });
  const seenAnchors = new Set();
  summaryContent.querySelectorAll("[data-section-title], h2, h3, h4").forEach(element => {
    const title = String(element.dataset.sectionTitle || element.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    const entry = entriesByTitle.get(title);
    if (!entry?.anchor || seenAnchors.has(entry.anchor)) return;
    element.id = entry.anchor;
    seenAnchors.add(entry.anchor);
  });
}

function renderNotesMarkdown(markdown, emptyMessage = "No generated notes are available for this section.") {
  if (!summaryContent) return;
  const source = String(markdown || "").trim();
  if (!source) {
    summaryContent.innerHTML = `<div class="notes-empty-state">${escapeHTML(emptyMessage)}</div>`;
    return;
  }
  try {
    const renderedHtml = markdownToHTML(source);
    const surfaceHtml = typeof renderStudyNotesSurface === "function"
      ? renderStudyNotesSurface(renderedHtml, {
        collapseSecondary: typeof shouldCollapseSecondarySections === "function" && !selectedSection ? shouldCollapseSecondarySections() : false,
        promptMode: currentPromptMode || "professor_mode"
      })
      : renderedHtml;
    const noticeHtml = typeof renderAiGenerationNotice === "function" ? renderAiGenerationNotice() : "";
    typeInto(summaryContent, `${noticeHtml}${surfaceHtml}`, () => {
      renderMath();
      const navigationEntries = typeof buildGeneratedNoteNavigation === "function"
        ? buildGeneratedNoteNavigation(fullSummary, sections)
        : [];
      syncGeneratedHeadingAnchors(navigationEntries);
    });
  } catch (error) {
    console.error("Could not render notes markdown:", error);
    summaryContent.innerHTML = `<pre class="notes-render-fallback">${escapeHTML(source)}</pre>`;
  }
}

function renderFullNotes() {
  selectedSection = "";
  sectionTitle.innerText = "Study Notes";
  contextLabel.textContent = "Current Notes";
  renderNotesMarkdown(ensureRenderableSummary(fullSummary, sections), "No generated notes are available yet.");
}

function renderSectionNotes(title, options = {}) {
  selectedSection = title;
  sectionTitle.innerText = title;
  contextLabel.textContent = shorten(title, 22);
  if (options.countMasteryOpen !== false && typeof recordMasterySectionOpen === "function") {
    recordMasterySectionOpen(title);
  }
  if (typeof recordStudyActivity === "function") {
    recordStudyActivity("section_opened", { tool: "notes", sectionTitle: title });
  }
  const sectionMarkdown = String(options.markdown || sections[title] || "").trim();
  renderNotesMarkdown(sectionMarkdown, `No notes were generated for ${title}.`);
}

function createSectionButton(entry, isMobile = false, depth = 0) {
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
  mainButton.title = hasChildren ? `${title} (click to open and expand subsections)` : title;
  mainButton.dataset.sectionTitle = title;
  mainButton.dataset.sectionAnchor = targetId;
  mainButton.dataset.hasChildren = String(hasChildren);
  mainButton.style.setProperty("--section-depth", String(depth));
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
    navigateToGeneratedHeading(entry, isMobile);
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
  children.forEach(child => {
    childList.appendChild(createSectionButton(child, isMobile, depth + 1));
  });
  group.appendChild(childList);
  return group;
}

function navigateToGeneratedHeading(entry, isMobile = false) {
  const targetId = String(entry?.anchor || "");
  if (!targetId) return;
  selectedSection = "";
  sectionTitle.innerText = "Study Notes";
  contextLabel.textContent = "Current Notes";
  renderFullNotes();
  document.querySelectorAll(".section-nav-main").forEach(button => {
    button.classList.toggle("active", button.dataset.sectionTitle === entry.title);
  });
  // Keep ancestor dropdowns open when a nested subsection is selected.
  document.querySelectorAll(".section-nav-group--branch").forEach(group => {
    const activeBtn = group.querySelector(".section-nav-main.active");
    if (!activeBtn) return;
    const rootBtn = group.querySelector(":scope > .section-nav-row > .section-nav-main");
    // Do not force-open the clicked parent itself; its own click handler toggles.
    if (rootBtn === activeBtn) return;
    const childList = group.querySelector(":scope > .section-subnav");
    if (childList) childList.hidden = false;
    group.classList.add("expanded");
    if (rootBtn) {
      rootBtn.setAttribute("aria-expanded", "true");
      const caret = rootBtn.querySelector(".section-nav-caret");
      if (caret) caret.className = "bi bi-chevron-down section-nav-caret";
    }
  });
  requestAnimationFrame(() => {
    const target = document.getElementById(targetId);
    const disclosure = target?.closest("details");
    if (disclosure) disclosure.open = true;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  if (typeof recordMasterySectionOpen === "function") {
    recordMasterySectionOpen(entry.title);
  }
  if (typeof recordStudyActivity === "function") {
    recordStudyActivity("section_opened", { tool: "notes", sectionTitle: entry.title });
  }
  if (isMobile) {
    const mobileNav = document.getElementById("mobileNav");
    const instance = window.bootstrap?.Offcanvas?.getInstance(mobileNav);
    if (instance) instance.hide();
  }
}

function showFullSummary() {
  selectedSection = "";
  document.querySelectorAll(".section-btn").forEach(button => button.classList.remove("active"));
  renderFullNotes();
}

function printableSourceListHTML() {
  const items = sourceViewerItems.length
    ? sourceViewerItems
    : [];
  if (!items.length) return "";
  return `
    <section class="print-sources">
      <h2>Uploaded Sources</h2>
      <ul>
        ${items.map(item => `
          <li>
            <strong>${escapeHTML(item.name || item.title || "Source")}</strong>
            ${item.kind ? ` · ${escapeHTML(item.kind)}` : ""}
            ${item.size ? ` · ${escapeHTML(formatBytes(item.size))}` : ""}
            ${item.originalUrl ? `<br><span>${escapeHTML(item.originalUrl)}</span>` : ""}
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function buildPrintableNotesHTML() {
  const title = storedTitle || makeHistoryTitle(fullSummary) || "Synapse Study Notes";
  const generatedAt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
  const content = markdownToHTML(fullSummary || summaryContent?.textContent || "");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHTML(title)} - Synapse Notes</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 34px;
      color: #111827;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      line-height: 1.62;
      background: #fff;
    }
    .print-cover { border-bottom: 2px solid #e6ebf7; margin-bottom: 24px; padding-bottom: 18px; }
    .print-cover h1 { font-size: 30px; line-height: 1.12; margin: 0 0 8px; }
    .print-cover p { margin: 0; color: #667085; }
    h1, h2, h3, h4 { color: #111827; break-after: avoid; page-break-after: avoid; }
    h1 { font-size: 28px; margin-top: 28px; }
    h2 { font-size: 22px; margin-top: 26px; border-bottom: 1px solid #edf1f7; padding-bottom: 6px; }
    h3 { font-size: 18px; margin-top: 22px; }
    h4 { font-size: 15px; margin-top: 18px; }
    p, li { font-size: 11.5pt; }
    ul, ol { padding-left: 22px; }
    .markdown-table-wrap { overflow: visible; margin: 16px 0; }
    .markdown-table { width: 100%; border-collapse: collapse; font-size: 10pt; page-break-inside: avoid; }
    .markdown-table th, .markdown-table td { border: 1px solid #d9e1f2; padding: 8px; vertical-align: top; }
    .markdown-table th { background: #eef4ff; text-align: left; }
    .inline-visual-card {
      display: grid;
      grid-template-columns: minmax(0, 42%) minmax(0, 1fr);
      gap: 16px;
      border: 1px solid #d9e4ff;
      border-radius: 14px;
      padding: 14px;
      margin: 18px 0;
      page-break-inside: avoid;
      background: #fbfdff;
    }
    .inline-visual-image-wrap { display: flex; align-items: center; justify-content: center; background: #f6f8ff; border-radius: 10px; overflow: hidden; }
    .inline-visual-card img { display: block; max-width: 100%; max-height: 420px; object-fit: contain; }
    .inline-visual-kicker { text-transform: uppercase; color: #5b6ff6; font-size: 9pt; font-weight: 800; letter-spacing: .08em; }
    .inline-visual-card h4 { margin: 6px 0 4px; }
    .visual-detail-grid { display: grid; gap: 8px; }
    .visual-detail-grid div { border-left: 3px solid #d7defe; padding-left: 8px; }
    .print-sources { margin: 18px 0 26px; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
    .print-sources h2 { margin-top: 0; border: 0; }
    @media print {
      body { padding: 20mm 16mm; }
      .inline-visual-card { grid-template-columns: 1fr; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <section class="print-cover">
    <h1>${escapeHTML(title)}</h1>
    <p>Exported from Synapse on ${escapeHTML(generatedAt)}. In-text source figures are included in readable form.</p>
  </section>
  ${printableSourceListHTML()}
  <main>${content}</main>
  <script>
    const waitForImages = () => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    })));
    waitForImages().then(() => setTimeout(() => window.print(), 250));
  <\/script>
</body>
</html>`;
}

function downloadNotesPDF() {
  if (!fullSummary && !summaryContent?.textContent?.trim()) {
    alert("Generate notes before exporting a PDF.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Your browser blocked the PDF export window. Allow pop-ups for this page and try again.");
    return;
  }
  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(buildPrintableNotesHTML());
  printWindow.document.close();
  if (typeof recordStudyActivity === "function") recordStudyActivity("notes_exported", {
    tool: "notes",
    label: "Exported notes as PDF"
  });
}

async function translateCurrentNotes(targetLanguage) {
  const language = String(targetLanguage || "").trim();
  if (!language) return;
  if (!fullSummary.trim()) {
    alert("Generate notes before translating.");
    if (notesTranslateLanguage) notesTranslateLanguage.value = "";
    return;
  }

  const previousLabel = notesTranslateLanguage?.options?.[notesTranslateLanguage.selectedIndex]?.textContent || "Translate";
  if (notesTranslateLanguage) notesTranslateLanguage.disabled = true;
  if (downloadNotesBtn) downloadNotesBtn.disabled = true;

  try {
    const response = await apiClient.fetch("/translate-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: fullSummary,
        sections,
        title: storedTitle,
        target_language: language
      })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.error) {
      throw new Error(data?.error || `Translation failed with status ${response.status}.`);
    }

    fullSummary = data.summary || fullSummary;
    storedTitle = data.title || storedTitle;
    sections = cleanAutoLanguageSectionTitles(hydrateSectionsFromSummary(data.sections || {}, fullSummary), fullSummary, language);
    fullSummary = ensureRenderableSummary(fullSummary, sections);
    selectedSection = "";
    renderSections();
    renderFullNotes();

    const savedEntry = saveHistoryEntry({
      title: storedTitle,
      summary: fullSummary,
      sections,
      connections: connectionsData,
      mindMap: currentMindMap,
      visualGallery: compactVisualGalleryForStorage(visualGalleryData),
      language,
      detailLevel: "translated",
      depthLabel: "Translated",
      promptMode: currentPromptMode || "professor_mode",
      promptModeLabel: currentPromptModeLabel || "",
      sourceFingerprint: currentSourceFingerprint,
      clientFingerprint: currentSourceFingerprint,
      primarySourceIdentity: currentPrimarySourceIdentity,
      sourceItems: compactSourceItemsForHistory(sourceViewerItems),
      visualGalleryCount: visualGalleryData.length,
      cached: false
    });
    if (savedEntry?.id) {
      currentHistoryId = savedEntry.id;
      safeSetLocalStorage(ACTIVE_HISTORY_KEY, savedEntry.id);
      await saveVisualGalleryAssets(savedEntry.id, savedEntry.sourceFingerprint || currentSourceFingerprint, visualGalleryData);
      await saveSourceAssets(savedEntry.id, savedEntry.sourceFingerprint || currentSourceFingerprint, sourceViewerItems);
    }
    if (typeof recordStudyActivity === "function") recordStudyActivity("notes_translated", {
      tool: "notes",
      label: `Translated notes to ${language}`,
      metadata: { language }
    });
  } catch (error) {
    console.error(error);
    alert(`Could not translate notes to ${previousLabel}: ${error.message}`);
  } finally {
    if (notesTranslateLanguage) {
      notesTranslateLanguage.disabled = false;
      notesTranslateLanguage.value = "";
    }
    if (downloadNotesBtn) downloadNotesBtn.disabled = false;
  }
}

function getToolPanelId(toolName) {
  const ids = {
    mindmap: "toolPanelMindMap",
    visualguide: "toolPanelVisualGuide",
    timeline: "toolPanelTimeline",
    masterygraph: "toolPanelMasteryGraph",
    quiz: "toolPanelQuiz",
    flashcards: "toolPanelFlashcards",
    broadcast: "toolPanelBroadcast"
  };
  return ids[toolName] || `toolPanel${toolName.charAt(0).toUpperCase()}${toolName.slice(1)}`;
}

const STUDY_TOOL_BUTTON_IDS = {
  mindmap: "toolBtnMindMap",
  visualguide: "toolBtnVisualGuide",
  timeline: "toolBtnTimeline",
  masterygraph: "toolBtnMasteryGraph",
  quiz: "toolBtnQuiz",
  flashcards: "toolBtnFlashcards",
  broadcast: "toolBtnBroadcast"
};

function switchTool(toolName, clickedBtn = null) {
  if (typeof persistStudyToolMemory === "function") persistStudyToolMemory();
  activeTool = toolName;
  if (typeof rememberActiveStudyTool === "function") rememberActiveStudyTool(toolName);
  if (typeof recordStudyActivity === "function") {
    const labels = {
      masterygraph: "Exam Readiness",
      visualguide: "Image Guide",
      broadcast: "AI Broadcast",
      timeline: "Study Path",
      flashcards: "Flashcards",
      quiz: "Quiz",
      mindmap: "Mind Map"
    };
    recordStudyActivity("tool_opened", { tool: toolName, label: `Opened ${labels[toolName] || "Study Tool"}` });
  }
  document.querySelectorAll(".tool-panel").forEach(panel => panel.classList.remove("active"));
  document.querySelectorAll(".tool-switch-btn").forEach(button => {
    if (!button.disabled) button.classList.remove("active");
  });

  const panel = document.getElementById(getToolPanelId(toolName));
  if (panel) panel.classList.add("active");

  const toolButton = clickedBtn && !clickedBtn.disabled
    ? clickedBtn
    : document.getElementById(STUDY_TOOL_BUTTON_IDS[toolName] || "");
  if (toolButton && !toolButton.disabled) toolButton.classList.add("active");

  if (toolName === "mindmap") {
    requestAnimationFrame(() => renderMindMap(currentMindMap));
  } else if (toolName === "visualguide") {
    renderVisualGuidePanel();
  } else if (toolName === "timeline") {
    renderTimelinePanel();
  } else if (toolName === "masterygraph") {
    renderMasteryGraphPanel();
  } else if (toolName === "quiz") {
    renderQuizPanel();
  } else if (toolName === "flashcards") {
    renderFlashcardPanel();
  } else if (toolName === "broadcast") {
    if (typeof renderCurrentBroadcastOrSetup === "function") renderCurrentBroadcastOrSetup();
    else renderBroadcastSetupPanel();
  }
}

const STUDY_TOOL_SETTINGS_STORAGE_KEY = "synapse.study-tool.settings.v1";
const STUDY_TOOL_SETTINGS_DEFAULTS = {
  mindmap: { layout: "tree", detail: "expanded" },
  visualguide: { language: "auto", style: "concept_board" },
  timeline: { language: "auto", pace: "balanced" },
  masterygraph: { reviewFilter: "due", priority: "weakest" }
};
const STUDY_TOOL_SETTINGS_META = {
  mindmap: {
    title: "Mind Map settings",
    description: "Choose how the knowledge tree is presented while you explore the current notes.",
    fields: [
      { key: "layout", label: "Map layout", help: "Tree keeps the full branch structure visible; compact focuses attention on the selected branch.", options: [["tree", "Knowledge tree"], ["compact", "Compact focus"]] },
      { key: "detail", label: "Detail density", help: "Choose whether points open with the full supporting detail or a lighter overview.", options: [["expanded", "Expanded detail"], ["focused", "Focused overview"]] }
    ]
  },
  visualguide: {
    title: "Image Guide settings",
    description: "Set the language and visual direction used when the guide is generated.",
    fields: [
      { key: "language", label: "Guide language", help: "The language used for labels and explanations in the generated image.", options: [["auto", "Auto-detect source language"], ["english", "English"], ["chinese", "Chinese"], ["bilingual", "Bilingual"]] },
      { key: "style", label: "Visual direction", help: "Choose the visual balance for the poster layout.", options: [["concept_board", "Concept board"], ["exam_revision", "Exam revision sheet"], ["process_story", "Process story"]] }
    ]
  },
  timeline: {
    title: "Study Path settings",
    description: "Tune the pace and language of the next guided revision sequence.",
    fields: [
      { key: "language", label: "Path language", help: "The language used for tasks, prompts, and mastery checks.", options: [["auto", "Auto-detect source language"], ["english", "English"], ["chinese", "Chinese"], ["bilingual", "Bilingual"]] },
      { key: "pace", label: "Revision pace", help: "A quick path is concise; a deep path adds more practice and explanation checkpoints.", options: [["quick", "Quick review"], ["balanced", "Balanced"], ["deep", "Deep study"]] }
    ]
  },
  masterygraph: {
    title: "Exam Readiness settings",
    description: "Choose which review queue opens first and how the readiness view prioritises topics.",
    fields: [
      { key: "reviewFilter", label: "Opening review queue", help: "This filter is selected when Exam Readiness opens.", options: [["due", "Due today"], ["missed", "Only missed"], ["all", "All topics"]] },
      { key: "priority", label: "Review priority", help: "Weakest-first surfaces the topics that need attention earliest.", options: [["weakest", "Weakest topics first"], ["balanced", "Balanced coverage"], ["recent", "Recently studied first"]] }
    ]
  }
};
let studyToolSettingsDraft = null;
let studyToolSettingsMemory = {};

function readStudyToolSettings() {
  const saved = safeReadJSONStorage(STUDY_TOOL_SETTINGS_STORAGE_KEY, {});
  const source = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  return Object.fromEntries(Object.entries(STUDY_TOOL_SETTINGS_DEFAULTS).map(([tool, defaults]) => ({
    [tool]: {
      ...defaults,
      ...(source[tool] && typeof source[tool] === "object" ? source[tool] : {}),
      ...(studyToolSettingsMemory[tool] && typeof studyToolSettingsMemory[tool] === "object" ? studyToolSettingsMemory[tool] : {})
    }
  })));
}

function getStudyToolSettings(toolName = "") {
  return readStudyToolSettings()[toolName] || {};
}

function openStudyToolSettingsModal(toolName = "") {
  const tool = String(toolName || "").trim().toLowerCase();
  if (tool === "quiz") {
    openQuizSettingsModal();
    return;
  }
  if (tool === "flashcards") {
    openFlashcardSettingsModal();
    return;
  }
  if (tool === "broadcast") {
    openAiBroadcastSetup();
    return;
  }
  const meta = STUDY_TOOL_SETTINGS_META[tool];
  if (!meta) return;
  studyToolSettingsDraft = { tool, values: { ...getStudyToolSettings(tool) } };
  document.getElementById("studyToolSettingsOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "studyToolSettingsOverlay";
  overlay.className = "visual-modal visual-modal-overlay study-tool-settings-overlay";
  overlay.innerHTML = `
    <div class="visual-modal-content settings-pattern-modal study-tool-settings-modal" role="dialog" aria-modal="true" aria-labelledby="studyToolSettingsTitle">
      <button class="visual-modal-close" type="button" aria-label="Close settings" onclick="closeStudyToolSettingsModal()"><i class="bi bi-x-lg"></i></button>
      <div class="settings-pattern-header">
        <span class="study-tool-settings-kicker">Study Tools</span>
        <h3 id="studyToolSettingsTitle">${escapeHTML(meta.title)}</h3>
        <p class="text-secondary">${escapeHTML(meta.description)}</p>
      </div>
      <div class="settings-pattern-body study-tool-settings-fields">
        ${meta.fields.map(field => `
          <label class="study-tool-settings-field" for="studyToolSetting-${escapeAttr(field.key)}">
            <span>${escapeHTML(field.label)}</span>
            <select id="studyToolSetting-${escapeAttr(field.key)}" class="form-select" onchange="updateStudyToolSettingDraft('${escapeAttr(field.key)}', this.value)">
              ${field.options.map(([value, label]) => `<option value="${escapeAttr(value)}" ${studyToolSettingsDraft.values[field.key] === value ? "selected" : ""}>${escapeHTML(label)}</option>`).join("")}
            </select>
            <small>${escapeHTML(field.help)}</small>
          </label>
        `).join("")}
      </div>
      <div class="settings-pattern-footer study-tool-settings-actions">
        <button class="btn btn-outline-secondary" type="button" onclick="closeStudyToolSettingsModal()">Cancel</button>
        <button class="btn btn-primary" type="button" onclick="saveStudyToolSettingsModal()"><i class="bi bi-check2 me-1"></i>Save settings</button>
      </div>
    </div>
  `;
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeStudyToolSettingsModal();
  });
  document.body.appendChild(overlay);
}

function updateStudyToolSettingDraft(key, value) {
  if (!studyToolSettingsDraft) return;
  studyToolSettingsDraft.values[String(key || "")] = String(value || "");
}

function closeStudyToolSettingsModal() {
  document.getElementById("studyToolSettingsOverlay")?.remove();
  studyToolSettingsDraft = null;
}

function saveStudyToolSettingsModal() {
  if (!studyToolSettingsDraft) return;
  const overlay = document.getElementById("studyToolSettingsOverlay");
  if (overlay) {
    const meta = STUDY_TOOL_SETTINGS_META[studyToolSettingsDraft.tool];
    meta?.fields.forEach(field => {
      const input = overlay.querySelector(`#studyToolSetting-${CSS.escape(field.key)}`);
      if (input) studyToolSettingsDraft.values[field.key] = String(input.value || "");
    });
  }
  const saved = readStudyToolSettings();
  saved[studyToolSettingsDraft.tool] = { ...saved[studyToolSettingsDraft.tool], ...studyToolSettingsDraft.values };
  studyToolSettingsMemory[studyToolSettingsDraft.tool] = { ...saved[studyToolSettingsDraft.tool] };
  safeWriteJSONStorage(STUDY_TOOL_SETTINGS_STORAGE_KEY, saved);
  const { tool } = studyToolSettingsDraft;
  closeStudyToolSettingsModal();
  if (tool === "mindmap") {
    requestAnimationFrame(() => renderMindMap(currentMindMap));
  } else if (tool === "timeline") {
    renderTimelinePanel();
  } else if (tool === "masterygraph") {
    activeMemoryFilter = saved.masterygraph.reviewFilter || "due";
    renderMasteryGraphPanel();
  } else if (tool === "visualguide") {
    renderVisualGuidePanel();
  }
}

function cloneQuizSettings(settings) {
  return JSON.parse(JSON.stringify(settings || QUIZ_DEFAULT_SETTINGS));
}

function loadQuizSettings() {
  const saved = safeReadJSONStorage(QUIZ_STORAGE_KEY, null);
  return normalizeQuizSettings(saved || QUIZ_DEFAULT_SETTINGS);
}

function normalizeQuizType(type) {
  return QUIZ_TYPE_OPTIONS.some(option => option.value === type) ? type : "single_choice";
}

function normalizeQuizLanguage(language) {
  return QUIZ_LANGUAGE_OPTIONS.some(option => option.value === language) ? language : "multi_language";
}

function getQuizLanguageLabel(language) {
  return QUIZ_LANGUAGE_OPTIONS.find(option => option.value === normalizeQuizLanguage(language))?.label || "Multi-language";
}

function cloneFlashcardSettings(settings) {
  return JSON.parse(JSON.stringify(settings || FLASHCARD_DEFAULT_SETTINGS));
}

function normalizeFlashcardLanguage(language) {
  return QUIZ_LANGUAGE_OPTIONS.some(option => option.value === language) ? language : "english";
}

function normalizeFlashcardSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : FLASHCARD_DEFAULT_SETTINGS;
  const countMode = ["auto", "30", "60", "custom"].includes(String(source.countMode)) ? String(source.countMode) : "auto";
  return {
    preferredLanguage: normalizeFlashcardLanguage(source.preferredLanguage),
    countMode,
    customCount: Math.max(1, Math.min(Number.parseInt(source.customCount, 10) || 20, 80))
  };
}

function loadFlashcardSettings() {
  const saved = safeReadJSONStorage(FLASHCARD_SETTINGS_KEY, null);
  return normalizeFlashcardSettings(saved || FLASHCARD_DEFAULT_SETTINGS);
}

function clampQuizNumber(value, fallback = 1) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(number, 40));
}

function normalizeQuizSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : QUIZ_DEFAULT_SETTINGS;
  const rows = Array.isArray(source.questionTypes) && source.questionTypes.length
    ? source.questionTypes
    : QUIZ_DEFAULT_SETTINGS.questionTypes;
  const questionTypes = rows.map(row => ({
    type: normalizeQuizType(row.type),
    count: clampQuizNumber(row.count, 1)
  }));
  const totalQuestions = clampQuizNumber(source.totalQuestions || questionTypes.reduce((sum, row) => sum + row.count, 0), 6);
  return {
    examMode: Boolean(source.examMode),
    preferredLanguage: normalizeQuizLanguage(source.preferredLanguage),
    totalQuestions,
    questionTypes
  };
}

function resetQuizState() {
  currentQuiz = null;
  quizHistory = [];
  quizAnswers = {};
  quizRevealedAnswers = new Set();
  quizReport = null;
  quizError = "";
  isQuizGenerating = false;
  activeQuizQuestionIndex = 0;
  activeQuizHistoryId = "";
  renderQuizPanel();
}

function normalizeTimelineType(value) {
  const clean = String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (TIMELINE_TYPE_OPTIONS.some(option => option.value === clean)) return clean;
  if (["lecture_flow", "flow", "overview", "sequence"].includes(clean)) return "warm_up";
  if (["concept", "definition", "method", "mechanism"].includes(clean)) return "learn";
  if (["evidence", "data", "study", "experiment", "figure", "example", "case", "application"].includes(clean)) return "apply";
  if (["exam", "assessment", "test"].includes(clean)) return "check";
  if (["revision", "review", "mistake", "common_mistake"].includes(clean)) return "revise";
  return "learn";
}

function getTimelineTypeLabel(value) {
  const type = normalizeTimelineType(value);
  return TIMELINE_TYPE_OPTIONS.find(option => option.value === type)?.label || "Concepts";
}

function normalizeStudyPathQuestionType(value) {
  const clean = String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (STUDY_PATH_QUESTION_TYPE_OPTIONS.some(option => option.value === clean)) return clean;
  if (["mcq", "choice", "single", "single_choice_question"].includes(clean)) return "single_choice";
  if (["multi", "multiple", "multiple_choice_question"].includes(clean)) return "multiple_choice";
  if (["tf", "truefalse", "true_or_false", "true_false_question"].includes(clean)) return "true_false";
  if (["short", "short_response", "open_response", "open_ended"].includes(clean)) return "short_answer";
  if (["case", "application", "scenario"].includes(clean)) return "case_analysis";
  if (["essay", "outline", "exam_outline"].includes(clean)) return "essay_outline";
  if (["diagram", "figure", "visual", "graph", "chart"].includes(clean)) return "diagram_prompt";
  if (["contrast", "compare_contrast", "comparison"].includes(clean)) return "compare";
  return "short_answer";
}

function getStudyPathQuestionTypeMeta(value) {
  const type = normalizeStudyPathQuestionType(value);
  return STUDY_PATH_QUESTION_TYPE_OPTIONS.find(option => option.value === type) || STUDY_PATH_QUESTION_TYPE_OPTIONS[0];
}

function normalizeStudyPathQuestionOptions(value) {
  return Array.isArray(value)
    ? value.map(option => String(option || "").trim()).filter(Boolean).slice(0, 6)
    : [];
}

function normalizeStudyPathCorrectIndexes(value, options) {
  const rawValues = Array.isArray(value) ? value : (value == null ? [] : [value]);
  const indexes = [];
  rawValues.forEach(raw => {
    let index = null;
    if (Number.isInteger(raw)) {
      index = raw;
    } else {
      const text = String(raw || "").trim();
      if (/^\d+$/.test(text)) {
        index = Number.parseInt(text, 10);
      } else if (/^[A-F]$/i.test(text)) {
        index = text.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
      } else {
        index = options.findIndex(option => option.toLowerCase() === text.toLowerCase());
      }
    }
    if (Number.isInteger(index) && index >= 0 && index < options.length && !indexes.includes(index)) {
      indexes.push(index);
    }
  });
  return indexes;
}

function normalizeStudyPathBoolean(value) {
  if (typeof value === "boolean") return value;
  const text = String(value || "").trim().toLowerCase();
  if (["true", "yes", "correct", "right", "对", "正确", "是"].includes(text)) return true;
  if (["false", "no", "incorrect", "wrong", "错", "错误", "否"].includes(text)) return false;
  return null;
}

function normalizeStudyPathPracticeQuestion(raw, event, index) {
  const fallbackPrompt = String(
    event?.active_prompt || event?.activePrompt || event?.recall_prompt || event?.recallPrompt ||
    event?.task || event?.summary || `Answer one short question about checkpoint ${index + 1}.`
  ).trim();
  const source = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw
    : { prompt: typeof raw === "string" ? raw : fallbackPrompt };
  const type = normalizeStudyPathQuestionType(source.type || source.question_type || source.questionType || event?.question_type);
  let options = normalizeStudyPathQuestionOptions(source.options || source.choices);
  if (type === "true_false" && options.length < 2) options = ["True", "False"];
  const prompt = String(source.prompt || source.question || source.title || fallbackPrompt).trim();
  const correctOptionIndexes = normalizeStudyPathCorrectIndexes(
    source.correct_option_indexes ?? source.correctOptionIndexes ?? source.correct_indexes ?? source.answer_index ?? source.answer,
    options
  );
  const correctBoolean = normalizeStudyPathBoolean(source.correct_boolean ?? source.correctBoolean ?? source.answer);
  return {
    type,
    prompt,
    options,
    correctOptionIndexes,
    correctBoolean,
    expectedAnswer: String(source.expected_answer || source.expectedAnswer || source.answer_guide || source.answerGuide || "").trim(),
    explanation: String(source.explanation || source.rationale || "").trim(),
    sourceReference: String(source.source_reference || source.sourceReference || event?.source_reference || event?.sourceReference || "").trim()
  };
}

function getTimelineNoteKey() {
  if (currentHistoryId) return `history:${currentHistoryId}`;
  if (currentSourceFingerprint) return `fingerprint:${currentSourceFingerprint}`;
  return "";
}

function getTimelineStore() {
  const parsed = safeReadJSONStorage(TIMELINE_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function setTimelineStore(store) {
  return safeWriteJSONStorage(TIMELINE_STORAGE_KEY, store || {});
}

function normalizeTimelineEvent(event, index) {
  const title = String(event?.title || event?.label || `Checkpoint ${index + 1}`).trim();
  const estimatedMinutes = Math.max(3, Math.min(Number.parseInt(event?.estimated_minutes || event?.estimatedMinutes || event?.minutes, 10) || 8, 60));
  return {
    id: event?.id || `tl-${index + 1}`,
    order: Number.isFinite(Number(event?.order)) ? Number(event.order) : index + 1,
    marker: String(event?.marker || event?.time || event?.step || `Task ${index + 1}`).trim(),
    type: normalizeTimelineType(event?.type),
    title,
    section: String(event?.section || "").trim(),
    summary: String(event?.summary || event?.what_happens || "").trim(),
    detail: String(event?.detail || event?.explanation || event?.why || "").trim(),
    task: String(event?.task || event?.action || event?.study_task || event?.studyTask || "").trim(),
    activePrompt: String(event?.active_prompt || event?.activePrompt || event?.recall_prompt || event?.recallPrompt || "").trim(),
    practiceQuestion: normalizeStudyPathPracticeQuestion(event?.practice_question || event?.practiceQuestion || event?.question, event, index),
    deliverable: String(event?.deliverable || event?.output || "").trim(),
    masteryCheck: String(event?.mastery_check || event?.masteryCheck || event?.checkpoint || "").trim(),
    estimatedMinutes,
    priority: String(event?.priority || "medium").trim().toLowerCase(),
    evidence: String(event?.evidence || event?.source_evidence || "").trim(),
    whyItMatters: String(event?.why_it_matters || event?.whyItMatters || "").trim(),
    misconception: String(event?.misconception || event?.common_mistake || "").trim(),
    examUse: String(event?.exam_use || event?.examUse || "").trim(),
    sourceReference: String(event?.source_reference || event?.sourceReference || "").trim(),
    relatedTerms: Array.isArray(event?.related_terms || event?.relatedTerms)
      ? (event.related_terms || event.relatedTerms).map(term => String(term).trim()).filter(Boolean).slice(0, 6)
      : []
  };
}

function normalizeTimeline(data) {
  const events = Array.isArray(data?.events) ? data.events : [];
  const normalizedEvents = events
    .map(normalizeTimelineEvent)
    .filter(event => event.title && (event.summary || event.detail || event.evidence))
    .sort((a, b) => a.order - b.order)
    .slice(0, 18);
  return {
    title: String(data?.title || `${storedTitle || "Study"} Timeline`).trim(),
    summary: String(data?.summary || "").trim(),
    generatedAt: data?.generated_at || data?.generatedAt || new Date().toISOString(),
    events: normalizedEvents
  };
}

function persistTimelineForCurrentNote() {
  const key = getTimelineNoteKey();
  if (!key || !currentTimeline || !Array.isArray(currentTimeline.events) || !currentTimeline.events.length) return;
  const store = getTimelineStore();
  store[key] = {
    title: storedTitle,
    updatedAt: new Date().toISOString(),
    timeline: currentTimeline,
    completedIds: Array.from(timelineCompletedIds),
    practiceAnswers: timelinePracticeAnswers,
    completionCelebrated: timelineCompletionCelebrated
  };
  setTimelineStore(store);
}

function loadTimelineForCurrentNote() {
  const store = getTimelineStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : ""
  ].filter(Boolean);
  const record = keys.map(key => store[key]).find(item => item && item.timeline);
  currentTimeline = record ? normalizeTimeline(record.timeline) : null;
  timelineCompletedIds = new Set(Array.isArray(record?.completedIds) ? record.completedIds.map(id => String(id)) : []);
  timelinePracticeAnswers = record?.practiceAnswers && typeof record.practiceAnswers === "object" && !Array.isArray(record.practiceAnswers)
    ? record.practiceAnswers
    : {};
  Object.values(timelinePracticeAnswers).forEach(state => {
    if (state && state.status === "checking") state.status = "idle";
  });
  timelineCompletionCelebrated = Boolean(record?.completionCelebrated);
  activeTimelineIndex = 0;
  activeTimelineFilter = "all";
  timelineError = "";
}

function deleteTimelinePath(historyId, sourceFingerprint = "") {
  const store = getTimelineStore();
  delete store[`history:${historyId}`];
  if (sourceFingerprint) delete store[`fingerprint:${sourceFingerprint}`];
  setTimelineStore(store);
}

function getTimelineEventsForFilter() {
  const events = currentTimeline?.events || [];
  if (activeTimelineFilter === "all") return events;
  return events.filter(event => event.type === activeTimelineFilter);
}

function renderTimelinePanel() {
  const panel = document.getElementById("timelinePanelContent");
  if (!panel) return;
  const hasNotes = Boolean(fullSummary && fullSummary.trim());

  if (isTimelineGenerating) {
    panel.innerHTML = `
      <div class="timeline-loading-card">
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <div>
          <strong>Building study path...</strong>
          <p>Synapse is turning the notes into concrete learning tasks, short practice questions, and revision checkpoints.</p>
        </div>
      </div>
    `;
    return;
  }

  if (timelineError) {
    panel.innerHTML = `
      <div class="alert alert-danger">
        <strong>Study path generation failed.</strong><br>${escapeHTML(timelineError)}
      </div>
      ${renderTimelineLaunchCard(hasNotes)}
    `;
    return;
  }

  if (!currentTimeline || !Array.isArray(currentTimeline.events) || !currentTimeline.events.length) {
    panel.innerHTML = renderTimelineLaunchCard(hasNotes);
    return;
  }

  panel.innerHTML = renderTimeline();
  renderMath();
}

function renderTimelineLaunchCard(hasNotes) {
  return renderStudyToolLaunch({
    tool: "timeline",
    iconClass: "bi-signpost-split",
    title: "Create a study path",
    description: hasNotes
      ? "Turn the current notes into a guided sequence of learning tasks, short questions, and revision checks."
      : "Generate notes first, then build an interactive study path from them.",
    action: "generateTimeline(false)",
    actionLabel: "Generate study path",
    hasNotes,
    kicker: "Guided revision sequence"
  });
}

function getTimelineEventId(eventOrId) {
  if (eventOrId && typeof eventOrId === "object") return String(eventOrId.id || "");
  return String(eventOrId || "");
}

function isTimelineEventCompleted(eventOrId) {
  const id = getTimelineEventId(eventOrId);
  return Boolean(id && timelineCompletedIds.has(id));
}

function getTimelineCompletionStats() {
  const events = currentTimeline?.events || [];
  const total = events.length;
  const completed = events.filter(event => isTimelineEventCompleted(event.id)).length;
  return {
    total,
    completed,
    complete: total > 0 && completed >= total
  };
}

function maybeCelebrateTimelineCompletion() {
  const stats = getTimelineCompletionStats();
  if (!stats.complete || timelineCompletionCelebrated) return;
  timelineCompletionCelebrated = true;
  persistTimelineForCurrentNote();
  showStudyPathCelebration(stats.total);
}

function showStudyPathCelebration(totalTasks = 0) {
  const existing = document.querySelector(".study-path-celebration-overlay");
  if (existing) existing.remove();
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const colors = ["#5f7cff", "#8f63ff", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];
  const pieces = reducedMotion ? "" : Array.from({ length: 56 }, (_, i) => {
    const color = colors[i % colors.length];
    const left = (i * 23) % 100;
    const delay = (i % 14) * 0.07;
    const duration = 2.4 + (i % 7) * 0.16;
    const drift = ((i % 9) - 4) * 24;
    return `<span class="study-path-confetti-piece" style="--left:${left}%;--delay:${delay}s;--duration:${duration}s;--drift:${drift}px;--color:${color};"></span>`;
  }).join("");
  const overlay = document.createElement("div");
  overlay.className = "study-path-celebration-overlay";
  overlay.innerHTML = `
    ${pieces}
    <div class="study-path-celebration-card" role="status" aria-live="polite">
      <span class="study-path-celebration-kicker">Study path complete</span>
      <strong>Great work. All ${totalTasks || "the"} tasks are done.</strong>
      <p>You finished this guided pass. Try Quiz, Flashcards, or the tutor next for a tougher check.</p>
      <button type="button" onclick="closeStudyPathCelebration()">Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
  window.setTimeout(() => closeStudyPathCelebration(), reducedMotion ? 3500 : 5200);
}

function closeStudyPathCelebration() {
  const overlay = document.querySelector(".study-path-celebration-overlay");
  if (!overlay) return;
  overlay.classList.remove("show");
  window.setTimeout(() => overlay.remove(), 220);
}
window.closeStudyPathCelebration = closeStudyPathCelebration;
