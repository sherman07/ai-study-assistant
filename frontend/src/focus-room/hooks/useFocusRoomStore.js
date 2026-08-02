import { create } from "zustand/react";
import {
  clearFocusRoomActiveSession,
  FOCUS_ROOM_SCENES,
  focusRoomAudioPreset,
  formatFocusRoomDuration,
  getFocusRoomMaterial,
  focusRoomLegacyTimerStatus,
  readFocusRoomActiveSessionForMaterial,
  readFocusRoomDraft,
  readFocusRoomSessions,
  normalizeFocusRoomTimerState,
  saveFocusRoomActiveSession,
  saveFocusRoomSession,
  writeFocusRoomDraft
} from "../data.js";
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_SCENE_ID,
  MAX_DURATION_MINUTES,
  PANEL_TABS,
  buildPlanForState,
  clampDuration,
  clampDurationSeconds,
  clampInteger,
  clampVolume,
  coerceQuizAnswer,
  correctAnswerText,
  currentScene,
  durationSeconds,
  flashcardKey,
  focusAssistantReply,
  focusFlashcards,
  focusQuizQuestions,
  isQuizAnswerCorrect,
  normalizeChatMessages,
  normalizeDraftRoot,
  normalizeStudyPlanItems,
  questionText,
  sceneById
} from "../utils.js";
import {
  activeFocusTopic,
  createFocusTopicId,
  normalizeFocusTopic,
  normalizeFocusTopics,
  promoteNextFocusTopic
} from "../focusTopics.js";

const DEFAULT_AUDIO_CHANNELS = Object.freeze({
  "white-noise": 0, "pink-noise": 0, "brown-noise": 0, "light-rain": 24, "heavy-rain": 0,
  "ocean-waves": 0, wind: 0, fireplace: 0, train: 0, cafe: 0, street: 0, forest: 0,
  "summer-night": 0, waterfall: 0, typing: 0, "page-turning": 0, writing: 0
});

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

function clockNowMs() {
  const now = Date.now();
  return Number.isFinite(now) ? now : 0;
}

function timerStateFor(source = {}) {
  return normalizeFocusRoomTimerState(source.timerState || source.timerPhase || source.status || source.timerStatus);
}

// The configured block length in seconds. pomodoroDurationSeconds is the
// canonical, second-precise value; pomodoroDuration (whole minutes) is kept in
// sync for presets, labels, and study-plan sizing.
function configuredDurationSeconds(source = {}) {
  const seconds = Number(source.pomodoroDurationSeconds);
  if (Number.isFinite(seconds) && seconds > 0) {
    return clampDurationSeconds(seconds, durationSeconds(source.pomodoroDuration));
  }
  return durationSeconds(source.pomodoroDuration);
}

function timerTotalSeconds(source = {}) {
  if (source.timerMode === "countup") return 0;
  const persistedDuration = Number(source.timerDurationSeconds);
  return Number.isFinite(persistedDuration) && persistedDuration > 0
    ? persistedDuration
    : configuredDurationSeconds(source);
}

function elapsedSecondsAt(source = {}, now = clockNowMs()) {
  const current = Math.max(0, Number(source.elapsedSeconds) || 0);
  if (timerStateFor(source) !== "running") return current;
  const anchor = Number(source.timerAnchorAtMs);
  if (!Number.isFinite(anchor) || anchor <= 0) return current;
  return Math.max(current, Math.floor(Math.max(0, now - anchor) / 1000));
}

function timerStateFields(nextState, now = clockNowMs()) {
  const timerState = normalizeFocusRoomTimerState(nextState);
  return {
    timerState,
    timerPhase: timerState,
    status: timerState,
    timerStatus: focusRoomLegacyTimerStatus(timerState),
    timerUpdatedAtMs: now
  };
}

function timerSnapshot(source = {}) {
  const timerState = timerStateFor(source);
  return {
    timerState,
    timerPhase: timerState,
    status: timerState,
    timerStatus: focusRoomLegacyTimerStatus(timerState),
    timerMode: source.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: Number.isFinite(Number(source.timerAnchorAtMs)) ? Number(source.timerAnchorAtMs) : null,
    timerPausedAtMs: Number.isFinite(Number(source.timerPausedAtMs)) ? Number(source.timerPausedAtMs) : null,
    timerUpdatedAtMs: Number.isFinite(Number(source.timerUpdatedAtMs)) ? Number(source.timerUpdatedAtMs) : null,
    timerRestoredAtMs: Number.isFinite(Number(source.timerRestoredAtMs)) ? Number(source.timerRestoredAtMs) : null,
    timerDurationSeconds: timerTotalSeconds(source),
    pomodoroDuration: source.pomodoroDuration,
    pomodoroDurationSeconds: configuredDurationSeconds(source),
    elapsedSeconds: Math.max(0, Number(source.elapsedSeconds) || 0),
    startedAt: source.startedAt || null,
    currentSession: source.currentSession || null,
    view: source.view
  };
}

function persistTimerSnapshot(source) {
  const materialId = String(source.selectedMaterialId || source.selectedMaterial?.materialId || "");
  if (!materialId || source.view !== "session") return false;
  return saveFocusRoomActiveSession(materialId, timerSnapshot(source));
}

function reconciledTimer(source, now = clockNowMs()) {
  const elapsedSeconds = elapsedSecondsAt(source, now);
  const total = timerTotalSeconds(source);
  const completed = source.timerMode !== "countup" && total > 0 && elapsedSeconds >= total;
  const nextState = completed ? "completed" : timerStateFor(source);
  return {
    ...timerStateFields(nextState, now),
    elapsedSeconds: completed ? total : elapsedSeconds,
    timerAnchorAtMs: nextState === "running" ? source.timerAnchorAtMs : null,
    timerPausedAtMs: nextState === "running" ? null : (source.timerPausedAtMs || now),
    audioPlaying: nextState === "running" ? source.audioPlaying : false
  };
}

function hydratedMaterialState(material, previous = {}) {
  const scene = currentScene(previous.selectedScene);
  const draft = readDraftForMaterial(material?.materialId);
  const selectedScene = sceneById(draft?.selectedScene) ? draft.selectedScene : scene.id;
  const activeScene = currentScene(selectedScene);
  const musicType = String(draft?.musicType || activeScene.musicType || "Deep Focus");
  const ambientSound = String(draft?.ambientSound || activeScene.ambientSound || "Nature");
  const musicVolume = clampVolume(draft?.musicVolume, previous.musicVolume ?? 60);
  const ambientVolume = clampVolume(draft?.ambientVolume, previous.ambientVolume ?? 50);
  const pomodoroDuration = clampDuration(draft?.durationMinutes, previous.pomodoroDuration ?? DEFAULT_DURATION_MINUTES);
  const pomodoroDurationSeconds = clampDurationSeconds(
    draft?.durationSeconds,
    previous.pomodoroDurationSeconds ?? pomodoroDuration * 60
  );
  const studyGoal = String(draft?.studyGoal || `Study ${material?.materialTitle || "this material"}`);
  const draftPlan = normalizeStudyPlanItems(draft?.studyPlan);
  const studyPlan = draftPlan.length ? draftPlan : buildPlanForState(material, studyGoal, pomodoroDuration);
  const completedTasks = draftCompletedTasks(draft);
  const workspaceNotes = String(draft?.workspaceNotes || "");
  const workspaceUpdatedAt = draft?.workspaceUpdatedAt || draft?.updatedAt || "";

  return {
    selectedScene,
    musicType,
    ambientSound,
    musicVolume,
    ambientVolume,
    audioChannels: { ...DEFAULT_AUDIO_CHANNELS, ...(draft?.audioChannels || previous.audioChannels || {}) },
    pomodoroDuration,
    pomodoroDurationSeconds,
    studyGoal,
    studyPlan,
    completedTasks,
    workspaceNotes,
    workspaceUpdatedAt
  };
}

function restoreActiveSessionState(materialId) {
  const snapshot = readFocusRoomActiveSessionForMaterial(materialId);
  if (!snapshot || typeof snapshot !== "object") return null;
  const snapshotState = timerStateFor(snapshot);
  const now = clockNowMs();
  const snapshotAnchor = Number(snapshot.timerAnchorAtMs);
  const startedAtMs = Date.parse(snapshot.startedAt || "");
  const fallbackAnchor = Number.isFinite(startedAtMs) ? startedAtMs : NaN;
  const runningElapsed = snapshotState === "running"
    ? elapsedSecondsAt({
        ...snapshot,
        timerState: "running",
        timerAnchorAtMs: Number.isFinite(snapshotAnchor) && snapshotAnchor > 0 ? snapshotAnchor : fallbackAnchor
      }, now)
    : Math.max(0, Number(snapshot.elapsedSeconds) || 0);
  const total = timerTotalSeconds(snapshot);
  const restoredTimerState = snapshotState === "running"
    ? (total > 0 && runningElapsed >= total ? "completed" : "paused")
    : snapshotState;
  const needsRestoring = snapshotState === "running";
  return {
    route: snapshot.view === "session" ? "session" : "setup",
    view: snapshot.view === "session" ? "session" : "setup",
    ...timerStateFields(needsRestoring ? "restoring" : restoredTimerState, now),
    timerRestoreTarget: needsRestoring ? restoredTimerState : null,
    timerMode: snapshot.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: needsRestoring ? null : (Number(snapshot.timerPausedAtMs) || null),
    timerRestoredAtMs: needsRestoring ? null : now,
    timerDurationSeconds: total,
    ...(Number(snapshot.pomodoroDurationSeconds) > 0
      ? { pomodoroDurationSeconds: clampDurationSeconds(snapshot.pomodoroDurationSeconds) }
      : {}),
    elapsedSeconds: total > 0 ? Math.min(total, runningElapsed) : runningElapsed,
    startedAt: snapshot.startedAt || null,
    currentSession: snapshot.currentSession || null,
    completedTasks: Array.isArray(snapshot.completedTasks) ? snapshot.completedTasks.filter(Boolean) : [],
    flashcardIndex: Math.max(0, Number(snapshot.flashcardIndex) || 0),
    flashcardSide: snapshot.flashcardSide === "back" ? "back" : "front",
    flashcardProgress: snapshot.flashcardProgress && typeof snapshot.flashcardProgress === "object" && !Array.isArray(snapshot.flashcardProgress)
      ? snapshot.flashcardProgress
      : {},
    quizAnswers: snapshot.quizAnswers && typeof snapshot.quizAnswers === "object" && !Array.isArray(snapshot.quizAnswers)
      ? snapshot.quizAnswers
      : {},
    quizChecked: snapshot.quizChecked && typeof snapshot.quizChecked === "object" && !Array.isArray(snapshot.quizChecked)
      ? snapshot.quizChecked
      : {},
    chatMessages: normalizeChatMessages(snapshot.chatMessages),
    chatPending: false,
    chatError: "",
    panelTab: PANEL_TABS.has(snapshot.panelTab) ? snapshot.panelTab : "materials",
    workspaceNotes: String(snapshot.workspaceNotes || ""),
    workspaceUpdatedAt: snapshot.workspaceUpdatedAt || snapshot.updatedAt || "",
    activeNoteSection: String(snapshot.activeNoteSection || ""),
    activeSourceHighlight: normalizeSourceHighlight(snapshot.activeSourceHighlight),
    assistantContext: normalizeAssistantContext(snapshot.assistantContext),
    audioPlaying: false
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

async function requestFocusAssistantAnswer(question, chatHistory, material, assistantContext = {}) {
  if (!globalThis.apiClient || typeof globalThis.apiClient.fetch !== "function") {
    return {
      answer: focusAssistantReply(question, material, useFocusRoomStore.getState().studyGoal),
      offline: true
    };
  }

  const response = await globalThis.apiClient.fetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      selected_section: assistantContext.sectionTitle || material?.studyHeadings?.[0] || "",
      selected_excerpt: assistantContext.excerpt || "",
      source_strict: Boolean(material?.isSourceRestricted),
      preferred_language: globalThis.preferredLanguage?.value || "auto",
      title: material?.materialTitle || "Study material",
      summary: material?.aiSummary || material?.summaryText || "",
      sections: material?.sections || {},
      source_identity: material?.materialId || "",
      source_fingerprint: material?.sourceFingerprint || "",
      chat_history: chatHistory
    })
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new Error("Backend returned non-JSON response.");
  }

  if (!response.ok || data?.error) {
    throw new Error(data?.error || "AI request failed.");
  }

  return {
    answer: data?.answer || "No answer returned.",
    usedExternalResearch: Boolean(data?.used_external_research),
    researchSources: Array.isArray(data?.research_sources) ? data.research_sources : []
  };
}

export const useFocusRoomStore = create((set, get) => {
  const scene = initialScene();
  const draft = readDraftForMaterial("focus-room");
  const draftScene = sceneById(draft?.selectedScene) ? currentScene(draft.selectedScene) : scene;
  const draftDurationMinutes = clampDuration(draft?.durationMinutes, DEFAULT_DURATION_MINUTES);
  const draftDurationSeconds = clampDurationSeconds(
    draft?.durationSeconds,
    durationSeconds(draftDurationMinutes)
  );

  return {
    route: "setup",
    view: "setup",
    materials: [],
    materialsStatus: "idle",
    materialsError: "",
    selectedMaterialId: "focus-room",
    selectedMaterial: null,
    selectedScene: draftScene.id,
    musicType: String(draft?.musicType || draftScene.musicType || "Deep Focus"),
    ambientSound: String(draft?.ambientSound || draftScene.ambientSound || "Nature"),
    musicVolume: clampVolume(draft?.musicVolume, 60),
    ambientVolume: clampVolume(draft?.ambientVolume, 50),
    audioChannels: { ...DEFAULT_AUDIO_CHANNELS, ...(draft?.audioChannels || {}) },
    pomodoroDuration: draftDurationMinutes,
    pomodoroDurationSeconds: draftDurationSeconds,
    timerStatus: "idle",
    timerState: "idle",
    timerPhase: "idle",
    status: "idle",
    timerRestoreTarget: null,
    timerMode: "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: null,
    timerUpdatedAtMs: null,
    timerRestoredAtMs: null,
    timerDurationSeconds: draftDurationSeconds,
    ...normalizeFocusTopics(draft?.focusTopics, draft?.studyGoal || "Deep work block"),
    studyPlan: [],
    aiPanelOpen: false,
    isIdle: false,
    currentSession: null,
    sessionHistory: [],
    activeDrawer: "",
    audioPlaying: false,
    elapsedSeconds: 0,
    startedAt: null,
    panelTab: "materials",
    summaryRecord: null,
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {},
    workspaceNotes: String(draft?.workspaceNotes || ""),
    workspaceUpdatedAt: draft?.workspaceUpdatedAt || "",
    activeNoteSection: "",
    activeSourceHighlight: null,
    assistantContext: { sectionTitle: "", excerpt: "" },
    chatMessages: [],
    chatPending: false,
    chatError: "",

    setIdle: isIdle => set({ isIdle }),

    initializeFocusRoom() {
      const state = get();
      const snapshot = readFocusRoomActiveSessionForMaterial("focus-room");
      const restored = restoreActiveSessionState("focus-room");
      const snapshotTimerState = timerStateFor(snapshot || {});
      // Only resume the immersive room when a focus block was actively running.
      // Idle leftovers from a previous visit must never skip the setup page.
      const shouldResumeRunningSession = Boolean(
        restored?.view === "session"
        && restored.currentSession
        && snapshotTimerState === "running"
      );
      if (shouldResumeRunningSession) {
        const activeScene = currentScene(snapshot?.selectedScene || state.selectedScene);
        set({
          selectedMaterialId: "focus-room",
          selectedMaterial: null,
          studyPlan: Array.isArray(snapshot?.studyPlan) ? snapshot.studyPlan : [],
          selectedScene: activeScene.id,
          musicType: snapshot?.musicType || state.musicType,
          ambientSound: snapshot?.ambientSound || state.ambientSound,
          musicVolume: clampVolume(snapshot?.musicVolume, state.musicVolume),
          ambientVolume: clampVolume(snapshot?.ambientVolume, state.ambientVolume),
          audioChannels: { ...DEFAULT_AUDIO_CHANNELS, ...(snapshot?.audioChannels || state.audioChannels || {}) },
          pomodoroDuration: clampDuration(snapshot?.pomodoroDuration, state.pomodoroDuration),
          pomodoroDurationSeconds: clampDurationSeconds(
            snapshot?.pomodoroDurationSeconds,
            state.pomodoroDurationSeconds
          ),
          ...normalizeFocusTopics(
            snapshot?.focusTopics || state.focusTopics,
            snapshot?.studyGoal || state.studyGoal || "Deep work block"
          ),
          summaryRecord: null,
          ...restored,
          route: "session",
          view: "session",
        });
        return;
      }

      // Always land on setup for a fresh Focus Room visit.
      clearFocusRoomActiveSession("focus-room");
      const draftSettings = readDraftForMaterial("focus-room");
      const activeScene = currentScene(draftSettings?.selectedScene || state.selectedScene);
      const pomodoroDuration = clampDuration(draftSettings?.durationMinutes, state.pomodoroDuration || DEFAULT_DURATION_MINUTES);
      const pomodoroDurationSeconds = clampDurationSeconds(
        draftSettings?.durationSeconds,
        state.pomodoroDurationSeconds || durationSeconds(pomodoroDuration)
      );
      set({
        route: "setup",
        view: "setup",
        selectedMaterialId: "focus-room",
        selectedMaterial: null,
        selectedScene: activeScene.id,
        musicType: String(draftSettings?.musicType || activeScene.musicType || state.musicType || "Deep Focus"),
        ambientSound: String(draftSettings?.ambientSound || activeScene.ambientSound || state.ambientSound || "Nature"),
        musicVolume: clampVolume(draftSettings?.musicVolume, state.musicVolume ?? 60),
        ambientVolume: clampVolume(draftSettings?.ambientVolume, state.ambientVolume ?? 50),
        audioChannels: { ...DEFAULT_AUDIO_CHANNELS, ...(draftSettings?.audioChannels || state.audioChannels || {}) },
        pomodoroDuration,
        pomodoroDurationSeconds,
        timerDurationSeconds: pomodoroDurationSeconds,
        ...normalizeFocusTopics(
          draftSettings?.focusTopics || state.focusTopics,
          draftSettings?.studyGoal || state.studyGoal || "Deep work block"
        ),
        studyPlan: [],
        completedTasks: [],
        currentSession: null,
        summaryRecord: null,
        audioPlaying: false,
        elapsedSeconds: 0,
        startedAt: null,
        ...timerStateFields("idle", clockNowMs()),
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        workspaceNotes: String(draftSettings?.workspaceNotes || state.workspaceNotes || ""),
        workspaceUpdatedAt: draftSettings?.workspaceUpdatedAt || state.workspaceUpdatedAt || "",
      });
    },

    returnToSetup() {
      const state = get();
      persistDraftFromState(state);
      clearFocusRoomActiveSession("focus-room");
      set({
        route: "setup",
        view: "setup",
        currentSession: null,
        summaryRecord: null,
        audioPlaying: false,
        aiPanelOpen: false,
        activeDrawer: "",
        elapsedSeconds: 0,
        startedAt: null,
        ...timerStateFields("idle", clockNowMs()),
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: configuredDurationSeconds(state),
      });
    },

    setMaterialsState({ items = [], status = "ready", error = "" } = {}) {
      set({
        materials: Array.isArray(items) ? items : [],
        materialsStatus: status === "error" ? "error" : (status === "loading" ? "loading" : "ready"),
        materialsError: String(error || "")
      });
    },

    hydrateFocusRoute(route, material, { preserveSession = false } = {}) {
      const previous = get();
      const hasMaterial = !!material;
      const selectedMaterialId = hasMaterial ? material.materialId : String(route.materialId || "");

      if (!hasMaterial) {
        set({
          route: "setup",
          view: "setup",
          selectedMaterialId,
          selectedMaterial: null,
          aiPanelOpen: false,
          activeDrawer: "",
          summaryRecord: null,
          studyPlan: [],
          workspaceNotes: "",
          workspaceUpdatedAt: "",
          activeNoteSection: "",
          activeSourceHighlight: null,
          assistantContext: { sectionTitle: "", excerpt: "" }
        });
        return;
      }

      const sameMaterial = previous.selectedMaterialId === selectedMaterialId;
      const restoredSession = sameMaterial && preserveSession
        ? null
        : restoreActiveSessionState(selectedMaterialId);
      const hydrated = sameMaterial && preserveSession
        ? {}
        : hydratedMaterialState(material, previous);
      const freshSessionState = sameMaterial && preserveSession ? {} : {
        timerStatus: "idle",
        timerState: "idle",
        timerPhase: "idle",
        status: "idle",
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerUpdatedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: configuredDurationSeconds({
          pomodoroDuration: hydrated.pomodoroDuration || DEFAULT_DURATION_MINUTES,
          pomodoroDurationSeconds: hydrated.pomodoroDurationSeconds
        }),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...resetProgressState(),
        chatMessages: [],
        chatPending: false,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      };
      const nextView = sameMaterial && preserveSession
        ? (previous.view === "session" ? "session" : "setup")
        : (restoredSession?.view === "session" ? "session" : "setup");

      set({
        ...hydrated,
        ...freshSessionState,
        ...restoredSession,
        route: nextView,
        view: nextView,
        selectedMaterialId,
        selectedMaterial: material,
        aiPanelOpen: false,
        activeDrawer: "",
        summaryRecord: null
      });

      if (restoredSession?.timerState === "restoring") {
        const restoreTarget = restoredSession.timerRestoreTarget || "paused";
        Promise.resolve().then(() => {
          const current = get();
          if (current.selectedMaterialId !== selectedMaterialId || current.timerState !== "restoring") return;
          const now = clockNowMs();
          const total = timerTotalSeconds(current);
          const elapsedSeconds = total > 0
            ? Math.min(total, Math.max(0, Number(current.elapsedSeconds) || 0))
            : Math.max(0, Number(current.elapsedSeconds) || 0);
          const next = {
            ...timerStateFields(restoreTarget, now),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: restoreTarget === "paused" ? now : null,
            timerRestoredAtMs: now,
            elapsedSeconds,
            audioPlaying: false
          };
          set(next);
          persistTimerSnapshot({ ...current, ...next });
        });
      }
    },

    showStudyHistory() {
      set({
        route: "history",
        view: "history",
        aiPanelOpen: false,
        activeDrawer: "",
        summaryRecord: null,
        sessionHistory: readFocusRoomSessions()
      });
    },

    selectScene(sceneId) {
      const nextScene = sceneById(sceneId);
      if (!nextScene) return;
      set(state => {
        const next = {
          selectedScene: nextScene.id,
          musicType: nextScene.musicType || state.musicType,
          ambientSound: nextScene.ambientSound || state.ambientSound
        };
        const merged = { ...state, ...next };
        persistDraftFromState(merged);
        return next;
      });
    },

    setPomodoroDurationSeconds(value) {
      set(state => {
        const pomodoroDurationSeconds = clampDurationSeconds(value, state.pomodoroDurationSeconds);
        const pomodoroDuration = Math.max(1, Math.round(pomodoroDurationSeconds / 60));
        const studyPlan = state.selectedMaterial
          ? buildPlanForState(state.selectedMaterial, state.studyGoal, pomodoroDuration)
          : [];
        const next = {
          pomodoroDuration,
          pomodoroDurationSeconds,
          studyPlan,
          timerDurationSeconds: state.timerMode === "countup" ? 0 : pomodoroDurationSeconds
        };
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    setPomodoroDuration(value) {
      const minutes = clampDuration(value, get().pomodoroDuration);
      get().setPomodoroDurationSeconds(minutes * 60);
    },

    setStudyGoal(value) {
      set(state => {
        const studyGoal = String(value ?? "");
        const studyPlan = state.selectedMaterial
          ? buildPlanForState(state.selectedMaterial, studyGoal, state.pomodoroDuration)
          : [];
        const focusTopics = Array.isArray(state.focusTopics) ? state.focusTopics.map(topic => (
          topic.id === state.activeTopicId || topic.status === "active"
            ? { ...topic, title: studyGoal || topic.title, status: "active" }
            : topic
        )) : normalizeFocusTopics([], studyGoal).focusTopics;
        const next = {
          studyGoal,
          studyPlan,
          focusTopics,
          activeTopicId: state.activeTopicId || focusTopics.find(topic => topic.status === "active")?.id || ""
        };
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    addFocusTopic(partial = {}) {
      set(state => {
        const hasActive = (state.focusTopics || []).some(topic => topic.status === "active");
        const topic = normalizeFocusTopic({
          id: createFocusTopicId(),
          title: partial.title || `Topic ${(state.focusTopics || []).length + 1}`,
          description: partial.description || "",
          status: hasActive ? "pending" : "active"
        }, hasActive ? "pending" : "active");
        const focusTopics = [...(state.focusTopics || []), topic];
        const next = {
          focusTopics,
          activeTopicId: hasActive ? state.activeTopicId : topic.id,
          studyGoal: hasActive ? state.studyGoal : topic.title
        };
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    updateFocusTopic(topicId, patch = {}) {
      set(state => {
        const focusTopics = (state.focusTopics || []).map(topic => {
          if (topic.id !== topicId) return topic;
          return normalizeFocusTopic({
            ...topic,
            ...patch,
            id: topic.id,
            status: topic.status
          }, topic.status);
        });
        const active = activeFocusTopic(focusTopics, state.activeTopicId);
        const next = {
          focusTopics,
          activeTopicId: active?.id || state.activeTopicId || "",
          studyGoal: active?.title || state.studyGoal
        };
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    activateFocusTopic(topicId) {
      set(state => {
        const next = promoteNextFocusTopic(state.focusTopics, topicId);
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    finishFocusTopic(topicId = "") {
      set(state => {
        const targetId = String(topicId || state.activeTopicId || "");
        const marked = (state.focusTopics || []).map(topic => (
          topic.id === targetId ? { ...topic, status: "done" } : topic
        ));
        const next = promoteNextFocusTopic(marked);
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    removeFocusTopic(topicId) {
      set(state => {
        const remaining = (state.focusTopics || []).filter(topic => topic.id !== topicId);
        if (!remaining.length) {
          const seeded = normalizeFocusTopics([], state.studyGoal || "Deep work block");
          persistDraftFromState({ ...state, ...seeded });
          return seeded;
        }
        const removedWasActive = state.activeTopicId === topicId
          || (state.focusTopics || []).some(topic => topic.id === topicId && topic.status === "active");
        const next = removedWasActive
          ? promoteNextFocusTopic(remaining)
          : normalizeFocusTopics(remaining, state.studyGoal);
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    setSound(key, value) {
      set(state => {
        let next = {};
        if (key === "musicVolume") next = { musicVolume: clampVolume(value, state.musicVolume) };
        if (key === "ambientVolume") next = { ambientVolume: clampVolume(value, state.ambientVolume) };
        if (key === "musicType") next = { musicType: String(value || state.musicType) };
        if (key === "ambientSound") next = { ambientSound: String(value || state.ambientSound) };
        if (String(key).startsWith("audioChannel:")) {
          const channel = String(key).slice("audioChannel:".length);
          next = { audioChannels: { ...state.audioChannels, [channel]: clampVolume(value, state.audioChannels?.[channel] ?? 0) } };
        }
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    applyAudioPreset(presetId) {
      set(state => {
        const preset = focusRoomAudioPreset(presetId);
        const next = {
          musicType: preset.musicType,
          ambientSound: preset.ambientSound
        };
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    toggleAudio() {
      set(state => ({ audioPlaying: !state.audioPlaying }));
    },

    setAudioPlaying(audioPlaying) {
      set({ audioPlaying: Boolean(audioPlaying) });
    },

    openDrawer(activeDrawer) {
      set({
        activeDrawer
      });
    },

    closeDrawer() {
      set({
        activeDrawer: ""
      });
    },

    toggleAIPanel(nextOpen = null) {
      set(state => ({ aiPanelOpen: typeof nextOpen === "boolean" ? nextOpen : !state.aiPanelOpen }));
    },

    openStudyPanel(tab = "materials") {
      const nextTab = PANEL_TABS.has(String(tab || "")) ? String(tab) : "materials";
      set({
        panelTab: nextTab,
        aiPanelOpen: true,
        activeDrawer: ""
      });
    },

    selectSourceHighlight(highlight = null, { openPanel = true } = {}) {
      const activeSourceHighlight = normalizeSourceHighlight(highlight);
      set({
        activeSourceHighlight,
        activeNoteSection: activeSourceHighlight?.sectionTitle || get().activeNoteSection || "",
        assistantContext: activeSourceHighlight
          ? normalizeAssistantContext({
              sectionTitle: activeSourceHighlight.sectionTitle,
              excerpt: activeSourceHighlight.excerpt
            })
          : get().assistantContext,
        ...(openPanel ? { panelTab: "sources", aiPanelOpen: true, activeDrawer: "" } : {})
      });
    },

    setActiveNoteSection(sectionTitle = "") {
      set({
        activeNoteSection: String(sectionTitle || "").trim()
      });
    },

    setPanelTab(tab) {
      const nextTab = String(tab || "materials");
      set({
        panelTab: PANEL_TABS.has(nextTab) ? nextTab : "materials",
        aiPanelOpen: true,
        activeDrawer: ""
      });
    },

    startSession() {
      const state = get();
      const timerMode = state.timerMode === "countup" ? "countup" : "countdown";
      persistDraftFromState(state);
      set({
        route: "session",
        view: "session",
        timerStatus: "idle",
        timerState: "idle",
        timerPhase: "idle",
        status: "idle",
        timerRestoreTarget: null,
        timerMode,
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerUpdatedAtMs: clockNowMs(),
        timerRestoredAtMs: null,
        timerDurationSeconds: timerMode === "countup" ? 0 : configuredDurationSeconds(state),
        elapsedSeconds: 0,
        startedAt: null,
        summaryRecord: null,
        aiPanelOpen: false,
        activeDrawer: "",
        currentSession: {
          sessionId: `focus-${Date.now()}`,
          materialId: "focus-room",
          studyGoal: state.studyGoal,
          selectedScene: state.selectedScene,
          musicType: state.musicType,
          ambientSound: state.ambientSound,
          musicVolume: state.musicVolume,
          ambientVolume: state.ambientVolume,
          pomodoroDuration: state.pomodoroDuration,
          startedAt: null
        },
        ...resetProgressState(),
        chatMessages: [],
        chatPending: false,
        chatError: ""
      });
    },

    startTimer() {
      const state = get();
      if (!state.currentSession || state.view !== "session") {
        get().startSession();
      }
      const live = get();
      const now = clockNowMs();
      const currentState = timerStateFor(live);
      if (currentState === "running") {
        get().tickTimer();
        return;
      }
      const total = timerTotalSeconds(live);
      const shouldRestart = currentState === "completed" || currentState === "break" || total > 0 && live.elapsedSeconds >= total;
      const elapsedSeconds = shouldRestart ? 0 : Math.max(0, Number(live.elapsedSeconds) || 0);
      const next = {
        view: "session",
        route: "session",
        ...timerStateFields("running", now),
        audioPlaying: true,
        summaryRecord: null,
        elapsedSeconds,
        startedAt: !live.startedAt || shouldRestart ? new Date(now).toISOString() : live.startedAt,
        timerAnchorAtMs: now - elapsedSeconds * 1000,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: total,
        ...(shouldRestart ? resetProgressState() : {})
      };
      set(next);
      persistTimerSnapshot({ ...live, ...next });
    },

    pauseTimer({ pauseAudio = true } = {}) {
      const state = get();
      const now = clockNowMs();
      if (timerStateFor(state) !== "running") {
        if (pauseAudio && state.audioPlaying) set({ audioPlaying: false });
        return;
      }
      const reconciled = reconciledTimer(state, now);
      const next = {
        ...reconciled,
        ...timerStateFields(reconciled.timerState === "completed" ? "completed" : "paused", now),
        timerAnchorAtMs: null,
        timerPausedAtMs: now,
        audioPlaying: pauseAudio ? false : state.audioPlaying
      };
      set(next);
      persistTimerSnapshot({ ...state, ...next });
    },

    resetTimer() {
      const now = clockNowMs();
      const next = {
        ...timerStateFields("idle", now),
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: configuredDurationSeconds(get()),
        audioPlaying: false,
        startedAt: null,
        elapsedSeconds: 0,
        summaryRecord: null,
        ...resetProgressState()
      };
      set(next);
      persistTimerSnapshot({ ...get(), ...next });
    },

    skipTimer() {
      const state = get();
      const now = clockNowMs();
      const total = timerTotalSeconds(state);
      const next = {
        ...timerStateFields("completed", now),
        elapsedSeconds: total || Math.max(0, Number(state.elapsedSeconds) || 0),
        audioPlaying: false,
        startedAt: state.startedAt || new Date(now).toISOString(),
        timerAnchorAtMs: null,
        timerPausedAtMs: now,
        timerDurationSeconds: total
      };
      set(next);
      persistTimerSnapshot({ ...state, ...next });
    },

    tickTimer() {
      const state = get();
      if (state.view !== "session" || timerStateFor(state) !== "running") return;
      const now = clockNowMs();
      const total = timerTotalSeconds(state);
      const elapsedSeconds = total
        ? Math.min(total, elapsedSecondsAt(state, now))
        : elapsedSecondsAt(state, now);
      const nextState = total > 0 && elapsedSeconds >= total ? "completed" : "running";
      const next = {
        ...timerStateFields(nextState, now),
        elapsedSeconds,
        timerAnchorAtMs: nextState === "running" ? state.timerAnchorAtMs : null,
        timerPausedAtMs: nextState === "running" ? null : now,
        timerDurationSeconds: total,
        audioPlaying: nextState === "running" ? state.audioPlaying : false
      };
      if (elapsedSeconds === state.elapsedSeconds && nextState === timerStateFor(state)) return;
      set(next);
      persistTimerSnapshot({ ...state, ...next });
    },

    setTimerMode(mode = "countdown") {
      const timerMode = mode === "countup" ? "countup" : "countdown";
      const next = {
        timerMode,
        timerDurationSeconds: timerMode === "countup" ? 0 : configuredDurationSeconds(get())
      };
      set(next);
      persistTimerSnapshot({ ...get(), ...next });
    },

    startBreak() {
      const now = clockNowMs();
      const next = {
        ...timerStateFields("break", now),
        timerRestoreTarget: null,
        timerAnchorAtMs: null,
        timerPausedAtMs: now,
        timerDurationSeconds: 0,
        audioPlaying: false
      };
      set(next);
      persistTimerSnapshot({ ...get(), ...next });
    },

    getTimerState() {
      return timerStateFor(get());
    },

    endSession() {
      const state = get();
      const nowMs = clockNowMs();
      const now = new Date(nowMs).toISOString();
      const reconciled = timerStateFor(state) === "running" ? reconciledTimer(state, nowMs) : state;
      const total = timerTotalSeconds(reconciled);
      const totalFocusTime = total ? Math.min(total, reconciled.elapsedSeconds) : reconciled.elapsedSeconds;
      const record = saveFocusRoomSession({
        sessionId: state.currentSession?.sessionId,
        materialId: "focus-room",
        materialTitle: "Focus Room",
        studyGoal: state.studyGoal,
        selectedScene: state.selectedScene,
        musicType: state.musicType,
        ambientSound: state.ambientSound,
        musicVolume: state.musicVolume,
        ambientVolume: state.ambientVolume,
        pomodoroDuration: state.pomodoroDuration,
        startedAt: state.startedAt || now,
        endedAt: now,
        totalFocusTime,
        flashcardsCompleted: 0,
        quizScore: null,
        mistakesMade: [],
        completedTasks: [],
        recommendedNextStep: "Start another protected focus block when you are ready."
      });
      clearFocusRoomActiveSession("focus-room");

      set({
        summaryRecord: record,
        sessionHistory: readFocusRoomSessions(),
        ...timerStateFields("completed", nowMs),
        audioPlaying: false,
        timerAnchorAtMs: null,
        timerPausedAtMs: nowMs,
        timerDurationSeconds: total,
        elapsedSeconds: total ? Math.min(total, reconciled.elapsedSeconds) : reconciled.elapsedSeconds,
        currentSession: null
      });
    },

    closeSummary() {
      set({ summaryRecord: null });
    },

    setWorkspaceNotes(value) {
      set(state => {
        const next = {
          workspaceNotes: String(value ?? ""),
          workspaceUpdatedAt: new Date().toISOString()
        };
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    setAssistantContext(context = {}) {
      set({ assistantContext: normalizeAssistantContext(context) });
    },

    toggleTask(index) {
      set(state => {
        const planItem = state.studyPlan[Number(index)];
        if (!planItem) return {};
        const task = String(planItem.task || "");
        const completedTasks = state.completedTasks.includes(task)
          ? state.completedTasks.filter(item => item !== task)
          : [...state.completedTasks, task];
        persistDraftFromState({ ...state, completedTasks });
        return { completedTasks };
      });
    },

    updatePlanTask(index, minutes = null, task = null) {
      set(state => {
        const taskIndex = Number(index);
        const current = state.studyPlan[taskIndex];
        if (!current) return {};
        const previousTask = String(current.task || "");
        const nextTask = task === null || task === undefined ? previousTask : String(task || "").trim();
        const nextMinutes = minutes === null || minutes === undefined
          ? current.minutes
          : clampInteger(minutes, current.minutes, 1, MAX_DURATION_MINUTES);
        const studyPlan = state.studyPlan.map((item, itemIndex) => itemIndex === taskIndex
          ? { minutes: nextMinutes, task: nextTask || previousTask }
          : item);
        let completedTasks = state.completedTasks;
        if (previousTask && previousTask !== studyPlan[taskIndex].task && completedTasks.includes(previousTask)) {
          completedTasks = completedTasks
            .filter(item => item !== previousTask)
            .concat(studyPlan[taskIndex].task);
        }
        const next = { studyPlan, completedTasks };
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    setFlashcardIndex(index) {
      const cards = focusFlashcards(get().selectedMaterial);
      set({
        flashcardIndex: clampInteger(index, get().flashcardIndex, 0, Math.max(0, cards.length - 1)),
        flashcardSide: "front"
      });
    },

    flipFlashcard() {
      set(state => ({
        flashcardSide: state.flashcardSide === "back" ? "front" : "back"
      }));
    },

    rateFlashcard(difficulty) {
      const state = get();
      const cards = focusFlashcards(state.selectedMaterial);
      if (!cards.length) return;
      const index = clampInteger(state.flashcardIndex, 0, 0, cards.length - 1);
      const card = cards[index];
      const value = ["easy", "medium", "hard"].includes(String(difficulty)) ? String(difficulty) : "medium";
      set({
        flashcardProgress: {
          ...state.flashcardProgress,
          [flashcardKey(card, index)]: {
            difficulty: value,
            reviewedAt: new Date().toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: index < cards.length - 1 ? index + 1 : index
      });
    },

    answerQuizQuestion(index, value) {
      const questionIndex = Number(index);
      const question = focusQuizQuestions(get().selectedMaterial)[questionIndex];
      if (!question) return;
      const key = String(questionIndex);
      set(state => ({
        quizAnswers: {
          ...state.quizAnswers,
          [key]: coerceQuizAnswer(question, value, state.quizAnswers[key])
        }
      }));
    },

    checkQuizQuestion(index) {
      const questions = focusQuizQuestions(get().selectedMaterial);
      const questionIndex = Number(index);
      const question = questions[questionIndex];
      if (!question) return;
      const key = String(questionIndex);
      const state = get();
      const answer = Object.prototype.hasOwnProperty.call(state.quizAnswers, key) ? state.quizAnswers[key] : "";
      const correct = isQuizAnswerCorrect(question, answer);
      const correctAnswer = correctAnswerText(question);
      set({
        quizChecked: {
          ...state.quizChecked,
          [key]: {
            answer,
            correct: correct === null ? false : correct,
            hasKnownAnswer: correct !== null,
            explanation: question.explanation || question.rationale || (correctAnswer ? `Correct answer: ${correctAnswer}` : ""),
            checkedAt: new Date().toISOString()
          }
        }
      });
    },

    async askAssistant(question) {
      const text = String(question || "").trim();
      if (!text) return;
      const state = get();
      const material = state.selectedMaterial;
      const priorChatHistory = normalizeChatMessages(state.chatMessages)
        .slice(-10)
        .map(message => ({
          role: message.role === "user" ? "user" : "assistant",
          content: message.text
        }));
      set({
        chatMessages: normalizeChatMessages([
          ...state.chatMessages,
          { role: "user", text, createdAt: new Date().toISOString() }
        ]),
        chatPending: true,
        chatError: ""
      });

      try {
        const result = await requestFocusAssistantAnswer(text, priorChatHistory, material, state.assistantContext);
        set(nextState => ({
          chatMessages: normalizeChatMessages([
            ...nextState.chatMessages,
            { role: "assistant", text: result.answer, createdAt: new Date().toISOString() }
          ]),
          chatError: result.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (error) {
        set(nextState => ({
          chatMessages: normalizeChatMessages([
            ...nextState.chatMessages,
            { role: "assistant", text: focusAssistantReply(text, material, get().studyGoal), createdAt: new Date().toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${error.message || "request failed"}`
        }));
      } finally {
        set({ chatPending: false });
      }
    },

    focusFlashcardsCompletedCount() {
      return countFocusFlashcardsCompleted(get());
    },

    focusQuizScore() {
      return focusQuizScoreFromState(get());
    },

    focusQuizMistakes() {
      return focusQuizMistakesFromState(get());
    },

    formatFocusedTime() {
      return formatFocusRoomDuration(get().elapsedSeconds);
    }
  };
});
