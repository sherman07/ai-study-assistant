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
