async function sha256Hex(input) {
  const data = input instanceof ArrayBuffer
    ? input
    : new TextEncoder().encode(String(input));
  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof subtle.digest === "function") {
    const digest = await subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)]
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return fallbackFingerprintHex(new Uint8Array(data));
}

function fallbackFingerprintHex(bytes) {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (const byte of bytes) {
    h1 ^= byte;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (byte + 0x9e3779b9) & 0xff;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

function getHistory() {
  const parsed = safeReadJSONStorage(HISTORY_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function setHistory(items) {
  return safeWriteJSONStorage(HISTORY_STORAGE_KEY, items.slice(0, 30));
}

function visualRecordKeys(historyId, sourceFingerprint) {
  return cacheRecordKeys(historyId, sourceFingerprint);
}

function transactVisualStore(mode, callback) {
  return transactCacheStore(VISUAL_STORE_CONFIG, mode, callback);
}

function compactVisualGalleryForStorage(items) {
  return normalizeLearningFigures(items)
    // Never keep a marker-only record. It would restore as a broken inline figure.
    .filter(item => item && isCompactVisualUrl(item.url))
    .map(item => ({
      index: item.index,
      source_index: item.source_index,
      source_title: item.source_title || "",
      location: item.location || "",
      visual_kind: item.visual_kind || "",
      caption: item.caption || "",
      url: String(item.url || "").trim(),
      title: item.title || "",
      what_shows: item.what_shows || "",
      why_relevant: item.why_relevant || "",
      argument_supported: item.argument_supported || "",
      cross_source_connection: item.cross_source_connection || "",
      how_to_read: item.how_to_read || "",
      exam_use: item.exam_use || ""
    }));
}

function isCompactVisualUrl(value) {
  const url = String(value || "").trim();
  return Boolean(url && !url.toLowerCase().startsWith("data:image/"));
}

function pruneUnavailableVisualMarkers(summary, items) {
  const availableIndexes = new Set(
    normalizeLearningFigures(items)
      .filter(item => isCompactVisualUrl(item?.url))
      .map(item => Number(item.index))
      .filter(Number.isFinite)
  );
  const text = String(summary || "");
  if (!text) return text;
  return text
    .replace(/\[\[VISUAL:(\d+)\]\]/g, (marker, rawIndex) => (
      availableIndexes.has(Number(rawIndex)) ? marker : ""
    ))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pruneVisualGalleryAssets(limit = VISUAL_HISTORY_LIMIT) {
  return pruneCacheRecords(VISUAL_STORE_CONFIG, limit, "Visual cache");
}

async function saveVisualGalleryAssets(historyId, sourceFingerprint, items) {
  const visualItems = compactVisualGalleryForStorage(items);
  if (!visualItems.length) return;

  const updatedAt = Date.now();
  const records = visualRecordKeys(historyId, sourceFingerprint).map(id => ({
    id,
    historyId,
    sourceFingerprint,
    updatedAt,
    items: visualItems
  }));

  try {
    await transactVisualStore("readwrite", store => {
      records.forEach(record => store.put(record));
    });
    pruneVisualGalleryAssets();
  } catch (error) {
    console.warn("Could not persist source visuals:", error);
  }
}

async function loadVisualGalleryAssets(historyId, sourceFingerprint) {
  const keys = visualRecordKeys(historyId, sourceFingerprint);
  return loadFirstCacheItems(VISUAL_STORE_CONFIG, keys);
}

async function deleteVisualGalleryAssets(historyId, sourceFingerprint) {
  try {
    const keys = visualRecordKeys(historyId, sourceFingerprint);
    if (!keys.length) return;
    await transactVisualStore("readwrite", store => {
      keys.forEach(key => store.delete(key));
    });
  } catch (error) {
    console.warn("Could not delete cached source visuals:", error);
  }
}

function sourceRecordKeys(historyId, sourceFingerprint) {
  return cacheRecordKeys(historyId, sourceFingerprint);
}

function transactSourceStore(mode, callback) {
  return transactCacheStore(SOURCE_STORE_CONFIG, mode, callback);
}

function makeSourceObjectUrl(item) {
  if (!item || item.url || !item.blob) return item?.url || "";
  try {
    item.url = URL.createObjectURL(item.blob);
  } catch (error) {
    console.warn("Could not create source preview URL:", error);
  }
  return item.url || "";
}

function revokeSourceObjectURLs(items = sourceViewerItems) {
  (items || []).forEach(item => {
    if (item?.url && String(item.url).startsWith("blob:")) {
      try {
        URL.revokeObjectURL(item.url);
      } catch {
        // Browser may already have released it.
      }
    }
  });
}

function safeSourceItemId(value, index = 0) {
  const raw = String(value || `source:${index + 1}`);
  return raw
    .replace(/[^A-Za-z0-9:_%-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 180) || `source:${index + 1}`;
}

function normaliseSourceViewerItem(item, index = 0) {
  if (!item || typeof item !== "object") return null;
  const name = item.name || item.displayName || item.display_name || item.title || item.title_candidate || `Source ${index + 1}`;
  const derivedKind = sourceKindFromFile(item.blob || item.file || { name, type: item.type || item.contentType || item.content_type || "" });
  const sourceIdentity = item.sourceIdentity || item.source_identity || "";
  let kind = (!item.kind || item.kind === "file") && derivedKind !== "file" ? derivedKind : (item.kind || derivedKind);
  if (sourceItemLooksLikeYouTube({ ...item, sourceIdentity, name })) {
    kind = "youtube";
  }
  const rawOriginalUrl = item.originalUrl || item.original_url || item.url || item.embedded_url || "";
  const canonicalYoutubeUrl = kind === "youtube" ? youtubeWatchUrlFromItem({ ...item, originalUrl: rawOriginalUrl, sourceIdentity }) : "";
  const originalUrl = kind === "youtube" ? canonicalYoutubeUrl : rawOriginalUrl;
  const rawId = item.id || `${kind}:${sourceIdentity || name}:${index}`;
  return {
    id: safeSourceItemId(rawId, index),
    index: Number(item.index || item.backendIndex || index + 1),
    name,
    title: item.title || item.title_candidate || name,
    displayName: item.displayName || item.display_name || name,
    type: item.type || item.contentType || item.content_type || "",
    size: Number(item.size || item.bytes || 0),
    kind,
    sourceIdentity,
    url: kind === "youtube" ? canonicalYoutubeUrl : (item.url || originalUrl || ""),
    originalUrl,
    content: item.content || item.text || "",
    blob: item.blob || item.file || null,
    preview: item.preview || null,
    previewError: item.previewError || "",
    backendIndex: item.backendIndex || item.index || index + 1
  };
}

function restoreSourceViewerItems(items) {
  revokeSourceObjectURLs();
  sourceViewerItems = (items || [])
    .map((item, index) => normaliseSourceViewerItem(item, index))
    .filter(Boolean)
    .filter(item => typeof isPrimarySourceReviewItem !== "function" || isPrimarySourceReviewItem(item));
  activeSourceItemId = sourceViewerItems[0]?.id || "";
  renderSourceViewer();
  if (typeof scheduleSourcePreviewPrefetch === "function") {
    scheduleSourcePreviewPrefetch(sourceViewerItems);
  }
  if (typeof ensureSourcePreviewWarmup === "function") {
    Promise.resolve(ensureSourcePreviewWarmup()).catch(() => {});
  }
}

async function buildCurrentSourceItems(rawSource, backendSources = []) {
  revokeSourceObjectURLs();
  const parsed = parseMixedSources(rawSource);
  // Source review is for primary study inputs only: uploads, pasted text, and YouTube.
  // Do not promote generic websites discovered inside notes into the review tabs.
  const sourceLinks = typeof youtubeSourceLinks === "function"
    ? youtubeSourceLinks([...(uploadedLinks || []), ...(parsed.links || [])])
    : uniqueSourceLinks([...(uploadedLinks || []), ...(parsed.links || [])]).filter(url => /(?:youtube\.com|youtu\.be)/i.test(url));
  const backendByName = new Map();
  (backendSources || []).forEach(source => {
    const name = String(source.display_name || source.title_candidate || "").toLowerCase();
    if (name) backendByName.set(name, source);
  });
  const backendByUrl = new Map();
  const sourceUrlKey = (value) => {
    const raw = String(value || "").trim();
    const videoId = getYouTubeVideoIdClient(raw);
    if (videoId) return `youtube:${videoId}`;
    try {
      const parsedUrl = new URL(raw);
      return `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}`.toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  };
  (backendSources || []).forEach(source => {
    const key = sourceUrlKey(source.embedded_url || source.url || source.source_identity || "");
    if (key) backendByUrl.set(key, source);
  });

  const items = uploadedFiles.map((file, index) => {
    const backend = backendByName.get(String(file.name || "").toLowerCase()) || backendSources[index] || {};
    const kind = sourceKindFromFile(file);
    return normaliseSourceViewerItem({
      id: `upload:${currentSourceFingerprint || Date.now()}:${index}`,
      index: index + 1,
      name: file.name || `Uploaded source ${index + 1}`,
      title: backend.title_candidate || file.name || `Uploaded source ${index + 1}`,
      displayName: backend.display_name || file.name || `Uploaded source ${index + 1}`,
      type: file.type || "",
      size: file.size || 0,
      kind,
      sourceIdentity: backend.source_identity || "",
      content: backend.text_excerpt || "",
      blob: file
    }, index);
  });

  sourceLinks.forEach((url, index) => {
    const backend = backendByUrl.get(sourceUrlKey(url)) || {};
    const sourceTitle = backend.title_candidate || backend.display_name || `YouTube source ${index + 1}`;
    items.push(normaliseSourceViewerItem({
      id: `link:${encodeURIComponent(url).slice(0, 140)}`,
      index: items.length + 1,
      name: sourceTitle,
      title: sourceTitle,
      displayName: backend.display_name || sourceTitle,
      kind: "youtube",
      sourceIdentity: backend.source_identity || "",
      originalUrl: url,
      url,
      content: backend.text_excerpt || ""
    }, items.length));
  });

  const freeText = removeDetectedUrlsClient(parsed.freeText);
  if (freeText) {
    items.push(normaliseSourceViewerItem({
      id: `text:${await sha256Hex(freeText)}`,
      index: items.length + 1,
      name: "Pasted text",
      title: "Pasted text",
      displayName: "Pasted text",
      kind: "note",
      content: freeText
    }, items.length));
  }

  (backendSources || []).forEach((source, index) => {
    const identity = source.source_identity || "";
    const displayName = source.display_name || source.title_candidate || "";
    const isYoutube = sourceItemLooksLikeYouTube(source);
    const isText = String(identity).startsWith("text:") || /pasted text/i.test(displayName);
    if (!isYoutube && !isText) return;
    const sourceUrl = source.embedded_url || source.url || (isYoutube ? youtubeWatchUrlFromItem({ sourceIdentity: identity }) : "");
    const alreadyIncluded = items.some(item =>
      (identity && item.sourceIdentity === identity) ||
      (displayName && item.displayName === displayName) ||
      (sourceUrl && sourceUrlKey(item.originalUrl || item.url) === sourceUrlKey(sourceUrl))
    );
    if (!alreadyIncluded) {
      items.push(normaliseSourceViewerItem({
        id: `meta:${identity || displayName || index}`,
        index: items.length + 1,
        name: displayName || `Source ${index + 1}`,
        title: source.title_candidate || displayName || `Source ${index + 1}`,
        displayName,
        kind: isYoutube ? "youtube" : "note",
        sourceIdentity: identity,
        originalUrl: sourceUrl,
        url: sourceUrl,
        content: source.text_excerpt || ""
      }, items.length));
    }
  });

  sourceViewerItems = items
    .filter(Boolean)
    .filter(item => typeof isPrimarySourceReviewItem !== "function" || isPrimarySourceReviewItem(item));
  activeSourceItemId = sourceViewerItems[0]?.id || "";
  renderSourceViewer();
  if (typeof scheduleSourcePreviewPrefetch === "function") {
    scheduleSourcePreviewPrefetch(sourceViewerItems);
  }
  if (typeof ensureSourcePreviewWarmup === "function") {
    Promise.resolve(ensureSourcePreviewWarmup()).catch(() => {});
  }
  return sourceViewerItems;
}

function compactSourceItemsForHistory(items) {
  const truncateSourceText = (value, limit) => {
    const text = String(value || "");
    return text.length > limit ? `${text.slice(0, limit)}\n\n[Source preview truncated for browser storage.]` : text;
  };
  return (items || []).map((item, index) => ({
    id: item.id,
    index: item.index || index + 1,
    name: item.name || item.displayName || `Source ${index + 1}`,
    title: item.title || item.name || `Source ${index + 1}`,
    displayName: item.displayName || item.name || `Source ${index + 1}`,
    type: item.type || "",
    size: item.size || 0,
    kind: item.kind || "file",
    sourceIdentity: item.sourceIdentity || "",
    originalUrl: item.originalUrl || (/^https?:\/\//i.test(item.url || "") ? item.url : ""),
    url: /^https?:\/\//i.test(item.url || "") ? item.url : "",
    content: item.content ? truncateSourceText(item.content, 50000) : ""
  }));
}

function compactSourceItemsForStorage(items) {
  return (items || []).map((item, index) => {
    const compact = compactSourceItemsForHistory([item])[0] || {};
    if (item.blob && Number(item.size || item.blob.size || 0) <= MAX_SOURCE_PREVIEW_BYTES) {
      compact.blob = item.blob;
    }
    compact.index = item.index || index + 1;
    compact.updatedAt = Date.now();
    return compact;
  });
}

async function pruneSourceAssets(limit = SOURCE_HISTORY_LIMIT) {
  return pruneCacheRecords(SOURCE_STORE_CONFIG, limit, "Source cache");
}

async function saveSourceAssets(historyId, sourceFingerprint, items) {
  const sourceItems = compactSourceItemsForStorage(items);
  if (!sourceItems.length) return;

  const updatedAt = Date.now();
  const records = sourceRecordKeys(historyId, sourceFingerprint).map(id => ({
    id,
    historyId,
    sourceFingerprint,
    updatedAt,
    items: sourceItems
  }));

  try {
    await transactSourceStore("readwrite", store => {
      records.forEach(record => store.put(record));
    });
    pruneSourceAssets();
  } catch (error) {
    console.warn("Could not persist uploaded sources:", error);
  }
}

async function loadSourceAssets(historyId, sourceFingerprint) {
  const keys = sourceRecordKeys(historyId, sourceFingerprint);
  return loadFirstCacheItems(SOURCE_STORE_CONFIG, keys);
}

async function deleteSourceAssets(historyId, sourceFingerprint) {
  try {
    const keys = sourceRecordKeys(historyId, sourceFingerprint);
    if (!keys.length) return;
    await transactSourceStore("readwrite", store => {
      keys.forEach(key => store.delete(key));
    });
  } catch (error) {
    console.warn("Could not delete cached source files:", error);
  }
}

function renderSourceViewer() {
  if (!sourceViewerPanel || !sourceViewerTabs || !sourceViewerBody) return;
  if (sourceViewerBtn) {
    sourceViewerBtn.disabled = !sourceViewerItems.length;
    sourceViewerBtn.classList.toggle("active", sourceViewerOpen);
  }
  if (appLayout) {
    appLayout.classList.toggle("source-viewer-open", Boolean(sourceViewerOpen && sourceViewerItems.length));
  }
  if (!sourceViewerOpen) {
    sourceViewerPanel.classList.add("d-none");
    sourceViewerPanel.classList.remove("is-native-pdf");
    if (resultGrid) {
      resultGrid.classList.remove("source-open", "is-resizing");
    }
    if (typeof endNotesSourceSplitDrag === "function") endNotesSourceSplitDrag();
    if (typeof syncNotesSourceSplitter === "function") syncNotesSourceSplitter();
    return;
  }

  sourceViewerPanel.classList.remove("d-none");
  if (resultGrid) resultGrid.classList.add("source-open");
  if (typeof bindNotesSourceSplitter === "function") {
    bindNotesSourceSplitter();
  } else if (typeof syncNotesSourceSplitter === "function") {
    syncNotesSourceSplitter();
  }
  if (typeof scheduleSourcePreviewPrefetch === "function") {
    scheduleSourcePreviewPrefetch(sourceViewerItems);
  }
  if (!sourceViewerItems.length) {
    sourceViewerTabs.innerHTML = "";
    sourceViewerBody.innerHTML = `
      <div class="source-viewer-empty">
        <i class="bi bi-folder2-open"></i>
        <h3>No source file preview is available</h3>
        <p>Regenerate from uploaded files to restore source previews, or use in-text source images already embedded in the notes.</p>
      </div>
    `;
    return;
  }

  if (!activeSourceItemId || !sourceViewerItems.some(item => item.id === activeSourceItemId)) {
    activeSourceItemId = sourceViewerItems[0].id;
  }

  sourceViewerTabs.innerHTML = sourceViewerItems.map(item => `
    <button type="button"
            class="source-tab ${item.id === activeSourceItemId ? "active" : ""}"
            title="${escapeAttr(item.title || item.name)}"
            onclick="selectSourceItem('${escapeAttr(item.id)}')">
      <i class="bi ${sourceIcon(item.kind)}"></i>
      <span>${escapeHTML(shorten(item.name || item.title, 18))}</span>
    </button>
  `).join("");

  const active = sourceViewerItems.find(item => item.id === activeSourceItemId) || sourceViewerItems[0];
  renderSourceViewerBody(active);
}
