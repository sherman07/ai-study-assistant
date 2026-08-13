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

