function renderVisualGuideLaunch() {
  const hasNotes = Boolean(fullSummary && fullSummary.trim());
  return renderStudyToolLaunch({
    tool: "visualguide",
    iconClass: "bi-image",
    title: "Create an image guide",
    description: hasNotes
      ? "Turn the current notes into a clear visual poster with concepts, examples, and source evidence."
      : "Generate notes first, then create a visual image guide.",
    action: "generateVisualGuide(true)",
    actionLabel: "Generate image guide",
    hasNotes,
    kicker: "Visual understanding",
    estimate: "~30–90 sec"
  });
}

async function generateVisualGuide(force = false) {
  if (isVisualGuideGenerating) return;
  if (!fullSummary || !fullSummary.trim()) {
    if (typeof showStudyToolNotice === "function") {
      showStudyToolNotice("Generate notes first, then create a visual image guide.", "error");
    } else {
      alert("Generate notes first, then create a visual image guide.");
    }
    return;
  }
  if (currentVisualGuide && !force) {
    switchTool("visualguide");
    return;
  }

  isVisualGuideGenerating = true;
  visualGuideError = "";
  switchTool("visualguide");
  renderVisualGuidePanel();

  try {
    const toolSettings = getStudyToolSettings("visualguide");
    const response = await apiClient.fetch("/visual-image-guide/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: storedTitle,
        summary: fullSummary,
        sections,
        preferred_language: toolSettings.language || (preferredLanguage ? preferredLanguage.value : "auto"),
        visual_style: toolSettings.style || "concept_board",
        source_fingerprint: currentSourceFingerprint,
        sources: visualGuideSourceRequestItems(),
        visual_gallery: visualGuideFigureRequestItems()
      })
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `Visual image guide generation failed with status ${response.status}.`);
    }
    currentVisualGuide = normalizeVisualImageGuide(data);
    persistVisualGuideForCurrentNote();
    if (typeof recordStudyActivity === "function") recordStudyActivity("visual_guide_generated", {
      tool: "visualguide",
      label: "Generated Image Guide",
      metadata: { model: currentVisualGuide.model, panels: currentVisualGuide.blueprint?.panels?.length || 0 }
    });
  } catch (error) {
    console.error(error);
    visualGuideError = error.message || "Visual image guide generation failed.";
  } finally {
    isVisualGuideGenerating = false;
    renderVisualGuidePanel();
  }
}

function visualGuideFileBaseName(extension = "") {
  const raw = currentVisualGuide?.title || storedTitle || "synapse-visual-guide";
  const safe = String(raw)
    .normalize("NFKD")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "synapse-visual-guide";
  return extension ? `${safe}.${extension}` : safe;
}

function getVisualGuidePosterElement() {
  return document.querySelector(".visual-guide-poster");
}

function visualGuideExportFallbackHTML() {
  return `
    <html>
      <head><title>Preparing visual guide</title></head>
      <body style="font-family:Inter,system-ui,Arial,sans-serif;padding:32px;color:#0f172a">
        <h1>Preparing visual guide...</h1>
        <p>Synapse is packaging the poster for export.</p>
      </body>
    </html>
  `;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read image blob."));
    reader.readAsDataURL(blob);
  });
}

async function inlineImagesForExport(root) {
  const images = [...root.querySelectorAll("img")];
  await Promise.all(images.map(async image => {
    const src = image.getAttribute("src") || image.currentSrc || "";
    if (!src || src.startsWith("data:")) return;
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      image.setAttribute("src", await blobToDataURL(blob));
      image.removeAttribute("loading");
      image.removeAttribute("decoding");
    } catch (error) {
      console.warn("Could not inline export image:", error);
    }
  }));
}

async function collectVisualGuideExportCSS() {
  let css = "";
  try {
    const styleURL = new URL("style.css", window.location.href).href;
    const response = await fetch(styleURL);
    if (response.ok) css += await response.text();
  } catch (error) {
    console.warn("Could not fetch visual guide stylesheet:", error);
  }

  if (!css.includes(".visual-guide-poster")) {
    [...document.styleSheets].forEach(sheet => {
      try {
        css += [...(sheet.cssRules || [])].map(rule => rule.cssText).join("\n");
      } catch {
        // Cross-origin stylesheets, such as icon fonts, may not expose cssRules.
      }
    });
  }

  document.querySelectorAll("style").forEach(style => {
    css += `\n${style.textContent || ""}`;
  });

  css += `
    html, body { margin: 0; background: #f8fafc; }
    body { padding: 28px; font-family: Inter, system-ui, Arial, sans-serif; color: #0f172a; }
    .visual-guide-export-wrapper { width: 100%; }
    .visual-guide-toolbar, .visual-guide-launch, .visual-guide-loading { display: none !important; }
    .desmos-card { display: none !important; }
    .visual-guide-poster { box-shadow: none !important; margin: 0 auto; }
    .visual-guide-panel { break-inside: avoid; page-break-inside: avoid; }
    .visual-guide-figure-card { break-inside: avoid; page-break-inside: avoid; }
    button { font: inherit; }
    @page { margin: 12mm; size: A4 portrait; }
    @media print {
      body { padding: 0; background: #ffffff; }
      .visual-guide-poster { border: 0; border-radius: 0; }
    }
  `;
  return css;
}

async function prepareVisualGuideExportClone() {
  await renderMath();
  const poster = getVisualGuidePosterElement();
  if (!poster) {
    throw new Error("Generate a visual guide before exporting.");
  }
  const rect = poster.getBoundingClientRect();
  const width = Math.ceil(Math.max(poster.scrollWidth, rect.width, 960));
  const height = Math.ceil(Math.max(poster.scrollHeight, rect.height, 800));
  const clone = poster.cloneNode(true);
  clone.classList.add("visual-guide-export-node");
  clone.style.width = `${width}px`;
  clone.style.maxWidth = "none";
  await inlineImagesForExport(clone);
  const css = await collectVisualGuideExportCSS();
  return { clone, css, width, height };
}

async function renderVisualGuideToCanvas() {
  const { clone, css, width, height } = await prepareVisualGuideExportClone();
  const safeWidth = Math.ceil(width);
  const safeHeight = Math.ceil(height);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" class="visual-guide-export-wrapper">
        <style>${css}</style>
        ${clone.outerHTML}
      </div>
    </foreignObject>
  </svg>`;
  const svgURL = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Could not render the visual guide as an image."));
    });
    image.src = svgURL;
    await loaded;
    const canvas = document.createElement("canvas");
    const maxCanvasSide = 12000;
    const exportScale = Math.min(2, Math.max(0.5, maxCanvasSide / Math.max(safeWidth, safeHeight)));
    canvas.width = Math.ceil(safeWidth * exportScale);
    canvas.height = Math.ceil(safeHeight * exportScale);
    const context2d = canvas.getContext("2d");
    if (!context2d) throw new Error("Could not create a canvas for export.");
    context2d.fillStyle = "#ffffff";
    context2d.fillRect(0, 0, canvas.width, canvas.height);
    context2d.setTransform(exportScale, 0, 0, exportScale, 0, 0);
    context2d.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(svgURL);
  }
}

function canvasToBlob(canvas, type = "image/png", quality = 0.95) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function downloadVisualImageGuidePNG() {
  if (!currentVisualGuide?.imageDataUrl) {
    alert("Generate a visual image guide before downloading.");
    return;
  }
  const link = document.createElement("a");
  link.href = currentVisualGuide.imageDataUrl;
  link.download = visualGuideFileBaseName("png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function bytesFromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function concatByteParts(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  parts.forEach(part => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function createSingleImagePDFBlob(canvas) {
  const jpegDataURL = canvas.toDataURL("image/jpeg", 0.92);
  const jpegBytes = bytesFromBase64(jpegDataURL.split(",")[1] || "");
  const encoder = new TextEncoder();
  const parts = [];
  const offsets = [0];
  let byteLength = 0;
  const appendText = text => {
    const bytes = encoder.encode(text);
    parts.push(bytes);
    byteLength += bytes.length;
  };
  const appendBytes = bytes => {
    parts.push(bytes);
    byteLength += bytes.length;
  };
  const startObject = number => {
    offsets[number] = byteLength;
    appendText(`${number} 0 obj\n`);
  };

  const pageWidth = Math.round(canvas.width * 0.75);
  const pageHeight = Math.round(canvas.height * 0.75);
  const drawCommand = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;

  appendText("%PDF-1.3\n");
  startObject(1);
  appendText("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  startObject(2);
  appendText("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  startObject(3);
  appendText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  startObject(4);
  appendText(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  appendBytes(jpegBytes);
  appendText("\nendstream\nendobj\n");
  startObject(5);
  appendText(`<< /Length ${encoder.encode(drawCommand).length} >>\nstream\n${drawCommand}endstream\nendobj\n`);

  const xrefOffset = byteLength;
  appendText("xref\n0 6\n0000000000 65535 f \n");
  for (let objectNumber = 1; objectNumber <= 5; objectNumber += 1) {
    appendText(`${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`);
  }
  appendText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob([concatByteParts(parts)], { type: "application/pdf" });
}

function buildVisualGuidePDFHTML(cloneHTML, css) {
  const title = currentVisualGuide?.title || storedTitle || "Visual Guide";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHTML(title)} - Visual Guide</title>
  <style>${css}</style>
</head>
<body>
  <main class="visual-guide-export-wrapper">${cloneHTML}</main>
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

function setVisualGuideExportBusy(kind, busy) {
  document.querySelectorAll("[data-visual-guide-export]").forEach(button => {
    button.disabled = busy;
    if (button.dataset.visualGuideExport !== kind) return;
    if (busy) {
      button.dataset.originalHtml = button.innerHTML;
      button.innerHTML = `<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Exporting`;
    } else if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
  });
}

async function exportVisualGuidePDF() {
  if (!currentVisualGuide) {
    alert("Generate a visual guide before exporting.");
    return;
  }
  setVisualGuideExportBusy("pdf", true);
  try {
    const canvas = await renderVisualGuideToCanvas();
    downloadBlob(createSingleImagePDFBlob(canvas), visualGuideFileBaseName("pdf"));
  } catch (error) {
    console.error(error);
    alert(error.message || "Visual guide PDF export failed.");
  } finally {
    setVisualGuideExportBusy("pdf", false);
  }
}

async function exportVisualGuidePNG() {
  if (!currentVisualGuide) {
    alert("Generate a visual guide before exporting.");
    return;
  }
  setVisualGuideExportBusy("png", true);
  try {
    const canvas = await renderVisualGuideToCanvas();
    const blob = await canvasToBlob(canvas, "image/png", 0.98);
    if (!blob) throw new Error("Could not create the PNG file.");
    downloadBlob(blob, visualGuideFileBaseName("png"));
  } catch (error) {
    console.error(error);
    alert(error.message || "Visual guide PNG export failed.");
  } finally {
    setVisualGuideExportBusy("png", false);
  }
}

function visualGuideIcon(type) {
  const icons = {
    concept: "bi-bounding-box-circles",
    process: "bi-arrow-repeat",
    comparison: "bi-columns-gap",
    evidence: "bi-bar-chart-line",
    formula: "bi-superscript",
    timeline: "bi-clock-history",
    case: "bi-kanban",
    source: "bi-file-earmark-text"
  };
  return icons[String(type || "concept").toLowerCase()] || icons.concept;
}

function visualGuideSourceFigureItems(indexes = [], limit = 3) {
  const unique = [];
  (indexes || []).forEach(index => {
    const figureIndex = Number.parseInt(index, 10);
    if (!Number.isInteger(figureIndex) || unique.includes(figureIndex)) return;
    if (!getLearningFigureByMarker(figureIndex)) return;
    unique.push(figureIndex);
  });
  return unique.slice(0, limit).map(index => ({
    index,
    item: getLearningFigureByMarker(index)
  })).filter(entry => entry.item && entry.item.url);
}

function visualGuideWebImageItems(indexes = [], limit = 3) {
  const webImages = currentVisualGuide?.webImages || [];
  const unique = [];
  (indexes || []).forEach(index => {
    const imageIndex = Number.parseInt(index, 10);
    if (!Number.isInteger(imageIndex) || unique.includes(imageIndex)) return;
    if (!webImages.some(item => Number(item.index) === imageIndex)) return;
    unique.push(imageIndex);
  });
  return unique.slice(0, limit).map(index => ({
    index,
    item: webImages.find(image => Number(image.index) === index)
  })).filter(entry => entry.item && entry.item.url);
}

function openVisualGuideWebImage(index) {
  const image = (currentVisualGuide?.webImages || []).find(item => Number(item.index) === Number(index));
  if (image?.sourceUrl) {
    window.open(image.sourceUrl, "_blank", "noopener");
  }
}

function visualGuideUniqueFigureIndexes(guide, limit = 4) {
  const indexes = [];
  (guide?.panels || []).forEach(panel => {
    (panel.sourceFigureIndexes || []).forEach(index => {
      const figureIndex = Number.parseInt(index, 10);
      if (!Number.isInteger(figureIndex) || indexes.includes(figureIndex)) return;
      if (!getLearningFigureByMarker(figureIndex)) return;
      indexes.push(figureIndex);
    });
  });
  if (!indexes.length) {
    sanitizeLearningFigures(visualGalleryData).forEach(item => {
      const figureIndex = Number.parseInt(item.index, 10);
      if (Number.isInteger(figureIndex) && !indexes.includes(figureIndex)) indexes.push(figureIndex);
    });
  }
  return indexes.slice(0, limit);
}

function renderVisualGuideFigureCards(indexes = [], { compact = false, limit = 3 } = {}) {
  const figures = visualGuideSourceFigureItems(indexes, limit);
  if (!figures.length) return "";
  return `
    <div class="visual-guide-figure-grid ${compact ? "compact" : ""}">
      ${figures.map(({ index, item }) => {
        const label = `Source figure ${index + 1}`;
        const title = cleanSourceFigureDisplayText(item.title || item.caption || label) || label;
        const detail = getVisualDetailText(item, ["what_shows", "argument_supported", "how_to_read", "caption"]);
        const meta = cleanSourceFigureDisplayText(item.location || item.source_title || "");
        return `
          <button class="visual-guide-figure-card" type="button" onclick="openVisualModal(${index})" aria-label="Open ${escapeAttr(label)}">
            <img src="${escapeAttr(item.url)}" alt="${escapeAttr(title)}" loading="lazy" decoding="async">
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(title)}</strong>
            ${detail && !compact ? `<small>${escapeHTML(detail)}</small>` : ""}
            ${meta && compact ? `<small>${escapeHTML(meta)}</small>` : ""}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderVisualGuideWebImageCards(indexes = [], { compact = false, limit = 3 } = {}) {
  const figures = visualGuideWebImageItems(indexes, limit);
  if (!figures.length) return "";
  return `
    <div class="visual-guide-figure-grid ${compact ? "compact" : ""}">
      ${figures.map(({ index, item }) => {
        const label = item.provider || "Reference image";
        const title = cleanSourceFigureDisplayText(item.title || item.query || label) || label;
        const meta = [item.license, item.credit].filter(Boolean).join(" · ");
        return `
          <button class="visual-guide-figure-card web-image" type="button" onclick="openVisualGuideWebImage(${index})" aria-label="Open ${escapeAttr(label)}">
            <img src="${escapeAttr(item.url)}" alt="${escapeAttr(title)}" loading="lazy" decoding="async">
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(title)}</strong>
            ${meta ? `<small>${escapeHTML(meta)}</small>` : ""}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderVisualGuidePanelImages(panel, { compact = true, limit = 2 } = {}) {
  const sourceImages = renderVisualGuideFigureCards(panel.sourceFigureIndexes, { compact, limit });
  const webImages = renderVisualGuideWebImageCards(panel.webImageIndexes, { compact, limit });
  return [sourceImages, webImages].filter(Boolean).join("");
}

function renderVisualGuideHeroFigures(guide) {
  const panelsAlreadyUseFigures = (guide?.panels || []).some(panel => (panel.sourceFigureIndexes || []).length);
  if (panelsAlreadyUseFigures) return "";
  const indexes = visualGuideUniqueFigureIndexes(guide, 3);
  if (!indexes.length) return "";
  return `
    <div class="visual-guide-hero-gallery" aria-label="Key source figures">
      ${renderVisualGuideFigureCards(indexes, { compact: true, limit: 3 })}
    </div>
  `;
}

function renderVisualGuideMiniVisual(panel, index) {
  const type = String(panel.visualType || "concept").toLowerCase();
  if (type === "formula" && panel.formula) {
    return `<div class="visual-guide-formula">${markdownToHTML(panel.formula)}</div>`;
  }
  const nodes = (panel.keyPoints.length ? panel.keyPoints : [panel.visualPrompt || panel.title, panel.sourceEvidence])
    .filter(Boolean)
    .slice(0, 3);
  return `
    <div class="visual-guide-mini-visual ${escapeAttr(type)}">
      <i class="bi ${visualGuideIcon(type)}"></i>
      <div class="visual-guide-mini-lines">
        ${nodes.map((node, nodeIndex) => `
          <span style="--node:${nodeIndex + 1}"></span>
        `).join("")}
      </div>
      <b>${String(index + 1).padStart(2, "0")}</b>
    </div>
  `;
}

function renderVisualGuidePanelMedia(panel, index) {
  const sourceFigures = renderVisualGuidePanelImages(panel, { compact: true, limit: 2 });
  const drawnVisual = renderVisualGuideMiniVisual(panel, index);
  if (!sourceFigures) return drawnVisual;
  return `
    <div class="visual-guide-panel-media">
      ${sourceFigures}
    </div>
  `;
}

function renderVisualGuideFigureLinks(indexes = []) {
  const unique = [...new Set((indexes || []).filter(index => Number.isInteger(index) && getLearningFigureByMarker(index)))];
  if (!unique.length) return "";
  return `
    <div class="visual-guide-figures">
      ${unique.map(index => `
        <button type="button" onclick="openVisualModal(${index})">
          <i class="bi bi-image"></i> Source figure ${index + 1}
        </button>
      `).join("")}
    </div>
  `;
}

function renderVisualGuide(guide) {
  const panels = (guide.panels || []).slice(0, 8);
  const flow = guide.flow || [];
  const sourceMap = guide.sourceMap || [];
  const reviewPrompts = guide.reviewPrompts || [];
  return `
    <div class="visual-guide-shell">
      <div class="visual-guide-toolbar">
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="generateVisualGuide(true)">
          <i class="bi bi-arrow-clockwise me-1"></i>Regenerate
        </button>
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="exportVisualGuidePNG()" data-visual-guide-export="png">
          <i class="bi bi-filetype-png me-1"></i>PNG
        </button>
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="exportVisualGuidePDF()" data-visual-guide-export="pdf">
          <i class="bi bi-filetype-pdf me-1"></i>PDF
        </button>
      </div>
      <article class="visual-guide-poster">
        <header class="visual-guide-hero">
          <div>
            <span class="visual-guide-kicker">Source-wide visual guide</span>
            <h3>${escapeHTML(guide.title || `${storedTitle} Visual Guide`)}</h3>
            ${guide.subtitle ? `<p>${markdownToHTML(guide.subtitle)}</p>` : ""}
          </div>
          <div class="visual-guide-hero-side">
            <div class="visual-guide-hero-mark">
              <i class="bi bi-layout-text-window-reverse"></i>
              <span>${panels.length || 0} panels</span>
            </div>
            ${renderVisualGuideHeroFigures(guide)}
          </div>
        </header>

        ${guide.thesis || guide.coverageNote ? `
          <section class="visual-guide-thesis">
            ${guide.thesis ? `<div><strong>Core idea</strong>${markdownToHTML(guide.thesis)}</div>` : ""}
            ${guide.coverageNote ? `<div><strong>Coverage</strong>${markdownToHTML(guide.coverageNote)}</div>` : ""}
          </section>
        ` : ""}

        ${flow.length ? `
          <section class="visual-guide-flow" aria-label="Guide flow">
            ${flow.map((item, index) => `
              <div>
                <span>${index + 1}</span>
                <strong>${escapeHTML(item.label)}</strong>
                ${item.text ? `<p>${escapeHTML(item.text)}</p>` : ""}
              </div>
            `).join("")}
          </section>
        ` : ""}

        <section class="visual-guide-panel-grid">
          ${panels.map((panel, index) => `
            <article class="visual-guide-panel visual-guide-panel-${escapeAttr(panel.visualType)}">
              <div class="visual-guide-panel-top">
                <span>${escapeHTML(panel.kicker)}</span>
                <i class="bi ${visualGuideIcon(panel.visualType)}"></i>
              </div>
              ${renderVisualGuidePanelMedia(panel, index)}
              <h4>${escapeHTML(panel.title)}</h4>
              ${panel.body ? `<div class="visual-guide-panel-body">${markdownToHTML(panel.body)}</div>` : ""}
              ${panel.keyPoints.length ? `
                <ul class="visual-guide-points">
                  ${panel.keyPoints.map(point => `<li>${markdownToHTML(point)}</li>`).join("")}
                </ul>
              ` : ""}
              ${panel.sourceEvidence ? `
                <div class="visual-guide-evidence">
                  <span>Source evidence</span>
                  ${markdownToHTML(panel.sourceEvidence)}
                </div>
              ` : ""}
              ${panel.sourceRefs.length ? `
                <div class="visual-guide-ref-row">
                  ${panel.sourceRefs.map(ref => `<span>${escapeHTML(ref)}</span>`).join("")}
                </div>
              ` : ""}
              ${(panel.sourceFigureIndexes || []).length ? "" : renderVisualGuideFigureLinks(panel.sourceFigureIndexes)}
            </article>
          `).join("")}
        </section>

        <footer class="visual-guide-footer">
          ${sourceMap.length ? `<span>${escapeHTML(sourceMap.length)} source${sourceMap.length === 1 ? "" : "s"} covered</span>` : ""}
          ${reviewPrompts.slice(0, 2).map(prompt => `<span>${markdownToHTML(prompt)}</span>`).join("")}
        </footer>
      </article>
    </div>
  `;
}

function renderVisualImageGuide(guide) {
  const imageUrl = guide?.imageDataUrl || "";
  if (!imageUrl) return renderVisualGuideLaunch();
  const meta = [
    guide.imageProcessing?.layout,
    guide.requestedModel ? `requested ${guide.requestedModel}` : guide.model,
    guide.size,
    guide.styleVersion
  ].map(item => cleanVisualGuideGeneratedText(item)).filter(Boolean).join(" • ");
  const renderingNote = cleanVisualGuideGeneratedText(guide.renderingNote || "");
  return `
    <div class="visual-image-guide-shell">
      <div class="visual-guide-toolbar">
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="generateVisualGuide(true)">
          <i class="bi bi-arrow-clockwise me-1"></i>Regenerate image
        </button>
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="downloadVisualImageGuidePNG()">
          <i class="bi bi-download me-1"></i>PNG
        </button>
      </div>
      <figure class="visual-image-guide-card">
        <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(guide.title || "Visual image guide")}" loading="lazy" decoding="async">
        <figcaption>
          <strong>${escapeHTML(guide.title || "Visual Image Guide")}</strong>
          ${meta ? `<span>${escapeHTML(meta)}</span>` : ""}
          ${renderingNote ? `<span>${escapeHTML(renderingNote)}</span>` : ""}
        </figcaption>
      </figure>
    </div>
  `;
}

function setupFlashcardTool() {
  const switcher = document.querySelector(".tool-switcher");
  if (switcher && !document.getElementById("toolBtnFlashcards")) {
    switcher.insertAdjacentHTML("beforeend", `
      <button id="toolBtnFlashcards" class="tool-switch-btn" type="button" onclick="switchTool('flashcards', this)">
        <i class="bi bi-card-text me-1"></i>Flashcards
      </button>
    `);
  }

  const studyToolsCard = document.querySelector(".study-tools-card");
  if (studyToolsCard && !document.getElementById("toolPanelFlashcards")) {
    studyToolsCard.insertAdjacentHTML("beforeend", `
      <div id="toolPanelFlashcards" class="tool-panel">
        <div class="tool-panel-head d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h3>Flashcards</h3>
            <p>Build a source-grounded concept deck for fast active recall.</p>
          </div>
          <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="clearFlashcardsAndShowBuilder()">
            <i class="bi bi-sliders me-1"></i>Flashcard settings
          </button>
        </div>
        <div id="flashcardPanelContent"></div>
      </div>
    `);
  }

  loadFlashcardsForCurrentNote();
  renderFlashcardPanel();
}

function setupQuizTool() {
  const switcher = document.querySelector(".tool-switcher");
  const quizButton = switcher
    ? Array.from(switcher.querySelectorAll(".tool-switch-btn")).find(button =>
      button.id === "toolBtnQuiz" || button.querySelector(".bi-patch-question") || button.textContent.trim().toLowerCase().includes("quiz")
    )
    : null;

  if (quizButton) {
    quizButton.id = "toolBtnQuiz";
    quizButton.disabled = false;
    quizButton.classList.remove("disabled");
    quizButton.setAttribute("aria-disabled", "false");
    quizButton.innerHTML = `<i class="bi bi-patch-question me-1"></i>Quiz`;
    quizButton.onclick = () => switchTool("quiz", quizButton);
  }

  const studyToolsCard = document.querySelector(".study-tools-card");
  if (studyToolsCard && !document.getElementById("toolPanelQuiz")) {
    studyToolsCard.insertAdjacentHTML("beforeend", `
      <div id="toolPanelQuiz" class="tool-panel">
        <div class="tool-panel-head d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h3>Quiz</h3>
            <p>Generate source-grounded questions from the current notes to practise understanding, application, and exam phrasing.</p>
          </div>
          <button class="btn btn-outline-primary btn-sm flex-shrink-0" type="button" onclick="openQuizSettingsModal()">
            <i class="bi bi-sliders me-1"></i>Quiz settings
          </button>
        </div>
        <div id="quizPanelContent"></div>
      </div>
    `);
  }

  renderQuizPanel();
}

function getQuizTypeLabel(type) {
  return QUIZ_TYPE_OPTIONS.find(option => option.value === type)?.label || type;
}

function getQuizDifficultyLabel(value) {
  const labels = {
    easy: "Basic",
    medium: "Medium",
    hard: "Challenge"
  };
  return labels[String(value || "").toLowerCase()] || "Medium";
}

function quizTypePlanTotal(settings = quizSettings) {
  return (settings.questionTypes || []).reduce((sum, row) => sum + clampQuizNumber(row.count, 1), 0);
}

function quizSettingsSummaryHTML(settings = quizSettings) {
  const rows = (settings.questionTypes || []).map(row =>
    `<span class="quiz-summary-pill">${escapeHTML(getQuizTypeLabel(row.type))} × ${clampQuizNumber(row.count, 1)}</span>`
  ).join("");
  return `
    <div class="quiz-summary-pills" aria-label="Quiz settings summary">
      <span class="quiz-summary-pill quiz-summary-pill-primary">${settings.examMode ? "Exam mode" : "Practice mode"}</span>
      <span class="quiz-summary-pill">${escapeHTML(getQuizLanguageLabel(settings.preferredLanguage))}</span>
      <span class="quiz-summary-pill">${settings.totalQuestions} questions</span>
      ${rows}
    </div>
  `;
}

function getQuizNoteKey() {
  if (currentHistoryId) return `history:${currentHistoryId}`;
  if (currentSourceFingerprint) return `fingerprint:${currentSourceFingerprint}`;
  return "";
}

function getQuizHistoryStore() {
  const parsed = safeReadJSONStorage(QUIZ_HISTORY_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function setQuizHistoryStore(store) {
  return safeWriteJSONStorage(QUIZ_HISTORY_STORAGE_KEY, store || {});
}

function makeQuizHistoryId() {
  return `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeStoredQuizRecord(record) {
  if (!record || typeof record !== "object") return null;
  const quiz = normalizeClientQuiz(record.quiz || record);
  if (!quiz.questions.length) return null;
  const answers = record.answers && typeof record.answers === "object" && !Array.isArray(record.answers)
    ? record.answers
    : {};
  const revealedIds = Array.isArray(record.revealedIds)
    ? record.revealedIds.map(id => String(id)).filter(Boolean)
    : [];
  return {
    id: record.id || makeQuizHistoryId(),
    title: record.title || quiz.title || `${storedTitle || "Study"} Quiz`,
    createdAt: record.createdAt || record.created_at || new Date().toISOString(),
    updatedAt: record.updatedAt || record.updated_at || record.createdAt || new Date().toISOString(),
    noteTitle: record.noteTitle || storedTitle || "Study Notes",
    settings: normalizeQuizSettings(record.settings || quizSettings),
    quiz,
    answers,
    revealedIds,
    report: record.report || null
  };
}

function getQuizHistoryRecordsForCurrentNote() {
  const store = getQuizHistoryStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : ""
  ].filter(Boolean);
  const rawRecords = keys.flatMap(key => Array.isArray(store[key]) ? store[key] : []);
  const seen = new Set();
  return rawRecords
    .map(normalizeStoredQuizRecord)
    .filter(Boolean)
    .filter(record => {
      if (seen.has(record.id)) return false;
      seen.add(record.id);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, QUIZ_HISTORY_LIMIT);
}

function applyQuizHistoryRecord(record, options = {}) {
  const normalized = normalizeStoredQuizRecord(record);
  if (!normalized) return;
  currentQuiz = normalized.quiz;
  quizAnswers = { ...normalized.answers };
  quizRevealedAnswers = new Set(normalized.revealedIds || []);
  quizReport = normalized.report || null;
  activeQuizQuestionIndex = 0;
  activeQuizHistoryId = normalized.id;
  if (options.render !== false) {
    switchTool("quiz");
    renderQuizPanel();
  }
}

function loadQuizHistoryForCurrentNote() {
  quizHistory = getQuizHistoryRecordsForCurrentNote();
  if (quizHistory.length) {
    applyQuizHistoryRecord(quizHistory[0], { render: false });
  } else {
    currentQuiz = null;
    quizAnswers = {};
    quizRevealedAnswers = new Set();
    quizReport = null;
    activeQuizQuestionIndex = 0;
    activeQuizHistoryId = "";
  }
}
