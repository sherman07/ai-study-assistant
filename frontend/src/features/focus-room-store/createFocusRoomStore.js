/** Focus Room Zustand store — composed from feature slices. */
import { create } from "zustand/react";
import {
  DEFAULT_DURATION_MINUTES,
  clampDuration,
  clampDurationSeconds,
  clampVolume,
  currentScene,
  durationSeconds,
  sceneById
} from "../../focus-room/utils.js";
import { normalizeFocusTopics } from "../../focus-room/focusTopics.js";
import { DEFAULT_AUDIO_CHANNELS } from "./constants.js";
import { initialScene, readDraftForMaterial } from "./helpers/draftHelpers.js";
import { createSessionActions } from "./slices/sessionActions.js";
import { createSetupActions } from "./slices/setupActions.js";
import { createTimerSessionActions } from "./slices/timerSessionActions.js";
import { createStudyToolsActions } from "./slices/studyToolsActions.js";

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

    ...createSessionActions(set, get),
    ...createSetupActions(set, get),
    ...createTimerSessionActions(set, get),
    ...createStudyToolsActions(set, get)
  };
});
