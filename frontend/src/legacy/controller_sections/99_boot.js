if (window.__synapseConfigureMarkdownHooks) {
  window.__synapseConfigureMarkdownHooks();
}

const modalSettingsExports = {};
if (typeof openQuizSettingsModal === "function") modalSettingsExports.openQuizSettingsModal = openQuizSettingsModal;
if (typeof closeQuizSettingsModal === "function") modalSettingsExports.closeQuizSettingsModal = closeQuizSettingsModal;
if (typeof saveQuizSettingsFromModal === "function") modalSettingsExports.saveQuizSettingsFromModal = saveQuizSettingsFromModal;
if (typeof openStudyToolSettingsModal === "function") modalSettingsExports.openStudyToolSettingsModal = openStudyToolSettingsModal;
if (typeof closeStudyToolSettingsModal === "function") modalSettingsExports.closeStudyToolSettingsModal = closeStudyToolSettingsModal;
if (typeof saveStudyToolSettingsModal === "function") modalSettingsExports.saveStudyToolSettingsModal = saveStudyToolSettingsModal;
if (typeof openFlashcardSettingsModal === "function") modalSettingsExports.openFlashcardSettingsModal = openFlashcardSettingsModal;
if (typeof closeFlashcardSettingsModal === "function") modalSettingsExports.closeFlashcardSettingsModal = closeFlashcardSettingsModal;
if (typeof updateFlashcardSettingsDraft === "function") modalSettingsExports.updateFlashcardSettingsDraft = updateFlashcardSettingsDraft;
if (typeof saveFlashcardSettingsModal === "function") modalSettingsExports.saveFlashcardSettingsModal = saveFlashcardSettingsModal;
if (typeof openBroadcastSettingsModal === "function") modalSettingsExports.openBroadcastSettingsModal = openBroadcastSettingsModal;
if (typeof closeBroadcastSettingsModal === "function") modalSettingsExports.closeBroadcastSettingsModal = closeBroadcastSettingsModal;
if (typeof saveBroadcastSettingsModal === "function") modalSettingsExports.saveBroadcastSettingsModal = saveBroadcastSettingsModal;
Object.assign(window, modalSettingsExports);

try {
Object.assign(window, {
  addLinksFromInput,
  addQuizTypeRow,
  analyzeMaterials,
  askAI,
  askConnection,
  askSelectedMindPoint,
  askTimelineEventTutor,
  changeSourceZoom,
  checkMemoryRecallAnswer,
  checkStudyPathAnswer,
  clearChat,
  clearFlashcardsAndShowBuilder,
  closeFlashcardSettingsModal,
  closeAssistant,
  closeFlashcardListModal,
  closeMindDetailPopup,
  closeQuizHistoryModal,
  closeQuizSettingsModal,
  closeBroadcastSettingsModal,
  closeStudyPathCelebration,
  deleteHistoryEntry,
  deleteMemoryEngineNote,
  deleteQuizHistoryRecord,
  downloadNotesPDF,
  downloadVisualImageGuidePNG,
  expandAssistant,
  exportVisualGuidePDF,
  exportVisualGuidePNG,
  flipFlashcard,
  gradeFlashcard,
  focusInlineVisual,
  generateFlashcards,
  generateQuiz,
  generateTimeline,
  generateVisualGuide,
  handleFlashcardMatchDragStart,
  handleFlashcardMatchDrop,
  getSynapseFocusRoomCurrentMaterial,
  getSynapseFocusRoomMaterial,
  getSynapseFocusRoomMaterials,
  jumpToFlashcardFromList,
  loadHistoryEntry,
  openGeneratedHistorySection,
  loadQuizHistoryRecord,
  markMasteryGraphSectionReviewed,
  notifyFocusRoomMaterialsChanged,
  openGenerationJob,
  openCompletedGenerationResult,
  openCompletedGenerationResultNow,
  openAiBroadcastSetup,
  openBroadcastSettingsModal,
  openBroadcastJob,
  openActiveMindMapSection,
  openAccountPanel,
  openAccountDeletionDialog,
  openAssistant,
  openFilePicker,
  openSynapseFocusRoom,
  openFlashcardListModal,
  openFlashcardSettingsModal,
  openMasteryGraphSection,
  openQuizHistoryModal,
  openQuizSettingsModal,
  openStudyToolSettingsModal,
  closeStudyToolSettingsModal,
  updateStudyToolSettingDraft,
  saveStudyToolSettingsModal,
  openTimelineEventNotes,
  openVisualGuideWebImage,
  openVisualModal,
  practiceMasteryGraphSection,
  quickAsk,
  recordMasterySectionOpen,
  recordStudyActivity,
  getStudyActivitySummary,
  getLearningExperienceMode,
  recordQuizAnswerActivity,
  regenerateFlashcards,
  removeFile,
  removeLink,
  removeQuizTypeRow,
  renderMasteryGraphPanel,
  renderSourceTextFallback,
  resetVoiceTutorSession,
  resetFlashcardMatching,
  resetWorkspace,
  closeAccountPanel,
  closeSynapseConfirmation,
  consumeFocusRoomReturnTarget,
  deleteAccountAndLocalData,
  goToAuthPage,
  exportAccountData,
  refreshAccountSessionFromProvider,
  renderAccountMenu,
  setAccountPreference,
  revealQuizAnswer,
  saveQuizSettingsFromModal,
  saveFlashcardSettingsModal,
  saveBroadcastSettingsModal,
  scheduleMemoryReview,
  selectMindBranch,
  selectMindChild,
  selectMindPoint,
  selectFlashcardMatchBranch,
  selectFlashcardMatchTerm,
  selectSourceItem,
  selectTimelineEvent,
  sendVoiceTutorText,
  sendVoiceTutorTypedAnswer,
  setActiveFlashcard,
  setFlashcardActivityMode,
  setActiveQuizQuestion,
  setFlashcardCountMode,
  setMemoryFilter,
  setTimelineFilter,
  showFullSummary,
  signOutAccount,
  openBillingPortal,
  startVoiceTutorSession,
  startBillingCheckout,
  submitQuiz,
  switchTab,
  switchTool,
  toggleSourceViewer,
  openActiveSourceExternally,
  cycleActiveSourceItem,
  bindSourceViewerShortcuts,
  retryActiveSourcePreview,
  renderNativePdfPreview,
  resetSourceZoom,
  bindNotesSourceSplitter,
  applyNotesSourceSplitRatio,
  resetNotesSourceSplitRatio,
  toggleSummaryNav,
  toggleHistoryNav,
  setWorkspaceNavTab,
  toggleTimelineComplete,
  toggleVoiceTutorMute,
  updateFlashcardCustomCount,
  updateFlashcardLanguage,
  updateFlashcardSettingsDraft,
  updateQuizAnswer,
  updateQuizChoiceAnswer,
  updateQuizDraftCount,
  updateQuizDraftExamMode,
  updateQuizDraftLanguage,
  updateQuizDraftTotal,
  updateQuizDraftType,
  updateStudyPathChoiceAnswer,
  updateStudyPathTextAnswer,
  validateFlashcardMatches,
  retryFlashcardMatching,
  renderFocusRoomWorkspaceActions,
  renderFlashcardMatchLines,
  returnFromFocusRoomToWorkspace,
  cancelGenerationJob,
  deleteGenerationJob,
  retryGenerationJob,
  generateBroadcastFromSetup,
  cancelBroadcastJob,
  retryBroadcastJob,
  deleteBroadcastJob,
  toggleBroadcastPlayback,
  setBroadcastPlaybackRate,
  setLearningExperienceMode,
  openWorkspaceHome,
  syncCompanionThreadToHistory,
  toggleGeneratedHistorySections,
  restartBroadcastPlayback,
  seekBroadcastSection,
  stopBroadcastPlayback,
  explainBroadcastPart,
  generateQuizFromBroadcast,
  generateFlashcardsFromBroadcast,
  openBroadcastAsStudyMaterial,
  setupBroadcastTool,
  syncBroadcastJobsWithDataApi,
  renderBroadcastSetupPanel,
  renderCurrentBroadcastOrSetup,
  getRememberedStudyTool,
  persistStudyToolMemory,
  restoreStudyToolMemory,
});
} catch (error) {
  const message = `Synapse legacy boot exports failed: ${error?.message || String(error)}${error?.stack ? `\n${error.stack}` : ""}`;
  window.__synapseBootError = message;
  console.error(message);
  throw error;
}

initialiseAccountPreferences();

if (historySearch) {
  historySearch.addEventListener("input", event => renderHistory(event.target.value));
}
if (notesTranslateLanguage) {
  notesTranslateLanguage.addEventListener("change", event => translateCurrentNotes(event.target.value));
}
if (mobileHistorySearch) {
  mobileHistorySearch.addEventListener("input", event => {
    if (historySearch) historySearch.value = event.target.value;
    renderHistory(event.target.value);
  });
}
cleanExistingHistoryTitles();
if (typeof recoverGenerationJobsOnBoot === "function") {
  recoverGenerationJobsOnBoot();
}
if (typeof recoverBroadcastJobsOnBoot === "function") {
  recoverBroadcastJobsOnBoot();
}
renderHistory();
if (typeof syncHistoryWithDataApi === "function") {
  syncHistoryWithDataApi().catch(error => {
    console.warn("Could not load synced generated note history:", error);
  });
}
if (typeof syncBroadcastJobsWithDataApi === "function") {
  syncBroadcastJobsWithDataApi().catch(error => {
    console.warn("Could not load synced AI Broadcast history:", error);
  });
}
if (typeof renderFocusRoomWorkspaceActions === "function") {
  renderFocusRoomWorkspaceActions();
}
if (typeof notifyFocusRoomMaterialsChanged === "function") {
  notifyFocusRoomMaterialsChanged();
}
setupVisualGuideTool();
setupTimelineTool();
setupMasteryGraphTool();
setupQuizTool();
setupFlashcardTool();
setupBroadcastTool();
if (typeof syncStudyToolTabState === "function") syncStudyToolTabState("mindmap");
if (typeof showStudyToolNotice === "function") window.showStudyToolNotice = showStudyToolNotice;
if (typeof syncStudyToolTabState === "function") window.syncStudyToolTabState = syncStudyToolTabState;
renderAccountMenu();
if (typeof bindNotesSourceSplitter === "function") {
  bindNotesSourceSplitter();
}
if (typeof bindSourceViewerShortcuts === "function") {
  bindSourceViewerShortcuts();
}
if (typeof refreshAccountSessionFromProvider === "function") {
  refreshAccountSessionFromProvider().catch(error => {
    console.warn("Could not refresh account session on boot:", error);
  });
}
window.addEventListener("synapse-auth-changed", () => {
  renderAccountMenu();
  const contentHost = document.querySelector("[data-account-settings-content]");
  if (contentHost && (contentHost.innerHTML.includes("settings-billing-title") || contentHost.innerHTML.includes("Billing & credits"))) {
    contentHost.innerHTML = accountSettingsContent("billing", getCurrentAccountSession());
  }
  if (typeof syncHistoryWithDataApi === "function") {
    syncHistoryWithDataApi().catch(error => {
      console.warn("Could not refresh synced generated note history:", error);
    });
  }
});

if (!window.__synapseFlashcardMatchResizeBound) {
  window.__synapseFlashcardMatchResizeBound = true;
  window.addEventListener("resize", () => {
    if (typeof renderFlashcardMatchLines === "function") {
      renderFlashcardMatchLines();
    }
  });
}

const activeHistoryId = safeGetLocalStorage(ACTIVE_HISTORY_KEY, "");
if (activeHistoryId && getHistory().some(item => item.id === activeHistoryId)) {
  Promise.resolve(loadHistoryEntry(activeHistoryId, { preserveScroll: true }))
    .then(() => {
      if (typeof consumeFocusRoomReturnTarget === "function") {
        consumeFocusRoomReturnTarget();
      }
    });
} else if (typeof consumeFocusRoomReturnTarget === "function") {
  consumeFocusRoomReturnTarget();
}

if (questionInput) questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    askAI();
  }
});

if (voiceTextInput) voiceTextInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendVoiceTutorTypedAnswer();
  }
});

renderVoiceTutorHistory();
