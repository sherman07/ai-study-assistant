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

