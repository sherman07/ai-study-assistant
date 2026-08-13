function getFlashcardNoteKey() {
  if (currentHistoryId) return `history:${currentHistoryId}`;
  if (currentSourceFingerprint) return `fingerprint:${currentSourceFingerprint}`;
  return "";
}

function getFlashcardStore() {
  const parsed = safeReadJSONStorage(FLASHCARD_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function setFlashcardStore(store) {
  return safeWriteJSONStorage(FLASHCARD_STORAGE_KEY, store || {});
}

function normalizeClientFlashcard(card, index) {
  const front = String(card?.front || card?.term || card?.question || `Card ${index + 1}`).trim();
  const back = String(card?.back || card?.definition || card?.answer || "").trim();
  return {
    id: card?.id || `fc${index + 1}`,
    front,
    back: back || "Open the notes for the supporting explanation.",
    hint: String(card?.hint || "").trim(),
    sourceReference: String(card?.source_reference || card?.sourceReference || "").trim(),
    difficulty: String(card?.difficulty || "medium").trim().toLowerCase(),
    tags: Array.isArray(card?.tags) ? card.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 4) : []
  };
}

function normalizeClientFlashcardDeck(data) {
  const cards = Array.isArray(data?.cards) ? data.cards : [];
  return cards.map(normalizeClientFlashcard).filter(card => card.front && card.back);
}

function persistFlashcardsForCurrentNote() {
  const key = getFlashcardNoteKey();
  if (!key) return;
  const store = getFlashcardStore();
  store[key] = {
    title: storedTitle,
    updatedAt: new Date().toISOString(),
    settings: flashcardSettings,
    cards: currentFlashcards
  };
  setFlashcardStore(store);
}

function loadFlashcardsForCurrentNote() {
  const store = getFlashcardStore();
  const keys = [
    currentHistoryId ? `history:${currentHistoryId}` : "",
    currentSourceFingerprint ? `fingerprint:${currentSourceFingerprint}` : ""
  ].filter(Boolean);
  const record = keys.map(key => store[key]).find(item => item && Array.isArray(item.cards));
  currentFlashcards = record ? normalizeClientFlashcardDeck(record) : [];
  if (record?.settings) {
    flashcardSettings = normalizeFlashcardSettings(record.settings);
  }
  activeFlashcardIndex = 0;
  flashcardSide = "front";
  flashcardError = "";
  flashcardActivityMode = "cards";
  flashcardMatchingState = null;
  flashcardBuilderOpen = false;
}
