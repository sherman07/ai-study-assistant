function getFocusRoomSummaryText() {
  return fullSummary || summaryContent?.textContent || "";
}

const FOCUS_ROOM_RETURN_TARGET_KEY = "synapse.focusRoom.return-target.v1";

function isSynapseFocusRoomEnabled() {
  return window.SYNAPSE_FOCUS_ROOM_ENABLED === true || window.SYNAPSE_FOCUS_ROOM_ENABLED === "true";
}

function normalizeFocusRoomWorkspaceTarget(target = {}) {
  // Prefer the MVP model when the React runtime has registered it.
  if (typeof window.__synapseNormalizeFocusRoomWorkspaceTarget === "function") {
    return window.__synapseNormalizeFocusRoomWorkspaceTarget(target);
  }
  const objectTarget = target && typeof target === "object" && !Array.isArray(target) ? target : {};
  return {
    materialId: String(objectTarget.materialId || "").trim(),
    action: String(objectTarget.action || "").trim().toLowerCase(),
    sourceId: String(objectTarget.sourceId || objectTarget.source_id || "").trim(),
    sourceIndex: Number(objectTarget.sourceIndex || objectTarget.source_index || 0) || 0,
    sourceLabel: String(objectTarget.sourceLabel || objectTarget.source_label || "").trim(),
    sectionTitle: String(objectTarget.sectionTitle || objectTarget.section_title || "").trim(),
    highlightId: String(objectTarget.highlightId || objectTarget.highlight_id || "").trim(),
    excerpt: String(objectTarget.excerpt || "").trim()
  };
}

function sourceViewerItemIdForTarget(target = {}) {
  const sourceId = String(target.sourceId || "").trim();
  if (sourceId && sourceViewerItems.some(item => item.id === sourceId)) return sourceId;
  const sourceIndex = Number(target.sourceIndex || 0);
  if (Number.isFinite(sourceIndex) && sourceIndex > 0 && sourceViewerItems[sourceIndex - 1]) {
    return sourceViewerItems[sourceIndex - 1].id;
  }
  const sourceLabel = String(target.sourceLabel || "").trim();
  if (sourceLabel) {
    const match = sourceViewerItems.find(item =>
      item.title === sourceLabel ||
      item.name === sourceLabel ||
      item.displayName === sourceLabel
    );
    if (match) return match.id;
  }
  return sourceViewerItems[0]?.id || "";
}

function applyFocusRoomWorkspaceTarget(rawTarget = {}) {
  const target = normalizeFocusRoomWorkspaceTarget(rawTarget);
  const run = () => {
    if (target.action === "source") {
      toggleSourceViewer(true);
      const sourceId = sourceViewerItemIdForTarget(target);
      if (sourceId) selectSourceItem(sourceId);
      return;
    }
    if (target.action === "notes") {
      showFullSummary();
      return;
    }
    if (target.action === "assistant") {
      openAssistant();
      return;
    }
    if (["flashcards", "quiz", "mindmap", "timeline"].includes(target.action)) {
      switchTool(target.action);
    }
  };

  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
  else setTimeout(run, 0);
}

function consumeFocusRoomReturnTarget() {
  const raw = safeGetLocalStorage(FOCUS_ROOM_RETURN_TARGET_KEY, "");
  if (!raw) return;
  safeRemoveLocalStorage(FOCUS_ROOM_RETURN_TARGET_KEY);
  let target = null;
  try {
    target = JSON.parse(raw);
  } catch {
    target = null;
  }
  if (!target || typeof target !== "object") return;
  applyFocusRoomWorkspaceTarget(target);
}

function getFocusRoomStoreRecordByKeys(readStore, keys, predicate) {
  const rawStore = typeof readStore === "function" ? readStore() : {};
  const store = rawStore && typeof rawStore === "object" && !Array.isArray(rawStore) ? rawStore : {};
  return keys.map(key => store[key]).find(predicate);
}

function getFocusRoomKeys({ historyId = "", sourceFingerprint = "" } = {}) {
  return [
    historyId ? `history:${historyId}` : "",
    sourceFingerprint ? `fingerprint:${sourceFingerprint}` : ""
  ].filter(Boolean);
}

function getFocusRoomKeysForCurrentNote() {
  return getFocusRoomKeys({
    historyId: currentHistoryId,
    sourceFingerprint: currentSourceFingerprint
  });
}

function getFocusRoomKeysForHistoryItem(item) {
  const keys = [
    ...getFocusRoomKeys({
      historyId: item?.id,
      sourceFingerprint: item?.sourceFingerprint
    }),
    item?.clientFingerprint ? `fingerprint:${item.clientFingerprint}` : ""
  ].filter(Boolean);
  return [...new Set(keys)];
}

function findFocusRoomHistoryItem(materialId = "") {
  const id = String(materialId || "").trim();
  if (!id) return null;
  return getHistory().find(item =>
    String(item?.id || "") === id ||
    String(item?.sourceFingerprint || item?.source_fingerprint || "") === id ||
    String(item?.clientFingerprint || item?.client_fingerprint || "") === id
  ) || null;
}

function getFocusRoomFlashcardsForKeys(keys, fallbackCards = []) {
  const fallback = Array.isArray(fallbackCards) ? fallbackCards : [];
  const record = getFocusRoomStoreRecordByKeys(
    typeof getFlashcardStore === "function" ? getFlashcardStore : null,
    keys,
    item => item && Array.isArray(item.cards) && item.cards.length
  );
  return record?.cards || fallback;
}

function getFocusRoomQuizSummaries(records) {
  return (Array.isArray(records) ? records : []).map(record => ({
    id: record.id,
    title: record.title,
    createdAt: record.createdAt || record.created_at || "",
    updatedAt: record.updatedAt || record.updated_at || "",
    questions: record.quiz?.questions || record.questions || [],
    report: record.report || null
  }));
}

function getFocusRoomQuizRecordKey(record) {
  const id = String(record?.id || "").trim();
  if (id) return `id:${id}`;
  try {
    return `content:${JSON.stringify({
      title: record?.title || "",
      createdAt: record?.createdAt || "",
      updatedAt: record?.updatedAt || "",
      questions: record?.questions || []
    })}`;
  } catch {
    return "";
  }
}

function getFocusRoomQuizRecordsForKeys(keys, fallbackRecords = []) {
  const rawStore = typeof getQuizHistoryStore === "function" ? getQuizHistoryStore() : {};
  const store = rawStore && typeof rawStore === "object" && !Array.isArray(rawStore) ? rawStore : {};
  const records = keys.flatMap(key => Array.isArray(store[key]) ? store[key] : []);
  const sourceRecords = records.length ? records : fallbackRecords;
  const seen = new Set();
  return getFocusRoomQuizSummaries(sourceRecords)
    .filter(record => {
      const key = getFocusRoomQuizRecordKey(record);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function getFocusRoomFlashcardsForCurrentNote() {
  return getFocusRoomFlashcardsForKeys(getFocusRoomKeysForCurrentNote(), currentFlashcards);
}

function getFocusRoomQuizRecordsForCurrentNote() {
  return getFocusRoomQuizRecordsForKeys(getFocusRoomKeysForCurrentNote(), quizHistory);
}

function getFocusRoomFlashcardsForHistoryItem(item) {
  return getFocusRoomFlashcardsForKeys(getFocusRoomKeysForHistoryItem(item));
}

function getFocusRoomQuizRecordsForHistoryItem(item) {
  return getFocusRoomQuizRecordsForKeys(getFocusRoomKeysForHistoryItem(item));
}

function getSynapseFocusRoomCurrentMaterial() {
  const summary = getFocusRoomSummaryText();
  if (!summary || !summary.trim()) return null;
  return {
    materialId: currentHistoryId || currentSourceFingerprint || "current-material",
    materialTitle: storedTitle || makeHistoryTitle(summary) || "Current Study Notes",
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: summary,
    sections,
    flashcards: getFocusRoomFlashcardsForCurrentNote(),
    quizzes: getFocusRoomQuizRecordsForCurrentNote(),
    mindMap: currentMindMap,
    studyPlan: currentTimeline?.events || [],
    progressHistory: [],
    sources: [],
    sourceItems: typeof compactSourceItemsForHistory === "function" ? compactSourceItemsForHistory(sourceViewerItems) : [],
    sourceHighlights: [],
    sourceFingerprint: currentSourceFingerprint,
    createdAt: "",
    updatedAt: ""
  };
}

function focusRoomMaterialFromHistoryItem(item) {
  return {
    materialId: item.id,
    materialTitle: item.title || makeHistoryTitle(item),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: item.summary || "",
    sections: item.sections || {},
    flashcards: getFocusRoomFlashcardsForHistoryItem(item),
    quizzes: getFocusRoomQuizRecordsForHistoryItem(item),
    mindMap: item.mindMap || item.mind_map || item.brainstorm || null,
    studyPlan: [],
    progressHistory: [],
    sources: Array.isArray(item.sources) ? item.sources : [],
    sourceItems: Array.isArray(item.sourceItems) ? item.sourceItems : (Array.isArray(item.sources) ? item.sources : []),
    sourceHighlights: Array.isArray(item.sourceHighlights || item.source_highlights)
      ? (item.sourceHighlights || item.source_highlights)
      : [],
    sourceFingerprint: item.sourceFingerprint || item.clientFingerprint || "",
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || ""
  };
}

function getSynapseFocusRoomMaterials() {
  const historyMaterials = getHistory()
    .filter(item => {
      if (!item) return false;
      if (typeof isCompanionHistoryItem === "function") return !isCompanionHistoryItem(item);
      return item.kind !== "companion"
        && !item.companionThreadId
        && !String(item.id || "").startsWith("companion:");
    })
    .map(focusRoomMaterialFromHistoryItem);
  const currentMaterial = getSynapseFocusRoomCurrentMaterial();
  if (!currentMaterial) return historyMaterials;
  return [
    currentMaterial,
    ...historyMaterials.filter(item => item.materialId !== currentMaterial.materialId)
  ];
}

function getSynapseFocusRoomMaterial(materialId) {
  const id = String(materialId || "");
  return getSynapseFocusRoomMaterials().find(item => item.materialId === id) || null;
}

function renderFocusRoomWorkspaceActions() {
  const button = document.getElementById("focusRoomCta");
  if (!button) return;
  if (!isSynapseFocusRoomEnabled()) {
    button.classList.toggle("d-none", true);
    button.disabled = true;
    button.removeAttribute("data-material-id");
    button.setAttribute("aria-label", "Focus Room is currently unavailable");
    return;
  }
  const material = getSynapseFocusRoomCurrentMaterial();
  button.classList.toggle("d-none", !material);
  button.disabled = !material;
  if (material) {
    button.setAttribute("data-material-id", material.materialId);
    button.setAttribute("aria-label", `Study ${material.materialTitle} in Focus Room`);
  } else {
    button.removeAttribute("data-material-id");
    button.setAttribute("aria-label", "Study in Focus Room");
  }
}

function notifyFocusRoomMaterialsChanged() {
  window.dispatchEvent(new CustomEvent("synapse-focus-room-materials-updated", {
    detail: {
      currentMaterialId: getSynapseFocusRoomCurrentMaterial()?.materialId || "",
      count: getSynapseFocusRoomMaterials().length
    }
  }));
}

function openSynapseFocusRoom(materialId = "") {
  if (!isSynapseFocusRoomEnabled()) {
    renderFocusRoomWorkspaceActions();
    return false;
  }
  const requestedId = materialId || getSynapseFocusRoomCurrentMaterial()?.materialId || "";
  const suffix = requestedId ? `/${encodeURIComponent(requestedId)}` : "";
  window.location.href = `focus-room.html#/focus-room${suffix}`;
  return true;
}

async function returnFromFocusRoomToWorkspace(materialId = "", target = {}) {
  const id = String(materialId || "");
  const historyItem = findFocusRoomHistoryItem(id);
  const workspaceId = String(historyItem?.id || "");
  const workspaceTarget = normalizeFocusRoomWorkspaceTarget({ ...target, materialId: workspaceId });
  try {
    if (workspaceId) {
      await loadHistoryEntry(workspaceId, { preserveScroll: true });
    }
  } catch (error) {
    console.error("Could not restore Focus Room material:", error);
  } finally {
    window.location.hash = "";
    renderFocusRoomWorkspaceActions();
    notifyFocusRoomMaterialsChanged();
    applyFocusRoomWorkspaceTarget(workspaceTarget);
  }
}
