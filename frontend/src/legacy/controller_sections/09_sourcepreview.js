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

