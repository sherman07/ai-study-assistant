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

