/** Hydrate Focus Room material/session snapshots into store fields. */
import {
  readFocusRoomActiveSessionForMaterial
} from "../../focus-room-data/index.js";
import {
  DEFAULT_DURATION_MINUTES,
  PANEL_TABS,
  buildPlanForState,
  clampDuration,
  clampDurationSeconds,
  clampVolume,
  currentScene,
  normalizeChatMessages,
  normalizeStudyPlanItems,
  sceneById
} from "../../../focus-room/utils.js";
import { DEFAULT_AUDIO_CHANNELS } from "../constants.js";
import {
  draftCompletedTasks,
  normalizeAssistantContext,
  normalizeSourceHighlight,
  readDraftForMaterial
} from "./draftHelpers.js";
import {
  clockNowMs,
  elapsedSecondsAt,
  timerStateFields,
  timerStateFor,
  timerTotalSeconds
} from "./timerHelpers.js";

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

export {
  hydratedMaterialState,
  restoreActiveSessionState
};
