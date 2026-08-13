function getVisualGuideNoteKey() {
  if (currentHistoryId) return `history:${currentHistoryId}`;
  if (currentSourceFingerprint) return `fingerprint:${currentSourceFingerprint}`;
  return "";
}

function getVisualGuideStore() {
  const parsed = safeReadJSONStorage(VISUAL_GUIDE_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function setVisualGuideStore(store) {
  return safeWriteJSONStorage(VISUAL_GUIDE_STORAGE_KEY, store || {});
}

function resetVisualGuideState() {
  currentVisualGuide = null;
  visualGuideError = "";
  isVisualGuideGenerating = false;
  renderVisualGuidePanel();
}

function deleteVisualGuide(historyId, sourceFingerprint = "") {
  const store = getVisualGuideStore();
  delete store[`history:${historyId}`];
  if (sourceFingerprint) delete store[`fingerprint:${sourceFingerprint}`];
  setVisualGuideStore(store);
}

function normalizeVisualGuideList(value, limit = 6) {
  const items = Array.isArray(value)
    ? value
    : (typeof value === "string" ? value.split(/\n+|;\s*/) : []);
  return items.map(item => String(item || "").trim()).filter(Boolean).slice(0, limit);
}

function normalizeVisualGuideType(value) {
  const type = String(value || "concept").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return ["concept", "process", "comparison", "evidence", "formula", "timeline", "case", "source"].includes(type)
    ? type
    : "concept";
}

function normalizeVisualImageGuide(data) {
  const source = data && typeof data === "object" ? data : {};
  const imageDataUrl = String(source.image_data_url || source.imageDataUrl || source.data_url || "").trim();
  const imageProcessing = source.image_processing || source.imageProcessing || {};
  return {
    title: cleanVisualGuideGeneratedText(source.title || storedTitle || "Visual Image Guide"),
    imageDataUrl,
    model: cleanVisualGuideGeneratedText(source.model || "gpt-image-1.5"),
    requestedModel: cleanVisualGuideGeneratedText(source.requested_model || source.requestedModel || ""),
    size: cleanVisualGuideGeneratedText(source.size || ""),
    quality: cleanVisualGuideGeneratedText(source.quality || ""),
    styleVersion: cleanVisualGuideGeneratedText(source.style_version || source.styleVersion || ""),
    renderingNote: cleanVisualGuideGeneratedText(source.rendering_note || source.renderingNote || ""),
    blueprint: source.blueprint || null,
    imageProcessing: imageProcessing && typeof imageProcessing === "object" ? imageProcessing : {},
    created: source.created || new Date().toISOString(),
  };
}

const VISUAL_GUIDE_HEADING_ONLY_PATTERN = /^(?:#{1,4}\s*)?(?:Learning Question|Source and Argument Map|Core Notes|Key Terms(?: and Mechanisms)?|Concepts Explained(?: With Source Evidence)?|Reading the Source Evidence|Worked Examples(?: and Evidence)?|Source Evidence(?:\s*\/\s*Example Matrix)?|Evidence Matrix|Exam Strategy(?: and Common Mistakes)?|Revision Checklist)\s*$/i;

function cleanVisualGuideGeneratedText(value) {
  return String(value || "")
    .replace(/\btotaldeposits\b/gi, "total deposits")
    .replace(/\bpotential(\d+(?:\.\d+)?\s*[KMBT])\b/gi, "potential $$$1")
    .replace(/\b(\d+(?:\.\d+)?)\s*([KMBT])\b/g, "$1$2")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function isVisualGuideHeadingOnly(value) {
  return VISUAL_GUIDE_HEADING_ONLY_PATTERN.test(cleanVisualGuideGeneratedText(value));
}

function visualGuideWorkedExampleSeed() {
  const sectionEntries = Object.entries(sections || {});
  const workedEntry = sectionEntries.find(([title]) => /worked examples?|example matrix|source evidence/i.test(title));
  const sourceText = cleanVisualGuideGeneratedText(
    workedEntry?.[1]
    || sectionEntries.map(([title, content]) => `${title}\n${content}`).join("\n")
    || fullSummary
  );
  if (!sourceText || !/(worked example|examples? from source|source exercise|if\s+[A-Z]|D\s*=|V\s+fell|r\s*=|≈|%|→)/i.test(sourceText)) {
    return null;
  }
  const lines = sourceText
    .split(/\n+/)
    .map(line => cleanVisualGuideGeneratedText(line.replace(/^[-*]\s+/, "").replace(/^#{1,4}\s+/, "")))
    .filter(line => line && !isVisualGuideHeadingOnly(line) && line.length >= 18 && line.length <= 180);
  const exampleLines = lines.filter(line => /(example|exercise|if\s+[A-Z]|D\s*=|V\s+fell|r\s*=|≈|%|→|\d+\s*[+\-*/]\s*\d+)/i.test(line));
  const body = exampleLines[0] || lines[0] || "";
  if (!body) return null;
  return {
    id: "vg-panel-worked-example",
    kicker: "Worked example",
    title: "Worked Example",
    body: shorten(cleanVisualGuideGeneratedText(body), 220),
    keyPoints: (exampleLines.length ? exampleLines.slice(1, 3) : lines.slice(1, 3)).map(line => shorten(line, 110)),
    sourceEvidence: workedEntry ? "Worked/example section in generated notes" : "Generated notes examples",
    visualType: "case",
    visualPrompt: "Show a small worked calculation card with givens, operation arrow, and result.",
    formula: "",
    sourceRefs: workedEntry ? [cleanVisualGuideGeneratedText(workedEntry[0])] : [],
    sourceFigureIndexes: [],
    webImageIndexes: [],
    accent: ""
  };
}

function normalizeVisualGuide(data) {
  const source = data && typeof data === "object" ? data : {};
  const panels = Array.isArray(source.panels) ? source.panels : [];
  const rawSourceMap = Array.isArray(source.source_map)
    ? source.source_map
    : (Array.isArray(source.sourceMap) ? source.sourceMap : []);
  const normalizedPanels = panels.map((panel, index) => {
    const item = panel && typeof panel === "object" ? panel : {};
    const sourceEvidence = cleanVisualGuideGeneratedText(item.source_evidence || item.sourceEvidence || item.evidence || "");
    return {
      id: item.id || `vg-panel-${index + 1}`,
      kicker: cleanVisualGuideGeneratedText(item.kicker || item.label || `Part ${index + 1}`),
      title: cleanVisualGuideGeneratedText(item.title || `Key idea ${index + 1}`),
      body: cleanVisualGuideGeneratedText(item.body || item.explanation || ""),
      keyPoints: normalizeVisualGuideList(item.key_points || item.keyPoints || item.points, 5).map(cleanVisualGuideGeneratedText),
      sourceEvidence: isVisualGuideHeadingOnly(sourceEvidence) ? "" : sourceEvidence,
      visualType: normalizeVisualGuideType(item.visual_type || item.visualType || item.type),
      visualPrompt: cleanVisualGuideGeneratedText(item.visual_prompt || item.visualPrompt || item.visual || ""),
      formula: cleanVisualGuideGeneratedText(item.formula || ""),
      sourceRefs: normalizeVisualGuideList(item.source_refs || item.sourceRefs || item.source_references, 5).map(cleanVisualGuideGeneratedText),
      sourceFigureIndexes: normalizeVisualGuideList(item.source_figure_indexes || item.sourceFigureIndexes || item.figure_indexes, 4)
        .map(value => Number.parseInt(value, 10))
        .filter(value => Number.isInteger(value) && value >= 0),
      webImageIndexes: normalizeVisualGuideList(item.web_image_indexes || item.webImageIndexes || item.internet_image_indexes, 3)
        .map(value => Number.parseInt(value, 10))
        .filter(value => Number.isInteger(value) && value >= 0),
      accent: item.accent || ""
    };
  }).filter(panel => panel.title || panel.body || panel.keyPoints.length || panel.sourceEvidence);

  if (normalizedPanels.length && sanitizeLearningFigures(visualGalleryData).length) {
    const usedFigures = new Set(normalizedPanels.flatMap(panel => panel.sourceFigureIndexes || []));
    const fallbackFigures = sanitizeLearningFigures(visualGalleryData)
      .map(item => Number.parseInt(item.index, 10))
      .filter(index => Number.isInteger(index) && !usedFigures.has(index))
      .slice(0, 4);
    normalizedPanels.forEach(panel => {
      if (!fallbackFigures.length || (panel.sourceFigureIndexes || []).length) return;
      panel.sourceFigureIndexes = [fallbackFigures.shift()];
    });
  }

  const workedExamplePanel = visualGuideWorkedExampleSeed();
  const hasWorkedExamplePanel = normalizedPanels.some(panel => /worked examples?/i.test(panel.title || ""));
  if (workedExamplePanel && !hasWorkedExamplePanel) {
    normalizedPanels.push(workedExamplePanel);
  }

  return {
    title: source.title || `${storedTitle || "Study"} Visual Guide`,
    subtitle: source.subtitle || "",
    thesis: source.thesis || source.overview || "",
    coverageNote: source.coverage_note || source.coverageNote || "",
    flow: (Array.isArray(source.flow) ? source.flow : []).map((item, index) => ({
      label: item?.label || `Step ${index + 1}`,
      text: item?.text || item?.explanation || ""
    })).filter(item => item.label || item.text).slice(0, 8),
    panels: normalizedPanels,
    sourceMap: rawSourceMap.map((item, index) => ({
      source: item?.source || `Source ${index + 1}`,
      role: item?.role || "",
      evidence: item?.evidence || ""
    })).filter(item => item.source || item.role || item.evidence).slice(0, 16),
    reviewPrompts: normalizeVisualGuideList(source.review_prompts || source.reviewPrompts, 6),
    webImages: (Array.isArray(source.web_images) ? source.web_images : (Array.isArray(source.webImages) ? source.webImages : []))
      .map((item, index) => ({
        index: Number.isInteger(Number.parseInt(item?.index, 10)) ? Number.parseInt(item.index, 10) : index,
        title: item?.title || item?.query || "Reference image",
        url: item?.url || "",
        sourceUrl: item?.source_url || item?.sourceUrl || "",
        provider: item?.provider || "Web image",
        credit: item?.credit || "",
        license: item?.license || "",
        query: item?.query || ""
      }))
      .filter(item => item.url)
      .slice(0, 6),
    generatedAt: source.generatedAt || new Date().toISOString()
  };
}

function persistVisualGuideForCurrentNote() {
  const key = getVisualGuideNoteKey();
  if (!key || !currentVisualGuide) return;
  const store = getVisualGuideStore();
  store[key] = currentVisualGuide;
  setVisualGuideStore(store);
}

function loadVisualGuideForCurrentNote() {
  const store = getVisualGuideStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : ""
  ].filter(Boolean);
  const saved = keys.map(key => store[key]).find(item => item && typeof item === "object");
  const normalized = saved ? normalizeVisualImageGuide(saved) : null;
  currentVisualGuide = normalized?.styleVersion === VISUAL_IMAGE_GUIDE_STYLE_VERSION ? normalized : null;
  visualGuideError = "";
  isVisualGuideGenerating = false;
  renderVisualGuidePanel();
}

function setupVisualGuideTool() {
  const switcher = document.querySelector(".tool-switcher");
  if (switcher && !document.getElementById("toolBtnVisualGuide")) {
    const mindButton = document.getElementById("toolBtnMindMap");
    const buttonHTML = `
      <button id="toolBtnVisualGuide" class="tool-switch-btn" type="button" onclick="switchTool('visualguide', this)">
        <i class="bi bi-image me-1"></i>Image Guide
      </button>
    `;
    if (mindButton) {
      mindButton.insertAdjacentHTML("afterend", buttonHTML);
    } else {
      switcher.insertAdjacentHTML("afterbegin", buttonHTML);
    }
  }

  const studyToolsCard = document.querySelector(".study-tools-card");
  if (studyToolsCard && !document.getElementById("toolPanelVisualGuide")) {
    const mindPanel = document.getElementById("toolPanelMindMap");
    const panelHTML = `
      <div id="toolPanelVisualGuide" class="tool-panel">
        <div class="tool-panel-head d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h3>Visual Image Guide</h3>
            <p>Generate one finished image poster from the current notes.</p>
          </div>
          <div class="tool-panel-actions">
            <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="generateVisualGuide(true)">
              <i class="bi bi-image me-1"></i>Generate image
            </button>
            <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="openStudyToolSettingsModal('visualguide')">
              <i class="bi bi-sliders me-1"></i>Image guide settings
            </button>
          </div>
        </div>
        <div id="visualGuidePanelContent"></div>
      </div>
    `;
    if (mindPanel) {
      mindPanel.insertAdjacentHTML("afterend", panelHTML);
    } else {
      studyToolsCard.insertAdjacentHTML("beforeend", panelHTML);
    }
  }

  loadVisualGuideForCurrentNote();
  renderVisualGuidePanel();
}

function visualGuideFigureRequestItems() {
  return sanitizeLearningFigures(visualGalleryData).map((item, index) => ({
    index,
    title: item.title || "",
    caption: item.caption || "",
    what_shows: item.what_shows || "",
    argument_supported: item.argument_supported || "",
    how_to_read: item.how_to_read || "",
    exam_use: item.exam_use || "",
    visual_kind: item.visual_kind || "",
    location: item.location || "",
    source_title: item.source_title || ""
  }));
}

function visualGuideSourceRequestItems() {
  return (sourceViewerItems || []).map((item, index) => ({
    index: index + 1,
    display_name: item.displayName || item.name || item.title || `Source ${index + 1}`,
    title_candidate: item.title || item.displayName || "",
    source_identity: item.sourceIdentity || "",
    url: item.originalUrl || item.url || "",
    text_excerpt: item.content ? String(item.content).slice(0, 5000) : ""
  })).slice(0, 16);
}

function renderVisualGuidePanel() {
  const panel = document.getElementById("visualGuidePanelContent");
  if (!panel) return;

  if (isVisualGuideGenerating) {
    panel.innerHTML = `
      <div class="visual-guide-loading">
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <div>
          <strong>Building visual guide...</strong>
          <p>Synapse is building a compact blueprint, generating the image, then locally sharpening the final PNG.</p>
        </div>
      </div>
    `;
    return;
  }

  if (visualGuideError) {
    panel.innerHTML = `
      <div class="alert alert-danger">
        <strong>Visual image guide generation failed.</strong><br>${escapeHTML(visualGuideError)}
      </div>
      ${renderVisualGuideLaunch()}
    `;
    return;
  }

  panel.innerHTML = currentVisualGuide ? renderVisualImageGuide(currentVisualGuide) : renderVisualGuideLaunch();
  renderMath();
}
