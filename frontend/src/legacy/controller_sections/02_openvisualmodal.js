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
  const overlay = document.createElement("div");
  overlay.className = "visual-modal";
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
  overlay.addEventListener("click", event => {
    if (event.target === overlay || event.target.closest(".visual-modal-close")) overlay.remove();
  });
  document.body.appendChild(overlay);
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

