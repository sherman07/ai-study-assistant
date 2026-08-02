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
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  PANEL_TABS,
  buildPlanForState,
  clampDuration,
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
    studyGoal: source.studyGoal,
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

function timerTotalSeconds(source = {}) {
  if (source.timerMode === "countup") return 0;
  const persistedDuration = Number(source.timerDurationSeconds);
  return Number.isFinite(persistedDuration) && persistedDuration > 0
    ? persistedDuration
    : durationSeconds(source.pomodoroDuration);
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

  return {
    route: "landing",
    view: "landing",
    materials: [],
    materialsStatus: "idle",
    materialsError: "",
    selectedMaterialId: "focus-room",
    selectedMaterial: null,
    selectedScene: scene.id,
    musicType: scene.musicType || "Deep Focus",
    ambientSound: scene.ambientSound || "Nature",
    musicVolume: 60,
    ambientVolume: 50,
    audioChannels: { ...DEFAULT_AUDIO_CHANNELS },
    pomodoroDuration: DEFAULT_DURATION_MINUTES,
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
    timerDurationSeconds: durationSeconds(DEFAULT_DURATION_MINUTES),
    studyGoal: "Deep work block",
    studyPlan: [],
    aiPanelOpen: false,
    isIdle: false,
    currentSession: {
      sessionId: `focus-${Date.now()}`,
      materialId: "focus-room",
      studyGoal: "Deep work block",
      selectedScene: scene.id,
      musicType: scene.musicType || "Deep Focus",
      ambientSound: scene.ambientSound || "Nature",
      musicVolume: 60,
      ambientVolume: 50,
      pomodoroDuration: DEFAULT_DURATION_MINUTES,
      startedAt: null
    },
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
    workspaceNotes: "",
    workspaceUpdatedAt: "",
    activeNoteSection: "",
    activeSourceHighlight: null,
    assistantContext: { sectionTitle: "", excerpt: "" },
    chatMessages: [],
    chatPending: false,
    chatError: "",

    setIdle: isIdle => set({ isIdle }),

    initializeFocusRoom() {
      const state = get();
      if (["landing", "setup", "session"].includes(state.view) && state.selectedMaterialId === "focus-room") return;
      const activeScene = currentScene(state.selectedScene);
      set({
        route: "landing",
        view: "landing",
        selectedMaterialId: "focus-room",
        selectedMaterial: null,
        studyGoal: state.studyGoal || "Deep work block",
        studyPlan: [],
        completedTasks: [],
        currentSession: {
          sessionId: `focus-${Date.now()}`,
          materialId: "focus-room",
          studyGoal: state.studyGoal || "Deep work block",
          selectedScene: activeScene.id,
          musicType: state.musicType,
          ambientSound: state.ambientSound,
          musicVolume: state.musicVolume,
          ambientVolume: state.ambientVolume,
          pomodoroDuration: state.pomodoroDuration,
          startedAt: null
        }
      });
    },

    openSetup() {
      set({
        route: "setup",
        view: "setup",
        aiPanelOpen: false,
        activeDrawer: "",
        summaryRecord: null
      });
    },

    openLanding() {
      set({
        route: "landing",
        view: "landing",
        aiPanelOpen: false,
        activeDrawer: "",
        summaryRecord: null
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
        timerDurationSeconds: durationSeconds(hydrated.pomodoroDuration || DEFAULT_DURATION_MINUTES),
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

    setPomodoroDuration(value) {
      set(state => {
        const pomodoroDuration = clampDuration(value, state.pomodoroDuration);
        const studyPlan = state.selectedMaterial
          ? buildPlanForState(state.selectedMaterial, state.studyGoal, pomodoroDuration)
          : [];
        const next = {
          pomodoroDuration,
          studyPlan,
          timerDurationSeconds: state.timerMode === "countup" ? 0 : durationSeconds(pomodoroDuration)
        };
        persistDraftFromState({ ...state, ...next });
        return next;
      });
    },

    setSessionDuration(minutesValue, secondsValue = 0) {
      set(state => {
        const requestedMinutes = Math.max(0, Number.parseInt(minutesValue, 10) || 0);
        const requestedSeconds = Math.min(59, Math.max(0, Number.parseInt(secondsValue, 10) || 0));
        const requestedTotal = requestedMinutes * 60 + requestedSeconds;
        const minimumTotal = durationSeconds(MIN_DURATION_MINUTES);
        const maximumTotal = durationSeconds(MAX_DURATION_MINUTES);
        const total = state.timerMode === "countup"
          ? 0
          : Math.min(maximumTotal, Math.max(minimumTotal, requestedTotal || durationSeconds(state.pomodoroDuration)));
        const pomodoroDuration = state.timerMode === "countup"
          ? clampDuration(minutesValue, state.pomodoroDuration)
          : Math.floor(total / 60);
        const now = clockNowMs();
        const currentState = timerStateFor(state);
        const currentElapsed = elapsedSecondsAt(state, now);
        const elapsedSeconds = state.timerMode === "countup"
          ? currentElapsed
          : Math.min(currentElapsed, total);
        const nextState = currentState === "completed" ? "paused" : currentState;
        const next = {
          pomodoroDuration,
          timerDurationSeconds: total,
          elapsedSeconds,
          ...timerStateFields(nextState, now),
          timerAnchorAtMs: nextState === "running" ? now - elapsedSeconds * 1000 : null,
          timerPausedAtMs: nextState === "paused" ? now : null
        };
        persistDraftFromState({ ...state, ...next });
        persistTimerSnapshot({ ...state, ...next });
        return next;
      });
    },

    setStudyGoal(value) {
      set(state => {
        const studyGoal = String(value ?? "");
        const studyPlan = state.selectedMaterial
          ? buildPlanForState(state.selectedMaterial, studyGoal, state.pomodoroDuration)
          : [];
        const next = { studyGoal, studyPlan };
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
      persistDraftFromState(state);
      set({
        route: "session",
        view: "session",
        timerStatus: "idle",
        timerState: "idle",
        timerPhase: "idle",
        status: "idle",
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerUpdatedAtMs: clockNowMs(),
        timerRestoredAtMs: null,
        timerDurationSeconds: durationSeconds(state.pomodoroDuration),
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
      const now = clockNowMs();
      const currentState = timerStateFor(state);
      if (currentState === "running") {
        get().tickTimer();
        return;
      }
      const total = timerTotalSeconds(state);
      const shouldRestart = currentState === "completed" || currentState === "break" || total > 0 && state.elapsedSeconds >= total;
      const elapsedSeconds = shouldRestart ? 0 : Math.max(0, Number(state.elapsedSeconds) || 0);
      const next = {
        view: "session",
        route: "session",
        ...timerStateFields("running", now),
        audioPlaying: true,
        summaryRecord: null,
        elapsedSeconds,
        startedAt: !state.startedAt || shouldRestart ? new Date(now).toISOString() : state.startedAt,
        timerAnchorAtMs: now - elapsedSeconds * 1000,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: total,
        ...(shouldRestart ? resetProgressState() : {})
      };
      set(next);
      persistTimerSnapshot({ ...state, ...next });
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
        timerDurationSeconds: durationSeconds(get().pomodoroDuration),
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
        timerDurationSeconds: timerMode === "countup" ? 0 : durationSeconds(get().pomodoroDuration)
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
