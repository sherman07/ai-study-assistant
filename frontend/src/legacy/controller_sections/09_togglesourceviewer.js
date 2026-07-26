const SOURCE_PREVIEW_TIMEOUT_MS = Number(window.SYNAPSE_SOURCE_PREVIEW_TIMEOUT_MS || 90 * 1000);

function toggleSourceViewer(force = null) {
  const desired = typeof force === "boolean" ? force : !sourceViewerOpen;
  sourceViewerOpen = desired;
  if (desired && typeof recordStudyActivity === "function") recordStudyActivity("source_opened", {
    tool: "notes",
    label: "Opened source viewer"
  });
  renderSourceViewer();
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

function changeSourceZoom(delta) {
  sourceViewerZoom = Math.max(60, Math.min(180, sourceViewerZoom + Number(delta || 0)));
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

function canUseBackendSourcePreview(item) {
  return Boolean(item?.blob && ["pdf", "presentation", "document"].includes(item.kind));
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

async function fetchSourcePreview(item) {
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
  return data;
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
  sourceViewerBody.innerHTML = `
    <div class="source-loading">
      <i class="bi ${sourceIcon(item.kind)}"></i>
      <h3>Preparing source preview...</h3>
      <p>Synapse is converting this file into a readable browser view.</p>
    </div>
  `;
}

function renderSourcePreviewError(item, error) {
  const fallbackText = item?.content || "";
  const allowTextFallback = item?.kind !== "presentation" && Boolean(fallbackText);
  const url = item?.blob ? makeSourceObjectUrl(item) : "";
  sourceViewerBody.innerHTML = `
    <div class="source-file-preview">
      <i class="bi ${sourceIcon(item?.kind)}"></i>
      <h3>${escapeHTML(item?.name || "Uploaded source")}</h3>
      <p>${escapeHTML(error?.message || item?.previewError || "This source could not be previewed.")}</p>
      ${allowTextFallback ? `<button class="source-inline-action" type="button" onclick="renderSourceTextFallback('${escapeAttr(item.id)}')">Show extracted text</button>` : ""}
      ${url ? `<a href="${escapeAttr(url)}" download="${escapeAttr(item?.name || "source")}">Download original source</a>` : ""}
    </div>
  `;
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
    const url = item?.blob ? makeSourceObjectUrl(item) : (item?.url || item?.originalUrl || "");
    sourceViewerBody.innerHTML = `
      <div class="source-structured-preview source-pdf-clean-preview">
        ${renderSourceOpenActions(url, "Open full PDF", item.name || "source.pdf")}
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
            <p>Use the open or download action to view the original file.</p>
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

  if (canUseBackendSourcePreview(item)) {
    renderSourcePreviewLoading(item);
    const expectedItemId = item.id;
    fetchSourcePreview(item)
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
let historySyncDegraded = false;
let historySyncDegradedMessage = "";

function setHistorySyncDegraded(active, message = "") {
  historySyncDegraded = Boolean(active);
  historySyncDegradedMessage = active
    ? String(message || "Cloud history is temporarily unavailable. Notes on this device still work.")
    : "";
  try {
    if (typeof window !== "undefined") {
      window.__synapseHistorySyncDegraded = historySyncDegraded;
      window.__synapseHistorySyncDegradedMessage = historySyncDegradedMessage;
    }
  } catch {
    // Ignore restricted window access in tests.
  }
}

function isHistorySyncDegraded() {
  return Boolean(historySyncDegraded);
}

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
      setHistorySyncDegraded(false);
    } catch (error) {
      const degraded = Boolean(error?.degraded) || Number(error?.status) === 503;
      setHistorySyncDegraded(
        degraded,
        degraded
          ? "Cloud history is temporarily unavailable. Notes saved on this device still appear here."
          : ""
      );
      console.warn("Could not sync generated note history from the data API:", error);
      renderHistory();
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
        ${isHistorySyncDegraded() ? `<p class="history-empty-degraded" role="status">${escapeHTML(historySyncDegradedMessage)}</p>` : ""}
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
