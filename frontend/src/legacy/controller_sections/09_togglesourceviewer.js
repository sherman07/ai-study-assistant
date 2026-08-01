const SOURCE_PREVIEW_TIMEOUT_MS = Number(window.SYNAPSE_SOURCE_PREVIEW_TIMEOUT_MS || 90 * 1000);
const NOTES_SOURCE_SPLIT_STORAGE_KEY = "synapse.notes.source.split.ratio.v1";
const NOTES_SOURCE_SPLIT_DEFAULT_RATIO = 1.72 / (1.72 + 0.58);
const NOTES_SOURCE_SPLIT_MIN_NOTES_PX = 420;
const NOTES_SOURCE_SPLIT_MIN_PREVIEW_PX = 280;
const NOTES_SOURCE_SPLIT_MOBILE_MQ = "(max-width: 1180px)";
const NOTES_SOURCE_SPLIT_TUTOR_SIDE_MQ = "(min-width: 1600px)";
const NOTES_SOURCE_SPLIT_CROWDED_MQ = "(max-width: 1360px)";
const sourcePreviewInflight = new Map();
const sourcePreviewPrefetchQueue = [];
let sourcePreviewPrefetchRunning = false;
let notesSourceSplitRatio = NOTES_SOURCE_SPLIT_DEFAULT_RATIO;
let notesSourceSplitDragging = false;
let notesSourceSplitBound = false;
let notesSourceSplitPointerId = null;
let notesSourceCollapsedNavForSpace = false;
let notesSourcePrevHistoryCollapsed = null;

function toggleSourceViewer(force = null) {
  const desired = typeof force === "boolean" ? force : !sourceViewerOpen;
  sourceViewerOpen = desired;
  if (desired && typeof recordStudyActivity === "function") recordStudyActivity("source_opened", {
    tool: "notes",
    label: "Opened source viewer"
  });
  syncSourceViewerWorkspaceSpace(desired);
  renderSourceViewer();
}

function syncSourceViewerWorkspaceSpace(open) {
  const crowded = Boolean(window.matchMedia?.(NOTES_SOURCE_SPLIT_CROWDED_MQ)?.matches);
  if (open && crowded && typeof toggleHistoryNav === "function") {
    if (!notesSourceCollapsedNavForSpace) {
      notesSourcePrevHistoryCollapsed = Boolean(historyNavCollapsed);
      notesSourceCollapsedNavForSpace = true;
      if (!historyNavCollapsed) toggleHistoryNav(true);
    }
    return;
  }
  if (!open && notesSourceCollapsedNavForSpace) {
    notesSourceCollapsedNavForSpace = false;
    if (notesSourcePrevHistoryCollapsed === false && typeof toggleHistoryNav === "function") {
      toggleHistoryNav(false);
    }
    notesSourcePrevHistoryCollapsed = null;
  }
}

function clampNotesSourceSplitRatio(ratio) {
  const value = Number(ratio);
  if (!Number.isFinite(value)) return NOTES_SOURCE_SPLIT_DEFAULT_RATIO;
  return Math.max(0.38, Math.min(0.82, value));
}

function loadNotesSourceSplitRatio() {
  const raw = typeof safeGetLocalStorage === "function"
    ? safeGetLocalStorage(NOTES_SOURCE_SPLIT_STORAGE_KEY, "")
    : "";
  const parsed = Number(raw);
  return clampNotesSourceSplitRatio(Number.isFinite(parsed) ? parsed : NOTES_SOURCE_SPLIT_DEFAULT_RATIO);
}

function persistNotesSourceSplitRatio(ratio = notesSourceSplitRatio) {
  notesSourceSplitRatio = clampNotesSourceSplitRatio(ratio);
  if (typeof safeSetLocalStorage === "function") {
    safeSetLocalStorage(NOTES_SOURCE_SPLIT_STORAGE_KEY, String(notesSourceSplitRatio));
  }
}

function applyNotesSourceSplitRatio(ratio = notesSourceSplitRatio) {
  const grid = typeof resultGrid !== "undefined" && resultGrid
    ? resultGrid
    : document.getElementById("resultGrid");
  if (!grid) return notesSourceSplitRatio;
  notesSourceSplitRatio = clampNotesSourceSplitRatio(ratio);
  const notesFr = notesSourceSplitRatio * 100;
  const sourceFr = (1 - notesSourceSplitRatio) * 100;
  grid.style.setProperty("--notes-split-notes", `${notesFr}fr`);
  grid.style.setProperty("--notes-split-source", `${sourceFr}fr`);
  const splitter = document.getElementById("notesSourceSplitter");
  if (splitter) {
    splitter.setAttribute("aria-valuenow", String(Math.round(notesSourceSplitRatio * 100)));
    splitter.setAttribute("aria-valuemin", "38");
    splitter.setAttribute("aria-valuemax", "82");
  }
  return notesSourceSplitRatio;
}

function resetNotesSourceSplitRatio() {
  notesSourceSplitRatio = NOTES_SOURCE_SPLIT_DEFAULT_RATIO;
  applyNotesSourceSplitRatio(notesSourceSplitRatio);
  if (typeof safeRemoveLocalStorage === "function") {
    safeRemoveLocalStorage(NOTES_SOURCE_SPLIT_STORAGE_KEY);
  } else if (typeof safeSetLocalStorage === "function") {
    safeSetLocalStorage(NOTES_SOURCE_SPLIT_STORAGE_KEY, String(NOTES_SOURCE_SPLIT_DEFAULT_RATIO));
  }
}

function isNotesSourceSplitResizable() {
  const grid = typeof resultGrid !== "undefined" && resultGrid
    ? resultGrid
    : document.getElementById("resultGrid");
  if (!grid?.classList.contains("source-open")) return false;
  if (window.matchMedia?.(NOTES_SOURCE_SPLIT_MOBILE_MQ)?.matches) return false;
  const layout = typeof appLayout !== "undefined" && appLayout
    ? appLayout
    : document.getElementById("appLayout");
  if (layout && !layout.classList.contains("assistant-closed")) {
    if (!window.matchMedia?.(NOTES_SOURCE_SPLIT_TUTOR_SIDE_MQ)?.matches) return false;
  }
  return true;
}

function syncNotesSourceSplitter() {
  applyNotesSourceSplitRatio(notesSourceSplitRatio);
  const splitter = document.getElementById("notesSourceSplitter");
  if (!splitter) return;
  const resizable = isNotesSourceSplitResizable();
  splitter.hidden = !resizable;
  splitter.setAttribute("aria-hidden", resizable ? "false" : "true");
  splitter.tabIndex = resizable ? 0 : -1;
}

function updateNotesSourceSplitFromClientX(clientX) {
  const grid = typeof resultGrid !== "undefined" && resultGrid
    ? resultGrid
    : document.getElementById("resultGrid");
  if (!grid) return;
  const rect = grid.getBoundingClientRect();
  const dividerWidth = Number.parseFloat(getComputedStyle(grid).getPropertyValue("--notes-split-divider")) || 10;
  const available = Math.max(1, rect.width - dividerWidth);
  const minNotes = Math.min(NOTES_SOURCE_SPLIT_MIN_NOTES_PX, available * 0.45);
  const minPreview = Math.min(NOTES_SOURCE_SPLIT_MIN_PREVIEW_PX, available * 0.35);
  const rawNotes = clientX - rect.left;
  const notesWidth = Math.max(minNotes, Math.min(available - minPreview, rawNotes));
  applyNotesSourceSplitRatio(notesWidth / available);
}

function endNotesSourceSplitDrag() {
  if (!notesSourceSplitDragging) return;
  notesSourceSplitDragging = false;
  notesSourceSplitPointerId = null;
  const grid = typeof resultGrid !== "undefined" && resultGrid
    ? resultGrid
    : document.getElementById("resultGrid");
  const splitter = document.getElementById("notesSourceSplitter");
  grid?.classList.remove("is-resizing");
  splitter?.classList.remove("is-dragging");
  document.body?.classList.remove("notes-source-split-resizing");
  persistNotesSourceSplitRatio(notesSourceSplitRatio);
}

function bindNotesSourceSplitter() {
  if (notesSourceSplitBound) {
    syncNotesSourceSplitter();
    return;
  }
  const splitter = document.getElementById("notesSourceSplitter");
  const grid = typeof resultGrid !== "undefined" && resultGrid
    ? resultGrid
    : document.getElementById("resultGrid");
  if (!splitter || !grid) return;

  notesSourceSplitRatio = loadNotesSourceSplitRatio();
  applyNotesSourceSplitRatio(notesSourceSplitRatio);
  notesSourceSplitBound = true;

  const onPointerMove = event => {
    if (!notesSourceSplitDragging) return;
    if (notesSourceSplitPointerId != null && event.pointerId !== notesSourceSplitPointerId) return;
    event.preventDefault();
    updateNotesSourceSplitFromClientX(event.clientX);
  };

  const onPointerUp = event => {
    if (notesSourceSplitPointerId != null && event.pointerId !== notesSourceSplitPointerId) return;
    endNotesSourceSplitDrag();
  };

  splitter.addEventListener("pointerdown", event => {
    if (!isNotesSourceSplitResizable()) return;
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    notesSourceSplitDragging = true;
    notesSourceSplitPointerId = event.pointerId;
    splitter.classList.add("is-dragging");
    grid.classList.add("is-resizing");
    document.body?.classList.add("notes-source-split-resizing");
    try {
      splitter.setPointerCapture(event.pointerId);
    } catch (_error) {
      // Some browsers may reject capture on non-primary pointers.
    }
    updateNotesSourceSplitFromClientX(event.clientX);
  });

  splitter.addEventListener("pointermove", onPointerMove);
  splitter.addEventListener("pointerup", onPointerUp);
  splitter.addEventListener("pointercancel", onPointerUp);
  splitter.addEventListener("lostpointercapture", onPointerUp);

  splitter.addEventListener("dblclick", event => {
    if (!isNotesSourceSplitResizable()) return;
    event.preventDefault();
    resetNotesSourceSplitRatio();
  });

  splitter.addEventListener("keydown", event => {
    if (!isNotesSourceSplitResizable()) return;
    const step = event.shiftKey ? 0.04 : 0.02;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      persistNotesSourceSplitRatio(notesSourceSplitRatio - step);
      applyNotesSourceSplitRatio(notesSourceSplitRatio);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      persistNotesSourceSplitRatio(notesSourceSplitRatio + step);
      applyNotesSourceSplitRatio(notesSourceSplitRatio);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetNotesSourceSplitRatio();
    }
  });

  window.addEventListener("resize", () => {
    if (notesSourceSplitDragging) endNotesSourceSplitDrag();
    syncNotesSourceSplitter();
  });

  syncNotesSourceSplitter();
}

function selectSourceItem(id) {
  activeSourceItemId = id;
  const item = sourceViewerItems.find(entry => entry.id === id);
  if (item && typeof recordStudyActivity === "function") recordStudyActivity("source_opened", {
    tool: "notes",
    sectionTitle: item.name || item.title || item.kind,
    label: `Opened source: ${item.name || item.title || item.kind || "source"}`
  });
  renderSourceViewer();
}

function applySourceZoomStyles(zoom = sourceViewerZoom) {
  const scale = Math.max(60, Math.min(180, Number(zoom) || 100));
  if (sourceZoomLabel) sourceZoomLabel.textContent = `${scale}%`;
  const body = typeof sourceViewerBody !== "undefined" && sourceViewerBody
    ? sourceViewerBody
    : document.getElementById("sourceViewerBody");
  if (!body) return false;
  const pdfPages = body.querySelector(".source-pdf-pages");
  if (pdfPages) {
    pdfPages.style.setProperty("--source-pdf-page-width", `${scale}%`);
    return true;
  }
  const slidePages = body.querySelector(".source-slide-pages");
  if (slidePages) {
    slidePages.style.setProperty("--source-slide-page-width", `${scale}%`);
    return true;
  }
  const image = body.querySelector(".source-image-stage img");
  if (image) {
    image.style.width = `${scale}%`;
    return true;
  }
  return false;
}

function changeSourceZoom(delta) {
  sourceViewerZoom = Math.max(60, Math.min(180, sourceViewerZoom + Number(delta || 0)));
  if (applySourceZoomStyles(sourceViewerZoom)) return;
  renderSourceViewer();
}

function resetSourceZoom() {
  sourceViewerZoom = 100;
  if (applySourceZoomStyles(sourceViewerZoom)) return;
  renderSourceViewer();
}

function sourceMetaLine(item) {
  const bits = [];
  if (item.kind === "youtube") bits.push("YOUTUBE VIDEO");
  else if (item.kind === "presentation") bits.push("PRESENTATION");
  else if (item.kind) bits.push(item.kind.toUpperCase());
  if (item.size) bits.push(formatBytes(item.size));
  if (item.sourceIdentity && item.sourceIdentity.startsWith("youtube:")) bits.push("Transcript source");
  return bits.filter(Boolean).join(" · ");
}

async function readSourceText(item) {
  if (item?.content) return item.content;
  if (!item?.blob) return "";
  try {
    return await item.blob.text();
  } catch {
    return "";
  }
}

function canUseNativePdfPreview(item) {
  return Boolean(item?.blob && item.kind === "pdf");
}

function canUseBackendSourcePreview(item) {
  // PDFs use the local blob viewer instantly. Only slide/document conversion
  // still needs the hosted /source-preview endpoint.
  return Boolean(item?.blob && ["presentation", "document"].includes(item.kind));
}

function sourceSlidePageUrl(slide) {
  return slide?.screenshot || slide?.image_data_url || "";
}

function sourcePresentationFileUrl(item) {
  return item?.blob ? makeSourceObjectUrl(item) : (item?.url || item?.originalUrl || "");
}

function safeExternalSourceUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, window.location.href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function sourceExternalUrl(item) {
  return safeExternalSourceUrl(item?.originalUrl || item?.url || "");
}

function sourcePresentationRenderLabel(preview) {
  const mode = preview?.render_mode || "";
  if (mode === "libreoffice") return "Original slide-page render";
  if (mode === "local-powerpoint") return "PowerPoint slide-page render";
  if (mode === "local-keynote") return "Keynote slide-page render";
  if (mode === "server-svg" || mode === "svg") return "Browser slide-page preview";
  return "Slide-page preview";
}

let sourcePreviewWarmupPromise = null;

async function ensureSourcePreviewWarmup() {
  if (!apiClient || typeof apiClient.warmup !== "function") return;
  if (!sourcePreviewWarmupPromise) {
    sourcePreviewWarmupPromise = apiClient.warmup({
      attempts: 8,
      retryDelayMs: 2000,
      timeoutMs: 20000,
      maxWaitMs: 45000
    }).catch(error => {
      sourcePreviewWarmupPromise = null;
      throw error;
    });
  }
  await sourcePreviewWarmupPromise;
}

async function fetchSourcePreview(item, { attempts = 2 } = {}) {
  if (!item) throw new Error("No source selected.");
  if (item.preview) {
    const presentationPreviewHasSlidePages =
      item.preview.kind === "presentation" &&
      (item.preview.slides || []).some((slide) => sourceSlidePageUrl(slide));
    if (item.kind !== "presentation" || presentationPreviewHasSlidePages) {
      return item.preview;
    }
    if (!item.blob) {
      throw new Error("The saved presentation preview does not contain full slide pages, and the original file is not available in this browser session. Reopen or re-upload the source to rebuild the slide reader.");
    }
  }
  if (!item.blob) {
    throw new Error("The original uploaded file is not available in this browser session. Regenerate from the source file to restore the full preview.");
  }

  const inflightKey = String(item.id || "");
  if (inflightKey && sourcePreviewInflight.has(inflightKey)) {
    return sourcePreviewInflight.get(inflightKey);
  }

  const request = (async () => {
    let lastError = null;
    const maxAttempts = Math.max(1, Number(attempts) || 1);
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await ensureSourcePreviewWarmup();
        const formData = new FormData();
        formData.append("file", item.blob, item.name || item.displayName || "source");
        const response = await apiClient.fetch("/source-preview", {
          method: "POST",
          body: formData,
          timeoutMs: SOURCE_PREVIEW_TIMEOUT_MS
        });
        const data = await readSourcePreviewJson(response);
        item.preview = data;
        item.previewError = "";
        item.previewPrefetchFailed = false;
        return data;
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts) break;
        await new Promise(resolve => setTimeout(resolve, 1200 * attempt));
        sourcePreviewWarmupPromise = null;
      }
    }
    throw lastError || new Error("Source preview failed.");
  })();

  if (inflightKey) sourcePreviewInflight.set(inflightKey, request);
  try {
    return await request;
  } finally {
    if (inflightKey) sourcePreviewInflight.delete(inflightKey);
  }
}

function sourceNeedsBackendPreviewPrefetch(item) {
  if (!canUseBackendSourcePreview(item)) return false;
  if (item.preview) {
    const presentationPreviewHasSlidePages =
      item.preview.kind === "presentation" &&
      (item.preview.slides || []).some((slide) => sourceSlidePageUrl(slide));
    if (item.kind !== "presentation" || presentationPreviewHasSlidePages) return false;
  }
  if (item.previewPrefetchFailed) return false;
  const key = String(item.id || "");
  if (key && sourcePreviewInflight.has(key)) return false;
  if (sourcePreviewPrefetchQueue.some(entry => entry?.id === item.id)) return false;
  return true;
}

function scheduleSourcePreviewPrefetch(items = sourceViewerItems) {
  const seen = new Set();
  const candidates = (Array.isArray(items) ? items : []).filter(item => {
    const key = String(item?.id || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return sourceNeedsBackendPreviewPrefetch(item);
  });
  if (!candidates.length) return;
  candidates.forEach(item => sourcePreviewPrefetchQueue.push(item));
  processSourcePreviewPrefetchQueue();
}

async function processSourcePreviewPrefetchQueue() {
  if (sourcePreviewPrefetchRunning) return;
  sourcePreviewPrefetchRunning = true;
  try {
    while (sourcePreviewPrefetchQueue.length) {
      const item = sourcePreviewPrefetchQueue.shift();
      if (!item || !sourceNeedsBackendPreviewPrefetch(item)) continue;
      try {
        await fetchSourcePreview(item, { attempts: 3 });
      } catch (error) {
        item.previewPrefetchFailed = true;
        item.previewError = error?.message || "Source preview failed.";
        console.warn("Background source preview prefetch failed:", {
          sourceId: item.id,
          name: item.name || item.title,
          error: item.previewError
        });
      }
      // Yield between conversions so note reading stays responsive.
      await new Promise(resolve => setTimeout(resolve, 40));
    }
  } finally {
    sourcePreviewPrefetchRunning = false;
    if (sourcePreviewPrefetchQueue.length) {
      processSourcePreviewPrefetchQueue();
    }
  }
}

async function readSourcePreviewJson(response) {
  const contentType = response.headers?.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const body = await response.text().catch(() => "");
    const preview = body ? ` Response preview: ${shorten(body.replace(/\s+/g, " "), 180)}` : "";
    throw new Error(
      `Source preview returned ${contentType || "non-JSON"} from ${response.url || apiClient.endpoint("/source-preview")} (HTTP ${response.status}).${preview}`
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error) {
    throw new Error(data?.error || `Source preview could not be generated (HTTP ${response.status}).`);
  }
  return data;
}

function renderSourcePreviewLoading(item) {
  const fallbackText = String(item?.content || "").trim();
  sourceViewerBody.innerHTML = `
    <div class="source-preview-progress">
      <div class="source-preview-progress-banner" role="status" aria-live="polite">
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <div>
          <strong>Preparing ${escapeHTML(item?.kind === "presentation" ? "slide" : "document")} preview…</strong>
          <small>Keep reviewing notes — Synapse will fill this pane when ready.</small>
        </div>
      </div>
      ${fallbackText ? `
        <pre class="source-text-preview source-preview-progress-text" style="font-size:${Math.max(0.78, sourceViewerZoom / 100)}rem">${escapeHTML(fallbackText.slice(0, 12000))}${fallbackText.length > 12000 ? "\n\n…" : ""}</pre>
      ` : `
        <div class="source-loading source-loading-compact">
          <i class="bi ${sourceIcon(item.kind)}"></i>
          <p>Converting this file into a readable browser view.</p>
        </div>
      `}
    </div>
  `;
}

function setSourceViewerNativePdfMode(enabled) {
  const panel = typeof sourceViewerPanel !== "undefined" && sourceViewerPanel
    ? sourceViewerPanel
    : document.getElementById("sourceViewerPanel");
  if (!panel) return;
  panel.classList.toggle("is-native-pdf", Boolean(enabled));
}

const SOURCE_PDFJS_SCRIPT_SRC = "./vendor/pdfjs/pdf.min.js";
const SOURCE_PDFJS_WORKER_SRC = "./vendor/pdfjs/pdf.worker.min.js";
const SOURCE_PDF_RENDER_SCALE = 1.45;
let sourcePdfJsLoadPromise = null;
let sourcePdfRenderToken = 0;
let sourcePdfPageObserver = null;

function ensurePdfJsLib() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(SOURCE_PDFJS_WORKER_SRC, window.location.href).href;
    return Promise.resolve(window.pdfjsLib);
  }
  if (sourcePdfJsLoadPromise) return sourcePdfJsLoadPromise;
  sourcePdfJsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-synapse-pdfjs="1"]`);
    const script = existing || document.createElement("script");
    script.src = new URL(SOURCE_PDFJS_SCRIPT_SRC, window.location.href).href;
    script.async = true;
    script.dataset.synapsePdfjs = "1";
    const settle = () => {
      const lib = window.pdfjsLib;
      if (!lib?.getDocument) {
        reject(new Error("PDF.js failed to initialize"));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc = new URL(SOURCE_PDFJS_WORKER_SRC, window.location.href).href;
      resolve(lib);
    };
    script.addEventListener("load", settle, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load the local PDF page renderer.")), { once: true });
    if (!existing) document.head.appendChild(script);
    else if (window.pdfjsLib?.getDocument) settle();
  }).catch(error => {
    sourcePdfJsLoadPromise = null;
    throw error;
  });
  return sourcePdfJsLoadPromise;
}

function disconnectSourcePdfPageObserver() {
  if (sourcePdfPageObserver) {
    sourcePdfPageObserver.disconnect();
    sourcePdfPageObserver = null;
  }
}

function updateSourcePdfPageStatus(currentPage, pageCount) {
  const status = document.getElementById("sourcePdfPageStatus");
  if (status) {
    status.textContent = pageCount
      ? `Page ${currentPage} / ${pageCount}`
      : `Page ${currentPage}`;
  }
  if (sourceViewerMeta && pageCount) {
    const item = sourceViewerItems.find(entry => entry.id === activeSourceItemId);
    const base = item ? sourceMetaLine(item) : "PDF";
    sourceViewerMeta.textContent = `${base} · ${currentPage}/${pageCount}`;
  }
}

function bindSourcePdfPageObserver(pagesEl, pageCount) {
  disconnectSourcePdfPageObserver();
  if (!pagesEl || !pageCount) return;
  const articles = Array.from(pagesEl.querySelectorAll(".source-pdf-page[data-page]"));
  if (!articles.length) return;
  sourcePdfPageObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const page = Number(visible.target.getAttribute("data-page") || 0);
    if (page > 0) updateSourcePdfPageStatus(page, pageCount);
  }, {
    root: typeof sourceViewerBody !== "undefined" ? sourceViewerBody : document.getElementById("sourceViewerBody"),
    threshold: [0.35, 0.55, 0.75]
  });
  articles.forEach(article => sourcePdfPageObserver.observe(article));
}

function isStaleSourcePdfRender(token, itemId) {
  if (token !== sourcePdfRenderToken) return true;
  const body = typeof sourceViewerBody !== "undefined" && sourceViewerBody
    ? sourceViewerBody
    : document.getElementById("sourceViewerBody");
  const stage = body?.querySelector(".source-pdf-page-renderer");
  if (!stage) return true;
  return String(stage.getAttribute("data-source-id") || "") !== String(itemId || "");
}

async function renderPdfPageToCanvas(page, canvas) {
  const viewport = page.getViewport({ scale: SOURCE_PDF_RENDER_SCALE });
  const outputScale = Math.min(2, window.devicePixelRatio || 1);
  const context = canvas.getContext("2d", { alpha: false });
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
  await page.render({
    canvasContext: context,
    viewport,
    transform
  }).promise;
}

function renderNativePdfPreview(item) {
  const openUrl = makeSourceObjectUrl(item);
  if (!item?.blob) {
    setSourceViewerNativePdfMode(false);
    renderSourcePreviewError(item, new Error("This PDF is not available in the browser session."));
    return;
  }
  setSourceViewerNativePdfMode(true);
  disconnectSourcePdfPageObserver();
  const token = ++sourcePdfRenderToken;
  const scale = Math.max(60, Math.min(180, sourceViewerZoom));
  const title = item.name || item.title || "PDF preview";
  sourceViewerBody.innerHTML = `
    <div class="source-native-pdf-stage source-pdf-page-renderer" data-source-id="${escapeAttr(item.id)}">
      <div class="source-pdf-reader-bar" aria-live="polite">
        <div>
          <span class="source-pdf-reader-kicker">Exact page preview</span>
          <strong id="sourcePdfPageStatus">Rendering page 1…</strong>
        </div>
        <span class="source-pdf-reader-hint">Synapse controls only · no browser print/download bar</span>
      </div>
      <div class="source-pdf-pages" id="sourcePdfPages" style="--source-pdf-page-width:${scale}%">
        <div class="source-pdf-page source-pdf-page-skeleton" aria-hidden="true">
          <div class="source-pdf-skeleton-sheet"></div>
        </div>
      </div>
    </div>
  `;

  Promise.all([
    ensurePdfJsLib(),
    item.blob.arrayBuffer()
  ])
    .then(async ([pdfjsLib, buffer]) => {
      if (isStaleSourcePdfRender(token, item.id)) return;
      const data = new Uint8Array(buffer);
      if (!data.byteLength) {
        throw new Error("This PDF is empty or could not be read in the browser.");
      }
      const pdf = await pdfjsLib.getDocument({
        data,
        withCredentials: false,
        isEvalSupported: false,
        useSystemFonts: true
      }).promise;
      if (isStaleSourcePdfRender(token, item.id)) return;

      const pagesEl = document.getElementById("sourcePdfPages");
      if (!pagesEl) return;
      pagesEl.innerHTML = "";
      const pageCount = Number(pdf.numPages || 0) || 0;
      updateSourcePdfPageStatus(1, pageCount);

      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        if (isStaleSourcePdfRender(token, item.id)) return;
        const page = await pdf.getPage(pageNumber);
        const article = document.createElement("article");
        article.className = "source-pdf-page";
        article.dataset.page = String(pageNumber);
        article.setAttribute("aria-label", `PDF page ${pageNumber} of ${pageCount}`);
        const canvas = document.createElement("canvas");
        canvas.className = "source-pdf-page-canvas";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", `${title} page ${pageNumber}`);
        article.appendChild(canvas);
        const caption = document.createElement("span");
        caption.className = "source-pdf-page-number";
        caption.textContent = `Page ${pageNumber} / ${pageCount}`;
        article.appendChild(caption);
        pagesEl.appendChild(article);
        await renderPdfPageToCanvas(page, canvas);
        if (pageNumber === 1) {
          updateSourcePdfPageStatus(1, pageCount);
          bindSourcePdfPageObserver(pagesEl, pageCount);
        }
      }
    })
    .catch(error => {
      if (isStaleSourcePdfRender(token, item.id)) return;
      console.warn("Local PDF page render failed", error);
      setSourceViewerNativePdfMode(false);
      sourceViewerBody.innerHTML = `
        <div class="source-file-preview">
          <i class="bi bi-file-earmark-pdf"></i>
          <h3>${escapeHTML(title)}</h3>
          <p>${escapeHTML(error?.message || "Synapse could not render this PDF as exact pages.")}</p>
          <div class="source-file-preview-actions">
            ${openUrl ? `<a class="source-inline-action" href="${escapeAttr(openUrl)}" target="_blank" rel="noopener noreferrer">Open original PDF</a>` : ""}
          </div>
        </div>
      `;
    });
}

function openActiveSourceExternally() {
  const item = sourceViewerItems.find(entry => entry.id === activeSourceItemId) || sourceViewerItems[0];
  if (!item) return false;
  const url = item.blob
    ? makeSourceObjectUrl(item)
    : (sourceExternalUrl(item) || item.url || item.originalUrl || "");
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

function cycleActiveSourceItem(delta = 1) {
  if (!sourceViewerItems.length) return;
  const currentIndex = Math.max(0, sourceViewerItems.findIndex(item => item.id === activeSourceItemId));
  const nextIndex = (currentIndex + delta + sourceViewerItems.length) % sourceViewerItems.length;
  selectSourceItem(sourceViewerItems[nextIndex].id);
}

function isEditableKeyboardTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  const tag = String(target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function bindSourceViewerShortcuts() {
  if (window.__synapseSourceViewerShortcutsBound) return;
  window.__synapseSourceViewerShortcutsBound = true;
  window.addEventListener("keydown", event => {
    if (isEditableKeyboardTarget(event.target)) return;
    const key = String(event.key || "");
    const lower = key.toLowerCase();

    if (lower === "s" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (!sourceViewerItems.length) return;
      event.preventDefault();
      toggleSourceViewer(!sourceViewerOpen);
      return;
    }

    if (!sourceViewerOpen) return;

    if (key === "Escape") {
      event.preventDefault();
      toggleSourceViewer(false);
      return;
    }
    if (key === "[" || key === "PageUp") {
      event.preventDefault();
      cycleActiveSourceItem(-1);
      return;
    }
    if (key === "]" || key === "PageDown") {
      event.preventDefault();
      cycleActiveSourceItem(1);
      return;
    }
    if (key === "+" || key === "=") {
      event.preventDefault();
      changeSourceZoom(10);
      return;
    }
    if (key === "-" || key === "_") {
      event.preventDefault();
      changeSourceZoom(-10);
      return;
    }
    if (lower === "f" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      resetSourceZoom();
      return;
    }
    if (lower === "o" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      openActiveSourceExternally();
    }
  });
}

function renderSourcePreviewError(item, error) {
  const fallbackText = String(item?.content || "").trim();
  const url = item?.blob ? makeSourceObjectUrl(item) : "";
  const nativePdf = canUseNativePdfPreview(item);
  if (nativePdf) {
    renderNativePdfPreview(item);
    return;
  }
  sourceViewerBody.innerHTML = `
    <div class="source-file-preview">
      <i class="bi ${sourceIcon(item?.kind)}"></i>
      <h3>${escapeHTML(item?.name || "Uploaded source")}</h3>
      <p>${escapeHTML(error?.message || item?.previewError || "This source could not be previewed.")}</p>
      <div class="source-file-preview-actions">
        ${fallbackText ? `<button class="source-inline-action" type="button" onclick="renderSourceTextFallback('${escapeAttr(item.id)}')">Show extracted text</button>` : ""}
        ${url ? `<a class="source-inline-action" href="${escapeAttr(url)}" download="${escapeAttr(item?.name || "source")}">Download original source</a>` : ""}
        ${item?.id ? `<button class="source-inline-action" type="button" onclick="retryActiveSourcePreview('${escapeAttr(item.id)}')">Retry preview</button>` : ""}
      </div>
      ${fallbackText ? `<pre class="source-text-preview source-preview-progress-text" style="font-size:${Math.max(0.78, sourceViewerZoom / 100)}rem">${escapeHTML(fallbackText.slice(0, 8000))}${fallbackText.length > 8000 ? "\n\n…" : ""}</pre>` : ""}
    </div>
  `;
}

function retryActiveSourcePreview(id) {
  const item = sourceViewerItems.find(entry => entry.id === id) || sourceViewerItems.find(entry => entry.id === activeSourceItemId);
  if (!item) return;
  item.preview = null;
  item.previewError = "";
  item.previewPrefetchFailed = false;
  activeSourceItemId = item.id;
  renderSourceViewer();
}

function renderSourceTextFallback(id) {
  const item = sourceViewerItems.find(entry => entry.id === id);
  if (!item) return;
  activeSourceItemId = item.id;
  sourceViewerBody.innerHTML = `
    <pre class="source-text-preview" style="font-size:${Math.max(0.78, sourceViewerZoom / 100)}rem">${escapeHTML(item.content || "No extracted source text is available.")}</pre>
  `;
}

function renderStructuredSourcePreview(preview, item) {
  if (!preview || preview.error) {
    renderSourcePreviewError(item, new Error(preview?.error || "Source preview could not be generated."));
    return;
  }

  if (preview.kind === "pdf") {
    const pages = Array.isArray(preview.pages) ? preview.pages : [];
    const scale = Math.max(70, Math.min(160, sourceViewerZoom));
    sourceViewerBody.innerHTML = `
      <div class="source-structured-preview source-pdf-clean-preview">
        ${preview.warning ? `<div class="source-preview-notice"><i class="bi bi-info-circle"></i>${escapeHTML(preview.warning)}</div>` : ""}
        ${pages.length ? `
          <div class="source-pdf-pages" style="--source-pdf-page-width:${scale}%">
            ${pages.map(page => `
              <article class="source-pdf-page" aria-label="PDF page ${Number(page.number || 0) || ""}">
                <img src="${escapeAttr(page.image)}" alt="PDF page ${Number(page.number || 0) || ""}">
                <span class="source-pdf-page-number">Page ${Number(page.number || 0) || ""}${preview.page_count ? ` / ${Number(preview.page_count)}` : ""}</span>
              </article>
            `).join("")}
          </div>
        ` : `
          <div class="source-viewer-empty">
            <i class="bi bi-file-earmark-pdf"></i>
            <h3>No PDF pages could be rendered</h3>
            <p>Use Open in the source toolbar to view the original file.</p>
          </div>
        `}
      </div>
    `;
    return;
  }

  if (preview.kind === "presentation") {
    const slides = Array.isArray(preview.slides) ? preview.slides : [];
    const scale = Math.max(70, Math.min(160, sourceViewerZoom));
    const slidePages = slides.filter(slide => sourceSlidePageUrl(slide));
    const totalSlides = Number(preview.slide_count || slides.length || slidePages.length || 0);
    const shownSlides = Number(preview.shown_count || slidePages.length || slides.length || 0);
    const sourceUrl = sourcePresentationFileUrl(item);
    const downloadName = item?.name || `${preview.title || "presentation"}.pptx`;
    const renderLabel = sourcePresentationRenderLabel(preview);
    if (!slidePages.length) {
      sourceViewerBody.innerHTML = `
        <div class="source-structured-preview source-presentation-preview source-presentation-unavailable">
          <div class="source-viewer-empty">
            <i class="bi bi-file-earmark-slides"></i>
            <h3>Full slide preview is unavailable</h3>
            <p>Synapse could not render this presentation as complete slide pages. For a production deployment, install LibreOffice on the backend or ask users to upload/export the deck as PDF.</p>
            ${sourceUrl ? `<a class="source-inline-action" href="${escapeAttr(sourceUrl)}" download="${escapeAttr(downloadName)}">Download original presentation</a>` : ""}
            ${preview.warning ? `<p class="source-slide-muted">${escapeHTML(preview.warning)}</p>` : ""}
          </div>
        </div>
      `;
      return;
    }

    sourceViewerBody.innerHTML = `
      <div class="source-structured-preview source-presentation-preview has-slide-pages">
        <div class="source-slide-reader">
          <div class="source-slide-reader-bar">
            <div>
              <span class="source-slide-reader-kicker">Slide reader</span>
              <strong>${shownSlides}${totalSlides ? ` / ${totalSlides}` : ""} slides</strong>
              <small>${escapeHTML(renderLabel)}</small>
            </div>
            ${sourceUrl ? `<a class="source-open-action secondary" href="${escapeAttr(sourceUrl)}" download="${escapeAttr(downloadName)}"><i class="bi bi-download"></i>Download original</a>` : ""}
          </div>
          ${preview.warning ? `<div class="source-preview-notice source-preview-notice-compact"><i class="bi bi-info-circle"></i>${escapeHTML(preview.warning)}</div>` : ""}
          <div class="source-slide-pages" style="--source-slide-page-width:${scale}%">
            ${slidePages.map(slide => {
              const number = Number(slide.number || 0) || "";
              const label = number ? `Slide ${number}${totalSlides ? ` / ${totalSlides}` : ""}` : "Slide";
              return `
                <figure class="source-slide-page" aria-label="${escapeAttr(label)}">
                  <img loading="lazy" decoding="async" src="${escapeAttr(sourceSlidePageUrl(slide))}" alt="${escapeAttr(label)}">
                  <figcaption class="source-slide-page-number">${escapeHTML(label)}</figcaption>
                </figure>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;
    return;
  }

  const text = preview.text || item.content || "";
  sourceViewerBody.innerHTML = `
    <div class="source-structured-preview">
      <article class="source-slide-card">
        <div class="source-slide-header">
          <span>${escapeHTML(preview.kind || item.kind || "source")}</span>
          <strong>${escapeHTML(preview.title || item.title || item.name || "Uploaded source")}</strong>
        </div>
        <div class="source-slide-text">${markdownToHTML(text || "No readable text preview is available.")}</div>
      </article>
    </div>
  `;
  renderMath();
}

function renderSourceOpenActions(url, label = "Open full source", downloadName = "") {
  if (!url) return "";
  const downloadAttr = downloadName ? ` download="${escapeAttr(downloadName)}"` : "";
  return `
    <div class="source-open-actions">
      <a class="source-open-action" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">
        <i class="bi bi-box-arrow-up-right"></i>${escapeHTML(label)}
      </a>
      ${downloadName ? `
        <a class="source-open-action secondary" href="${escapeAttr(url)}"${downloadAttr}>
          <i class="bi bi-download"></i>Download
        </a>
      ` : ""}
    </div>
  `;
}

function renderYoutubeSourcePreview(item) {
  const watchUrl = youtubeWatchUrlFromItem(item);
  const embedUrl = youtubeEmbedUrlFromItem(item);
  const title = item.title || item.displayName || item.name || "YouTube source";
  const transcriptState = getYoutubeTranscriptState(item.content || "");
  const videoId = getYouTubeVideoIdClient(watchUrl || item?.sourceIdentity || item?.originalUrl || item?.url);
  sourceViewerBody.innerHTML = `
    <div class="source-youtube-stage">
      ${embedUrl ? `
        <div class="source-youtube-embed">
          <iframe
            title="${escapeAttr(title)}"
            src="${escapeAttr(embedUrl)}"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen></iframe>
        </div>
      ` : `
        <div class="source-link-preview source-link-preview-inline">
          <i class="bi bi-youtube"></i>
          <h3>YouTube source</h3>
          <p>${escapeHTML(watchUrl || "No playable YouTube URL was saved with this source.")}</p>
        </div>
      `}
      <div class="source-youtube-info">
        <div>
          <span class="source-youtube-kicker">Linked video source</span>
          <h3>${escapeHTML(title)}</h3>
          <p>${escapeHTML(watchUrl || "This video was expanded from a link inside the uploaded material.")}</p>
          ${videoId ? `<p class="source-youtube-id">Video ID: ${escapeHTML(videoId)}</p>` : ""}
        </div>
        ${watchUrl ? `<a class="source-open-action" href="${escapeAttr(watchUrl)}" target="_blank" rel="noopener"><i class="bi bi-youtube"></i>Open on YouTube</a>` : ""}
      </div>
      ${watchUrl ? `
        <div class="source-preview-notice">
          <i class="bi bi-info-circle"></i>
          <span>If YouTube blocks embedded playback for this video, use <strong>Open on YouTube</strong>. When YouTube exposes captions, Synapse stores them below for analysis.</span>
        </div>
      ` : ""}
      ${transcriptState.hasReadableTranscript ? `
        <details class="source-transcript-panel" open>
          <summary>Transcript / extracted source text</summary>
          <pre>${escapeHTML(transcriptState.transcript)}</pre>
        </details>
      ` : `
        <div class="source-preview-notice source-preview-transcript-empty">
          <i class="bi bi-info-circle"></i>
          <span>
            <strong>Transcript is not available from this YouTube source.</strong>
            YouTube did not expose a readable caption/transcript to Synapse for this video. Use Open on YouTube to review captions, or upload a transcript/caption file to include it in analysis.
          </span>
        </div>
      `}
    </div>
  `;
}

function renderSourceViewerBody(item) {
  if (!sourceViewerBody || !item) return;
  setSourceViewerNativePdfMode(canUseNativePdfPreview(item));
  const meta = sourceMetaLine(item);
  const externalUrl = sourceExternalUrl(item);
  const sourceTitle = item.title || item.name || "Uploaded source";
  if (sourceViewerTitle) {
    if (externalUrl && (item.kind === "link" || item.kind === "youtube")) {
      sourceViewerTitle.innerHTML = `
        <a class="source-toolbar-link" href="${escapeAttr(externalUrl)}" target="_blank" rel="noopener noreferrer">
          ${escapeHTML(sourceTitle)}
        </a>
      `;
    } else {
      sourceViewerTitle.textContent = sourceTitle;
    }
  }
  if (sourceViewerMeta) sourceViewerMeta.textContent = meta || "Source preview";
  if (sourceZoomLabel) sourceZoomLabel.textContent = `${sourceViewerZoom}%`;

  if (item.kind === "image" && item.blob) {
    const url = makeSourceObjectUrl(item);
    sourceViewerBody.innerHTML = `
      <div class="source-image-stage">
        ${renderSourceOpenActions(url, "Open full image", item.name || "source")}
        <img src="${escapeAttr(url)}" alt="${escapeAttr(item.name)}" style="width:${sourceViewerZoom}%">
      </div>
    `;
    return;
  }

  if (canUseNativePdfPreview(item)) {
    renderNativePdfPreview(item);
    return;
  }

  if (canUseBackendSourcePreview(item)) {
    if (item.preview) {
      const presentationPreviewHasSlidePages =
        item.preview.kind === "presentation" &&
        (item.preview.slides || []).some((slide) => sourceSlidePageUrl(slide));
      if (item.kind !== "presentation" || presentationPreviewHasSlidePages) {
        renderStructuredSourcePreview(item.preview, item);
        return;
      }
    }
    // Allow a fresh attempt when the user opens the source after a background miss.
    item.previewPrefetchFailed = false;
    renderSourcePreviewLoading(item);
    const expectedItemId = item.id;
    fetchSourcePreview(item, { attempts: 3 })
      .then(preview => {
        if (activeSourceItemId !== expectedItemId) return;
        renderStructuredSourcePreview(preview, item);
      })
      .catch(error => {
        item.previewError = error?.message || "Source preview failed.";
        if (activeSourceItemId !== expectedItemId) return;
        renderSourcePreviewError(item, error);
      });
    return;
  }

  if ((item.kind === "presentation" || item.kind === "document") && item.content && !item.blob) {
    sourceViewerBody.innerHTML = `
      <div class="source-structured-preview">
        <div class="source-preview-notice"><i class="bi bi-info-circle"></i>The original file was not restored, so Synapse is showing the extracted source text saved with this note.</div>
        <article class="source-slide-card">
          <div class="source-slide-header">
            <span>${escapeHTML(item.kind)}</span>
            <strong>${escapeHTML(item.title || item.name || "Uploaded source")}</strong>
          </div>
          <div class="source-slide-text">${markdownToHTML(item.content)}</div>
        </article>
      </div>
    `;
    renderMath();
    return;
  }

  if (item.kind === "text" || item.kind === "note") {
    sourceViewerBody.innerHTML = `<div class="source-text-stage"><div class="source-loading">Loading source text...</div></div>`;
    const expectedItemId = item.id;
    readSourceText(item).then(text => {
      if (activeSourceItemId !== expectedItemId) return;
      sourceViewerBody.innerHTML = `
        <pre class="source-text-preview" style="font-size:${Math.max(0.78, sourceViewerZoom / 100)}rem">${escapeHTML(text || "No readable text preview is available.")}</pre>
      `;
    });
    return;
  }

  if (item.kind === "youtube" || item.kind === "link") {
    if (item.kind === "youtube") {
      renderYoutubeSourcePreview(item);
      return;
    }
    const rawUrl = item.originalUrl || item.url || "";
    const url = safeExternalSourceUrl(rawUrl);
    sourceViewerBody.innerHTML = `
      <div class="source-link-preview">
        <i class="bi ${sourceIcon(item.kind)}"></i>
        <h3>${escapeHTML(item.kind === "youtube" ? "YouTube source" : "Web source")}</h3>
        <p class="source-link-url">
          ${url
            ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(rawUrl || url)}</a>`
            : escapeHTML(rawUrl || "No source URL was saved for this link.")}
        </p>
        ${url ? renderSourceOpenActions(url, "Open source link") : ""}
      </div>
    `;
    return;
  }

  const url = item.blob ? makeSourceObjectUrl(item) : "";
  sourceViewerBody.innerHTML = `
    <div class="source-file-preview">
      <i class="bi ${sourceIcon(item.kind)}"></i>
      <h3>${escapeHTML(item.name || "Uploaded source")}</h3>
      <p>${escapeHTML(meta || "Synapse analysed this file. Browser preview is not available for this file type.")}</p>
      ${url ? `<a href="${escapeAttr(url)}" download="${escapeAttr(item.name || "source")}">Download original source</a>` : ""}
    </div>
  `;
}

function makeHistoryTitle(source, fallback = "Generated Study Notes") {
  const raw = typeof source === "object" && source !== null
    ? (source.title || source.summary || source.fullSummary || "")
    : String(source || "");

  const text = normaliseTitleText(raw);
  if (!text) return fallback;

  const explicitTopicPatterns = [
    /\b(FINEARTS\s*\d{3,4}[A-Z]?\s*[-–—:]?\s*[^.\n,;:]{0,55})/i,
    /\b(WTRENG\s*\d{3,4}[A-Z]?\s*[-–—:]?\s*[^.\n,;:]{0,55})/i,
    /\b([A-Z]{2,}\s*\d{3,4}[A-Z]?\s*[-–—:]?\s*[^.\n,;:]{0,55})/,
    /\b([A-Z][A-Za-z\s]+ Act\s+\d{4})\b/,
    /\b(Zero Carbon Act|Privacy Act|Resource Management Act|GDPR|Legislation Act\s+\d{4})\b/i,
    /\b(Pythagorean Theorem|Curvature of Vector Function|Cross Product|Infant Incubator|AI-powered|AI powered)[^.\n,;:]*/i
  ];

  for (const pattern of explicitTopicPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) return cleanTitle(match[1], fallback);
  }

  const topicPatterns = [
    /(?:source material|material|document|lesson|video|workshop|case study)\s+(?:is|was|appears to be|focuses on|examines|explores|discusses|covers|teaches|is related to)\s+(?:a|an|the)?\s*([^.;\n]{10,110})/i,
    /(?:focuses on|examines|explores|discusses|covers|teaches|demonstrates|shows)\s+(?:how to\s+)?(?:a|an|the)?\s*([^.;\n]{10,110})/i,
    /(?:about|on)\s+(?:a|an|the)?\s*([^.;\n]{10,90})/i
  ];

  for (const pattern of topicPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) return cleanTitle(match[1], fallback);
  }

  const firstUseful = text
    .split(/[.!?。！？]/)
    .map(part => part.trim())
    .find(part => part.length > 10 && !/^(synapse summary|summary|core argument|key ideas)$/i.test(part));

  return cleanTitle(firstUseful || text, fallback);
}

function normaliseTitleText(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[#*_`]/g, "")
    .replace(/\\\[|\\\]|\\\(|\\\)/g, " ")
    .replace(/^\s*Synapse Summary[:\s-]*/i, "")
    .replace(/^\s*Summary[:\s-]*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(title, fallback = "Generated Study Notes") {
  let cleaned = normaliseTitleText(title)
    .replace(/^(that|the|this|source material|material|document|lesson|video|workshop|case study)\s+/i, "")
    .replace(/^(how to|understanding how to|understanding|to demonstrate how to|demonstrate how to)\s+/i, "")
    .replace(/\s+(which|that|because|where|while|through|by|including|with)\s+.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return fallback;

  const words = cleaned.split(" ");
  let sliced = words.slice(0, 7).join(" ");

  if (/^(to|how|appears|related|based|source|material|document)\b/i.test(sliced) && words.length > 7) {
    sliced = words.slice(1, 8).join(" ");
  }

  sliced = sliced.replace(/[,:;\-–—]+$/g, "").trim();

  if (sliced.split(" ").length <= 2 && words.length > 2 && !/[A-Z]{2,}|\d{4}/.test(sliced)) {
    sliced = words.slice(0, 5).join(" ");
  }

  return shorten(sliced || fallback, 58);
}

function isCompanionHistoryItem(item = {}) {
  return item?.kind === "companion"
    || Boolean(item?.companionThreadId)
    || String(item?.id || "").startsWith("companion:");
}

function companionThreadIdFromHistoryItem(item = {}) {
  const explicit = String(item?.companionThreadId || "").trim();
  if (explicit) return explicit;
  const id = String(item?.id || "").trim();
  return id.startsWith("companion:") ? id.slice("companion:".length) : id;
}

function syncCompanionThreadToHistory(thread) {
  if (!thread || typeof thread !== "object") return null;
  const hasUser = typeof window.__synapseCompanionChat?.hasUserContent === "function"
    ? window.__synapseCompanionChat.hasUserContent(thread)
    : Array.isArray(thread.messages) && thread.messages.some(message => message?.role === "user" && String(message?.content || "").trim());
  if (!hasUser) return null;

  const threadId = String(thread.id || "").trim();
  if (!threadId) return null;
  const title = typeof window.__synapseCompanionChat?.titleFrom === "function"
    ? window.__synapseCompanionChat.titleFrom(thread)
    : "Learning companion chat";
  const historyId = typeof window.__synapseCompanionChat?.historyId === "function"
    ? window.__synapseCompanionChat.historyId(threadId)
    : `companion:${threadId}`;

  return saveHistoryEntry({
    kind: "companion",
    id: historyId,
    companionThreadId: threadId,
    title,
    summary: title,
    sections: {},
    createdAt: thread.createdAt || undefined,
    updatedAt: thread.updatedAt || new Date().toISOString(),
  });
}

function saveHistoryEntry(payload) {
  const items = getHistory();
  const isCompanion = payload?.kind === "companion" || Boolean(payload?.companionThreadId) || String(payload?.id || "").startsWith("companion:");

  if (isCompanion) {
    const companionThreadId = companionThreadIdFromHistoryItem(payload);
    const historyId = String(payload.id || "").trim() || `companion:${companionThreadId}`;
    const existingIndex = items.findIndex(item =>
      isCompanionHistoryItem(item)
      && (
        item.id === historyId
        || companionThreadIdFromHistoryItem(item) === companionThreadId
      )
    );
    const rawTitle = String(payload.title || payload.summary || "Learning companion chat").replace(/\s+/g, " ").trim();
    const entry = {
      ...payload,
      kind: "companion",
      id: existingIndex >= 0 ? items[existingIndex].id : historyId,
      companionThreadId,
      title: shorten(rawTitle, 72) || "Learning companion chat",
      summary: payload.summary || payload.title || "",
      sections: {},
      createdAt: existingIndex >= 0
        ? items[existingIndex].createdAt
        : (payload.createdAt || new Date().toISOString()),
      updatedAt: payload.updatedAt || new Date().toISOString(),
      sourceFingerprint: "",
      clientFingerprint: "",
      databaseRecord: null,
    };
    const nextItems = existingIndex >= 0
      ? [entry, ...items.filter((_, index) => index !== existingIndex)]
      : [entry, ...items];
    setHistory(nextItems);
    currentHistoryId = entry.id;
    safeSetLocalStorage(ACTIVE_HISTORY_KEY, entry.id);
    renderHistory();
    return entry;
  }

  const sourceFingerprint = payload.sourceFingerprint || payload.clientFingerprint || currentSourceFingerprint || "";
  const databaseRecord = payload.databaseRecord || payload.database_record || null;
  const databaseId = String(databaseRecord?.id || "").trim();
  const existingIndex = items.findIndex(item => {
    if (isCompanionHistoryItem(item)) return false;
    const itemDatabaseId = String(item?.databaseRecord?.id || item?.database_record?.id || "").trim();
    if (databaseId && itemDatabaseId === databaseId) return true;
    return Boolean(
      sourceFingerprint &&
      (item.sourceFingerprint === sourceFingerprint || item.clientFingerprint === sourceFingerprint)
    );
  });
  const historyId = existingIndex >= 0
    ? items[existingIndex].id
    : (databaseId || Date.now().toString());

  const entry = {
    ...payload,
    kind: payload.kind || "materials",
    id: historyId,
    title: makeHistoryTitle(payload.title || payload.summary),
    createdAt: existingIndex >= 0 ? items[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceFingerprint,
    clientFingerprint: payload.clientFingerprint || sourceFingerprint,
    databaseRecord: databaseRecord
      ? { ...databaseRecord, id: databaseId || historyId }
      : (existingIndex >= 0 ? items[existingIndex].databaseRecord || items[existingIndex].database_record || null : null),
  };

  const nextItems = existingIndex >= 0
    ? [entry, ...items.filter((_, index) => index !== existingIndex)]
    : [entry, ...items];

  setHistory(nextItems);
  currentHistoryId = entry.id;
  safeSetLocalStorage(ACTIVE_HISTORY_KEY, entry.id);
  renderHistory();
  if (typeof renderFocusRoomWorkspaceActions === "function") renderFocusRoomWorkspaceActions();
  if (typeof notifyFocusRoomMaterialsChanged === "function") notifyFocusRoomMaterialsChanged();
  return entry;
}

let historySyncPromise = null;

function historyIdentityKeys(item = {}) {
  const keys = [];
  const entryId = String(item.id || "").trim();
  const databaseId = String(item?.databaseRecord?.id || item?.database_record?.id || "").trim();
  const sourceFingerprint = String(item.sourceFingerprint || item.source_fingerprint || "").trim();
  const clientFingerprint = String(item.clientFingerprint || item.client_fingerprint || "").trim();
  if (entryId) keys.push(`id:${entryId}`);
  if (databaseId) keys.push(`db:${databaseId}`);
  if (sourceFingerprint) keys.push(`fp:${sourceFingerprint}`);
  if (clientFingerprint) keys.push(`cf:${clientFingerprint}`);
  return keys;
}

function historyTimestampValue(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeRemoteHistoryEntry(item = {}) {
  const visuals = compactVisualGalleryForStorage(item.visual_gallery || item.visuals || item.visualGallery || []);
  const databaseRecord = item.databaseRecord || item.database_record || {
    id: item.id,
    user_id: item.user_id,
    source_fingerprint: item.source_fingerprint,
    created_at: item.created_at,
    updated_at: item.updated_at
  };
  const entry = {
    id: String(item.id || "").trim(),
    kind: "materials",
    title: makeHistoryTitle(item.title || item.summary),
    summary: item.summary || "",
    sections: item.sections || {},
    connections: item.connections || [],
    mindMap: item.mind_map || item.mindMap || null,
    visualGallery: visuals,
    language: item.output_language || item.language || "",
    detailLevel: item.detail_level || item.detailLevel || "",
    promptMode: item.prompt_mode || item.promptMode || "professor_mode",
    primarySourceIdentity: item.primary_source_identity || item.source_identity || item.primarySourceIdentity || "",
    sourceFingerprint: item.source_fingerprint || item.sourceFingerprint || "",
    clientFingerprint: item.client_fingerprint || item.clientFingerprint || item.source_fingerprint || item.sourceFingerprint || "",
    sources: Array.isArray(item.sources) ? item.sources : [],
    sourceItems: Array.isArray(item.sourceItems) ? item.sourceItems : [],
    visualGalleryCount: visuals.length,
    databaseRecord,
    cached: Boolean(item.cached),
    createdAt: item.created_at || item.createdAt || new Date().toISOString(),
    updatedAt: item.updated_at || item.updatedAt || item.created_at || item.createdAt || new Date().toISOString(),
  };
  if (!entry.title) entry.title = "Generated Study Notes";
  return entry;
}

function mergeHistoryItem(localItem = {}, remoteItem = {}) {
  const localVisuals = Array.isArray(localItem.visualGallery) ? localItem.visualGallery : [];
  const remoteVisuals = Array.isArray(remoteItem.visualGallery) ? remoteItem.visualGallery : [];
  const localSources = Array.isArray(localItem.sources) ? localItem.sources : [];
  const remoteSources = Array.isArray(remoteItem.sources) ? remoteItem.sources : [];
  const localSourceItems = Array.isArray(localItem.sourceItems) ? localItem.sourceItems : [];
  const remoteSourceItems = Array.isArray(remoteItem.sourceItems) ? remoteItem.sourceItems : [];
  const localSections = localItem.sections && typeof localItem.sections === "object" ? localItem.sections : {};
  const remoteSections = remoteItem.sections && typeof remoteItem.sections === "object" ? remoteItem.sections : {};
  const localConnections = Array.isArray(localItem.connections) ? localItem.connections : [];
  const remoteConnections = Array.isArray(remoteItem.connections) ? remoteItem.connections : [];

  return {
    ...localItem,
    ...remoteItem,
    id: localItem.id || remoteItem.id,
    title: remoteItem.title || localItem.title || "Generated Study Notes",
    summary: remoteItem.summary || localItem.summary || "",
    sections: Object.keys(remoteSections).length ? remoteSections : localSections,
    connections: remoteConnections.length ? remoteConnections : localConnections,
    mindMap: remoteItem.mindMap || localItem.mindMap || null,
    visualGallery: remoteVisuals.length ? remoteVisuals : localVisuals,
    sources: remoteSources.length ? remoteSources : localSources,
    sourceItems: localSourceItems.length ? localSourceItems : remoteSourceItems,
    sourceFingerprint: remoteItem.sourceFingerprint || localItem.sourceFingerprint || "",
    clientFingerprint: remoteItem.clientFingerprint || localItem.clientFingerprint || remoteItem.sourceFingerprint || localItem.sourceFingerprint || "",
    visualGalleryCount: remoteVisuals.length ? remoteVisuals.length : Number(localItem.visualGalleryCount || localVisuals.length || 0),
    databaseRecord: remoteItem.databaseRecord || localItem.databaseRecord || null,
    createdAt: localItem.createdAt || remoteItem.createdAt || new Date().toISOString(),
    updatedAt: remoteItem.updatedAt || localItem.updatedAt || localItem.createdAt || remoteItem.createdAt || new Date().toISOString(),
  };
}

async function syncHistoryWithDataApi(limit = 50) {
  if (typeof fetchGeneratedContentFromDataApi !== "function") return getHistory();
  if (historySyncPromise) return historySyncPromise;

  historySyncPromise = (async () => {
    let remoteItems = [];
    try {
      remoteItems = await fetchGeneratedContentFromDataApi(limit);
    } catch (error) {
      console.warn("Could not sync generated note history from the data API:", error);
      return getHistory();
    }

    if (!Array.isArray(remoteItems) || !remoteItems.length) {
      return getHistory();
    }

    const localItems = getHistory();
    const localIndexByKey = new Map();
    localItems.forEach((item, index) => {
      historyIdentityKeys(item).forEach(key => {
        if (!localIndexByKey.has(key)) localIndexByKey.set(key, index);
      });
    });

    const usedLocalIndices = new Set();
    const mergedItems = [];

    remoteItems
      .map(normalizeRemoteHistoryEntry)
      .forEach(remoteItem => {
        const localIndex = historyIdentityKeys(remoteItem).reduce((match, key) => {
          if (match >= 0) return match;
          const candidate = localIndexByKey.get(key);
          return Number.isInteger(candidate) ? candidate : -1;
        }, -1);

        if (localIndex >= 0) {
          usedLocalIndices.add(localIndex);
          mergedItems.push(mergeHistoryItem(localItems[localIndex], remoteItem));
          return;
        }

        mergedItems.push(remoteItem);
      });

    localItems.forEach((item, index) => {
      // Keep local-only companion chats and any unmatched materials entries.
      if (!usedLocalIndices.has(index)) mergedItems.push(item);
    });

    const nextItems = mergedItems
      .filter(item => item && item.id)
      .sort((left, right) => historyTimestampValue(right.updatedAt || right.createdAt) - historyTimestampValue(left.updatedAt || left.createdAt))
      .slice(0, 30);

    setHistory(nextItems);
    renderHistory(historySearch ? historySearch.value : "");
    if (typeof renderFocusRoomWorkspaceActions === "function") renderFocusRoomWorkspaceActions();
    if (typeof notifyFocusRoomMaterialsChanged === "function") notifyFocusRoomMaterialsChanged();
    return nextItems;
  })();

  try {
    return await historySyncPromise;
  } finally {
    historySyncPromise = null;
  }
}

function findHistoryByFingerprint(fingerprint) {
  if (!fingerprint) return null;
  return getHistory().find(item =>
    item.sourceFingerprint === fingerprint ||
    item.clientFingerprint === fingerprint
  ) || null;
}

function renderHistory(filter = "") {
  const query = String(filter || "").toLowerCase().trim();
  const items = getHistory().filter(item => {
    const kindLabel = isCompanionHistoryItem(item) ? "companion chat learning companion" : "materials generated notes";
    const haystack = `${item.title || ""} ${item.summary || ""} ${kindLabel}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  const jobs = typeof getVisibleGenerationJobs === "function"
    ? getVisibleGenerationJobs(query, items.map(item => item.id))
    : [];
  const broadcastJobs = typeof getVisibleBroadcastJobs === "function"
    ? getVisibleBroadcastJobs(query)
    : [];

  const html = renderHistoryItemsHTML(items, jobs, broadcastJobs, query);
  if (historyList) historyList.innerHTML = html;
  if (mobileHistoryList) mobileHistoryList.innerHTML = html;
}

function renderHistoryItemsHTML(items, jobs = [], broadcastJobs = [], filter = "") {
  if (!items.length && !jobs.length && !broadcastJobs.length) {
    if (String(filter || "").trim()) {
      return `<p class="history-empty">No matching notes or companion chats yet.</p>`;
    }
    return `
      <div class="history-empty-state">
        <p class="history-empty">No notes or companion chats yet.</p>
        <button class="history-empty-cta" type="button" onclick="setLearningExperienceMode('materials')">
          Upload material to start
        </button>
      </div>
    `;
  }

  const jobHtml = jobs.map(job => renderGenerationJobHistoryItemHTML(job)).join("");
  const broadcastJobHtml = broadcastJobs.map(job => renderBroadcastJobHistoryItemHTML(job)).join("");
  const itemHtml = items.map(item => {
    const companion = isCompanionHistoryItem(item);
    const kindLabel = companion ? "Companion" : "Materials";
    const kindClass = companion ? "companion" : "materials";
    const displayTitle = companion
      ? (String(item.title || item.summary || "Learning companion chat").trim() || "Learning companion chat")
      : makeHistoryTitle(item);
    const expandControls = companion ? "" : `
      <button class="history-item-expand-btn" type="button" aria-expanded="false"
              aria-controls="${historySectionsDomId(item.id)}"
              title="Show generated sections"
              aria-label="Show generated sections for ${escapeAttr(displayTitle)}"
              onclick="toggleGeneratedHistorySections(event, '${escapeAttr(item.id)}')">
        <i class="bi bi-chevron-down"></i>
      </button>
      <div id="${historySectionsDomId(item.id)}" class="generated-history-sections" hidden></div>
    `;
    return `
    <div class="history-item-wrap ${companion ? "companion-history-item-wrap" : "generated-history-item-wrap"}" data-history-kind="${kindClass}">
      <button class="history-item" type="button" onclick="loadHistoryEntry('${escapeAttr(item.id)}')">
        <div class="history-item-kind history-item-kind--${kindClass}">
          <i class="bi ${companion ? "bi-chat-dots" : "bi-collection"}" aria-hidden="true"></i>
          <span>${kindLabel}</span>
        </div>
        <div class="history-item-title">${escapeHTML(displayTitle)}</div>
        <div class="history-item-meta">${formatHistoryDate(item.updatedAt || item.createdAt)}</div>
      </button>
      ${expandControls}
      <button class="history-delete-btn" type="button"
              title="Delete this history item"
              aria-label="Delete ${escapeAttr(displayTitle)}"
              onclick="deleteHistoryEntry(event, '${escapeAttr(item.id)}')">
        <i class="bi bi-trash3"></i>
      </button>
    </div>
  `;
  }).join("");
  return `${jobHtml}${broadcastJobHtml}${itemHtml}`;
}

function historySectionsDomId(id) {
  return `generated-history-sections-${String(id || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function historySectionTitles(item) {
  const storedTitles = Array.isArray(item?.generatedSectionTitles) ? item.generatedSectionTitles : [];
  const sectionTitles = item?.sections && typeof item.sections === "object" ? Object.keys(item.sections) : [];
  return [...new Set([...storedTitles, ...sectionTitles].map(title => String(title || "").trim()).filter(Boolean))];
}

function renderGeneratedHistorySections(item, message = "Open this note to load its generated sections.") {
  const titles = historySectionTitles(item);
  if (!titles.length) return `<p class="generated-history-sections-empty">${escapeHTML(message)}</p>`;
  return titles.map(title => `
    <button class="generated-history-section-link" type="button"
            onclick="openGeneratedHistorySection(event, '${escapeAttr(item.id)}', '${escapeAttr(title)}')">
      <i class="bi bi-list-nested"></i>
      <span>${escapeHTML(title)}</span>
    </button>
  `).join("");
}

async function loadGeneratedHistorySectionTitles(item) {
  if (historySectionTitles(item).length || typeof fetchGeneratedContentSectionsFromDataApi !== "function") return historySectionTitles(item);
  const contentId = String(item?.databaseRecord?.id || item?.database_record?.id || item?.id || "").trim();
  if (!contentId) return [];
  const titles = [];
  let page = 1;
  let pageData = await fetchGeneratedContentSectionsFromDataApi(contentId, page, 50);
  while (pageData) {
    (Array.isArray(pageData.items) ? pageData.items : []).forEach(section => {
      const title = String(section?.title || "").trim();
      if (title && !titles.includes(title)) titles.push(title);
    });
    if (!pageData.has_next) break;
    page += 1;
    pageData = await fetchGeneratedContentSectionsFromDataApi(contentId, page, 50);
  }
  item.generatedSectionTitles = titles;
  setHistory(getHistory().map(entry => entry.id === item.id ? { ...entry, generatedSectionTitles: titles } : entry));
  return titles;
}

async function toggleGeneratedHistorySections(event, id) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const item = getHistory().find(entry => entry.id === id);
  const container = document.getElementById(historySectionsDomId(id));
  const button = event?.currentTarget;
  if (!item || !container || !button) return;
  const expanded = button.getAttribute("aria-expanded") === "true";
  button.setAttribute("aria-expanded", expanded ? "false" : "true");
  button.querySelector("i")?.classList.toggle("bi-chevron-up", !expanded);
  button.querySelector("i")?.classList.toggle("bi-chevron-down", expanded);
  container.hidden = expanded;
  if (expanded || container.dataset.loaded === "true") return;
  container.innerHTML = `<p class="generated-history-sections-loading"><i class="bi bi-arrow-repeat"></i> Loading generated sections…</p>`;
  try {
    await loadGeneratedHistorySectionTitles(item);
    container.innerHTML = renderGeneratedHistorySections(item, "No generated section titles are available for this note yet.");
    container.dataset.loaded = "true";
  } catch (error) {
    console.warn("Could not load generated section titles:", error);
    container.innerHTML = renderGeneratedHistorySections(item, "Sections could not be loaded. Open the note to try again.");
  }
}

async function openGeneratedHistorySection(event, id, title) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  await loadHistoryEntry(id, { preserveScroll: false });
  if (sections && Object.prototype.hasOwnProperty.call(sections, title)) renderSectionNotes(title);
}

function closeMobileNavIfOpen() {
  const mobileNav = document.getElementById("mobileNav");
  if (!mobileNav || typeof bootstrap === "undefined") return;
  const instance = bootstrap.Offcanvas.getInstance(mobileNav);
  if (instance) instance.hide();
}

async function deleteHistoryEntry(event, id) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  openHistoryDeletionDialog(id);
}

async function destroyHistoryEntry(id) {
  const items = getHistory();
  const target = items.find(item => item.id === id);

  if (isCompanionHistoryItem(target)) {
    const threadId = companionThreadIdFromHistoryItem(target);
    if (threadId && typeof window.__synapseCompanionChat?.delete === "function") {
      window.__synapseCompanionChat.delete(threadId);
    }
    setHistory(items.filter(item => item.id !== id));
    if (currentHistoryId === id) {
      currentHistoryId = "";
      safeRemoveLocalStorage(ACTIVE_HISTORY_KEY);
    }
    renderHistory(historySearch ? historySearch.value : "");
    return;
  }

  const remoteId = String(target?.databaseRecord?.id || target?.database_record?.id || target?.id || "").trim();
  if (remoteId && typeof deleteGeneratedContentFromDataApi === "function") {
    try {
      await deleteGeneratedContentFromDataApi(remoteId);
    } catch (error) {
      console.warn(`Could not delete generated note ${remoteId} from the data API:`, error);
    }
  }

  setHistory(items.filter(item => item.id !== id));
  await deleteVisualGalleryAssets(id, target?.sourceFingerprint || target?.clientFingerprint || "");
  await deleteSourceAssets(id, target?.sourceFingerprint || target?.clientFingerprint || "");
  deleteTutorChatHistory(id, target?.sourceFingerprint || target?.clientFingerprint || "");
  deleteTimelinePath(id, target?.sourceFingerprint || target?.clientFingerprint || "");
  deleteVisualGuide(id, target?.sourceFingerprint || target?.clientFingerprint || "");
  deleteQuizHistory(id, target?.sourceFingerprint || target?.clientFingerprint || "");
  deleteFlashcardDeck(id, target?.sourceFingerprint || target?.clientFingerprint || "");
  deleteVoiceTutorHistory(id, target?.sourceFingerprint || target?.clientFingerprint || "");
  if (typeof deleteStudyToolMemory === "function") {
    deleteStudyToolMemory(id, target?.sourceFingerprint || target?.clientFingerprint || "");
  }
  if (typeof deleteMemoryEngineNote === "function") {
    deleteMemoryEngineNote(id, target?.sourceFingerprint || target?.clientFingerprint || "");
  }
  renderHistory(historySearch ? historySearch.value : "");
  if (typeof renderFocusRoomWorkspaceActions === "function") renderFocusRoomWorkspaceActions();
  if (typeof notifyFocusRoomMaterialsChanged === "function") notifyFocusRoomMaterialsChanged();
}

function summaryFromGeneratedSections(sectionMap = {}) {
  return Object.entries(sectionMap)
    .map(([title, markdown]) => "## " + title + "\n\n" + String(markdown || "").trim())
    .filter(block => block.trim())
    .join("\n\n")
    .trim();
}

function applyGeneratedContentSectionPage(pageData, { reset = false } = {}) {
  const pageItems = Array.isArray(pageData?.items) ? pageData.items : [];
  const nextSections = reset ? {} : { ...(sections || {}) };
  pageItems.forEach(item => {
    const title = String(item?.title || "").trim();
    if (title) nextSections[title] = String(item?.markdown || "").trim();
  });
  sections = cleanAutoLanguageSectionTitles(nextSections, summaryFromGeneratedSections(nextSections), pageData?.output_language || pageData?.language || "auto");
  fullSummary = ensureRenderableSummary(summaryFromGeneratedSections(sections), sections);
  if (reset) {
    connectionsData = Array.isArray(pageData?.connections) ? pageData.connections : [];
    currentMindMap = pageData?.mind_map || pageData?.mindMap || null;
    visualGalleryData = normalizeLearningFigures(
      pageData?.visual_gallery || pageData?.source_evidence_cards || pageData?.visuals || []
    );
  }
  return pageData;
}

async function hydrateGeneratedContentSections(entry, { preserveScroll = false } = {}) {
  if (typeof fetchGeneratedContentSectionsFromDataApi !== "function") return null;
  const contentId = String(
    entry?.databaseRecord?.id ||
    entry?.database_record?.id ||
    entry?.id ||
    ""
  ).trim();
  if (!contentId) return null;

  const pageSize = 3;
  let page = 1;
  let pageData = await fetchGeneratedContentSectionsFromDataApi(contentId, page, pageSize);
  if (!pageData) return null;

  applyGeneratedContentSectionPage(pageData, { reset: true });
  entry.connections = connectionsData;
  entry.mindMap = currentMindMap;
  entry.visualGallery = visualGalleryData;
  entry.sources = Array.isArray(pageData.sources) ? pageData.sources : (entry.sources || []);
  entry.sourceFingerprint = pageData.source_fingerprint || entry.sourceFingerprint || "";
  entry.language = pageData.output_language || pageData.language || entry.language || "";
  currentSourceFingerprint = pageData.source_fingerprint || currentSourceFingerprint;
  if (pageData.prompt_mode) currentPromptMode = pageData.prompt_mode;

  showAnalysisView({ scrollToTop: !preserveScroll });
  renderSections();
  renderConnections();
  renderMindMap(currentMindMap);
  renderVisualGallery();
  renderFullNotes();

  while (pageData.has_next && currentHistoryId === entry.id) {
    page += 1;
    pageData = await fetchGeneratedContentSectionsFromDataApi(contentId, page, pageSize);
    if (!pageData) break;
    applyGeneratedContentSectionPage(pageData);
    renderSections();
    if (!selectedSection) renderFullNotes();
  }
  return pageData;
}

async function loadHistoryEntry(id, options = {}) {
  const item = getHistory().find(entry => entry.id === id);
  if (!item) return;

  if (isCompanionHistoryItem(item)) {
    if (typeof clearActiveGenerationJob === "function") clearActiveGenerationJob();
    closeMobileNavIfOpen();
    const threadId = companionThreadIdFromHistoryItem(item);
    if (typeof setWorkspaceNavTab === "function") {
      setWorkspaceNavTab("library", { persist: true, expandRail: true });
    }
    if (typeof setLearningExperienceMode === "function") {
      setLearningExperienceMode("companion");
    } else if (typeof applyLearningExperienceMode === "function") {
      applyLearningExperienceMode("companion");
    }
    currentHistoryId = item.id;
    safeSetLocalStorage(ACTIVE_HISTORY_KEY, item.id);
    if (threadId && typeof window.__synapseCompanionChat?.activate === "function") {
      window.__synapseCompanionChat.activate(threadId);
    }
    window.dispatchEvent(new CustomEvent("synapse-companion-thread-activate", {
      detail: { threadId, historyId: item.id },
    }));
    requestAnimationFrame(() => {
      document.getElementById("companionWorkspace")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
    renderHistory(historySearch ? historySearch.value : "");
    return;
  }

  if (typeof clearActiveGenerationJob === "function") clearActiveGenerationJob();
  closeMobileNavIfOpen();

  const hasStoredSections = item.sections && typeof item.sections === "object" && Object.keys(item.sections).length > 0;
  fullSummary = removeAutoBilingualHeadings(item.summary || "", item.language || "auto");
  storedTitle = item.title || makeHistoryTitle(fullSummary) || "Study Notes";
  sections = cleanAutoLanguageSectionTitles(hydrateSectionsFromSummary(item.sections || {}, fullSummary), fullSummary, item.language || "auto");
  fullSummary = ensureRenderableSummary(fullSummary, sections);
  connectionsData = item.connections || [];
  currentSourceFingerprint = item.sourceFingerprint || item.clientFingerprint || "";
  currentHistoryId = item.id;
  if (typeof recordStudyActivity === "function") recordStudyActivity("notes_opened", {
    tool: "notes",
    label: `Opened ${storedTitle}`
  });
  currentPrimarySourceIdentity = item.primarySourceIdentity || item.primary_source_identity || item.source_identity || "";
  currentPromptMode = item.promptMode || item.prompt_mode || "professor_mode";
  currentPromptModeLabel = item.promptModeLabel || item.prompt_mode_label || "";
  currentAiGeneration = normaliseAiGenerationDiagnostics(item.aiGeneration || item.ai_generation || null);
  if (!hasStoredSections && typeof fetchGeneratedContentSectionsFromDataApi === "function") {
    try {
      await hydrateGeneratedContentSections(item, { preserveScroll: options.preserveScroll });
    } catch (error) {
      console.warn("Could not hydrate generated note sections page by page:", error);
    }
  }
  const localVisuals = Array.isArray(item.visualGallery) ? item.visualGallery : [];
  const restoredVisuals = await loadVisualGalleryAssets(id, currentSourceFingerprint);
  visualGalleryData = normalizeLearningFigures(restoredVisuals.length ? restoredVisuals : localVisuals);
  fullSummary = pruneUnavailableVisualMarkers(fullSummary, visualGalleryData);
  sections = Object.fromEntries(Object.entries(sections).map(([title, markdown]) => [
    title,
    pruneUnavailableVisualMarkers(markdown, visualGalleryData)
  ]));
  const restoredSources = await loadSourceAssets(id, currentSourceFingerprint);
  restoreSourceViewerItems(restoredSources.length ? restoredSources : (item.sourceItems || item.sources || []));

  safeSetLocalStorage(ACTIVE_HISTORY_KEY, id);
  showAnalysisView({ scrollToTop: !options.preserveScroll });

  renderSections();
  renderConnections();
  currentMindMap = item.mindMap || item.mind_map || item.brainstorm || null;
  resetTimelineState();
  loadTimelineForCurrentNote();
  resetVisualGuideState();
  loadVisualGuideForCurrentNote();
  resetQuizState();
  loadQuizHistoryForCurrentNote();
  loadFlashcardsForCurrentNote();
  loadVoiceTutorHistoryForCurrentNote();
  if (typeof restoreStudyToolMemory === "function") restoreStudyToolMemory();
  renderMasteryGraphPanel();
  activeMindBranchIndex = 0;
  activeMindPointIndex = 0;
  activeMindChildIndex = -1;
  mindDetailPopupOpen = false;
  collapsedMindBranches = new Set();
  switchTool(typeof getRememberedStudyTool === "function" ? getRememberedStudyTool() : "mindmap");
  renderMindMap(currentMindMap);
  renderVisualGallery();
  loadTutorChatHistoryForCurrentNote();
  renderFullNotes();
  if (typeof renderFocusRoomWorkspaceActions === "function") renderFocusRoomWorkspaceActions();
  if (typeof notifyFocusRoomMaterialsChanged === "function") notifyFocusRoomMaterialsChanged();
}

function formatHistoryDate(value) {
  if (!value) return "Saved notes";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "Saved notes";
  }
}

function cleanExistingHistoryTitles() {
  const items = getHistory();
  if (!items.length) return;

  let changed = false;
  const cleaned = items.map(item => {
    const cleanTitle = makeHistoryTitle(item);
    if (cleanTitle !== item.title) changed = true;
    return { ...item, title: cleanTitle };
  });

  if (changed) setHistory(cleaned);
}
