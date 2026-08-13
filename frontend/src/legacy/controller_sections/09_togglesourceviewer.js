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

