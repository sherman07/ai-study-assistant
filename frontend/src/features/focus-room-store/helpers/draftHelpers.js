/** Draft persistence and small Focus Room state normalizers. */
import {
  FOCUS_ROOM_SCENES,
  readFocusRoomDraft,
  writeFocusRoomDraft
} from "../../focus-room-data/index.js";
import {
  DEFAULT_SCENE_ID,
  clampDuration,
  clampDurationSeconds,
  clampVolume,
  currentScene,
  durationSeconds,
  focusQuizQuestions,
  normalizeDraftRoot,
  normalizeStudyPlanItems,
  questionText
} from "../../../focus-room/utils.js";
import { DEFAULT_AUDIO_CHANNELS } from "../constants.js";

function initialScene() {
  return FOCUS_ROOM_SCENES[0] || currentScene(DEFAULT_SCENE_ID);
}

function readDraftForMaterial(materialId) {
  const id = String(materialId || "");
  if (!id) return null;
  const root = normalizeDraftRoot(readFocusRoomDraft());
  const draft = root.materials[id];
  return draft && typeof draft === "object" ? draft : null;
}

function persistDraftFromState(source) {
  const materialId = String(source.selectedMaterialId || source.selectedMaterial?.materialId || "");
  if (!materialId) return;
  const root = normalizeDraftRoot(readFocusRoomDraft());
  root.materials[materialId] = {
    materialId,
    selectedScene: source.selectedScene,
    musicType: source.musicType,
    ambientSound: source.ambientSound,
    musicVolume: clampVolume(source.musicVolume),
    ambientVolume: clampVolume(source.ambientVolume),
    audioChannels: { ...DEFAULT_AUDIO_CHANNELS, ...(source.audioChannels || {}) },
    durationMinutes: clampDuration(source.pomodoroDuration),
    durationSeconds: clampDurationSeconds(source.pomodoroDurationSeconds, durationSeconds(source.pomodoroDuration)),
    studyGoal: source.studyGoal,
    focusTopics: Array.isArray(source.focusTopics) ? source.focusTopics : [],
    activeTopicId: String(source.activeTopicId || ""),
    studyPlan: normalizeStudyPlanItems(source.studyPlan),
    completedTasks: Array.isArray(source.completedTasks) ? source.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(source.workspaceNotes || ""),
    workspaceUpdatedAt: source.workspaceUpdatedAt || "",
    updatedAt: new Date().toISOString()
  };
  writeFocusRoomDraft(root);
}

function draftCompletedTasks(draft) {
  return Array.isArray(draft?.completedTasks)
    ? draft.completedTasks.map(item => String(item || "").trim()).filter(Boolean)
    : [];
}

function normalizeAssistantContext(context = {}) {
  return {
    sectionTitle: String(context.sectionTitle || "").trim(),
    excerpt: String(context.excerpt || "").trim().slice(0, 1800)
  };
}

function normalizeSourceHighlight(highlight = null) {
  if (!highlight || typeof highlight !== "object") return null;
  return {
    id: String(highlight.id || "").trim(),
    title: String(highlight.title || "").trim(),
    excerpt: String(highlight.excerpt || "").trim().slice(0, 1800),
    sourceId: String(highlight.sourceId || highlight.source_id || "").trim(),
    sourceIndex: Number(highlight.sourceIndex || highlight.source_index || 0) || 0,
    sourceLabel: String(highlight.sourceLabel || highlight.source_label || "").trim(),
    sourceKind: String(highlight.sourceKind || highlight.source_kind || "").trim(),
    sectionTitle: String(highlight.sectionTitle || highlight.section_title || "").trim(),
    kind: String(highlight.kind || "evidence").trim()
  };
}

function resetProgressState() {
  return {
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {}
  };
}

function countFocusFlashcardsCompleted(state) {
  return Object.values(state.flashcardProgress || {})
    .filter(item => item && item.difficulty)
    .length;
}

function focusQuizScoreFromState(state) {
  const checked = Object.values(state.quizChecked || {}).filter(item => item && item.hasKnownAnswer);
  if (!checked.length) return null;
  const correct = checked.filter(item => item.correct).length;
  return Math.round((correct / checked.length) * 100);
}

function focusQuizMistakesFromState(state) {
  const questions = focusQuizQuestions(state.selectedMaterial);
  return Object.entries(state.quizChecked || {})
    .filter(([, result]) => result && result.hasKnownAnswer && !result.correct)
    .map(([index]) => questionText(questions[Number(index)], Number(index)))
    .filter(Boolean);
}

export {
  initialScene,
  readDraftForMaterial,
  persistDraftFromState,
  draftCompletedTasks,
  normalizeAssistantContext,
  normalizeSourceHighlight,
  resetProgressState,
  countFocusFlashcardsCompleted,
  focusQuizScoreFromState,
  focusQuizMistakesFromState
};
