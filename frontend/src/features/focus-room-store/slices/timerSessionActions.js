/** Focus session lifecycle and timer actions. */
import {
  clearFocusRoomActiveSession,
  focusTrailIdentity,
  formatFocusRoomDuration,
  readFocusRoomSessions,
  saveFocusRoomActiveSession,
  saveFocusRoomSession
} from "../../focus-room-data/index.js";
import {
  buildPlanForState,
  clampDuration,
  clampDurationSeconds,
  currentScene,
  durationSeconds
} from "../../../focus-room/utils.js";
import {
  activeFocusTopic,
  normalizeFocusTopics,
  promoteNextFocusTopic
} from "../../../focus-room/focusTopics.js";
import { DEFAULT_AUDIO_CHANNELS } from "../constants.js";
import {
  countFocusFlashcardsCompleted,
  focusQuizMistakesFromState,
  focusQuizScoreFromState,
  persistDraftFromState,
  resetProgressState
} from "../helpers/draftHelpers.js";
import {
  clockNowMs,
  configuredDurationSeconds,
  elapsedSecondsAt,
  persistTimerSnapshot,
  reconciledTimer,
  timerSnapshot,
  timerStateFields,
  timerStateFor,
  timerTotalSeconds
} from "../helpers/timerHelpers.js";

export function createTimerSessionActions(set, get) {
  return {
    startSession() {
      const state = get();
      const timerMode = state.timerMode === "countup" ? "countup" : "countdown";
      const enteredAt = new Date(clockNowMs()).toISOString();
      const trailIdentity = focusTrailIdentity(enteredAt);
      const currentSession = {
        sessionId: `focus-${Date.now()}`,
        materialId: "focus-room",
        studyGoal: state.studyGoal,
        selectedScene: state.selectedScene,
        musicType: state.musicType,
        ambientSound: state.ambientSound,
        musicVolume: state.musicVolume,
        ambientVolume: state.ambientVolume,
        pomodoroDuration: state.pomodoroDuration,
        status: "active",
        focusTrailDate: trailIdentity.focusTrailDate,
        focusTimezone: trailIdentity.focusTimezone,
        startedAt: enteredAt,
        endedAt: null,
        totalFocusTime: 0
      };
      const entryRecord = saveFocusRoomSession(currentSession);
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
        startedAt: enteredAt,
        summaryRecord: null,
        aiPanelOpen: false,
        activeDrawer: "",
        currentSession,
        sessionHistory: [entryRecord, ...readFocusRoomSessions().filter(item => item.sessionId !== entryRecord.sessionId)],
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
        audioPlaying: state.audioPlaying,
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
        status: "completed",
        focusTrailDate: state.currentSession?.focusTrailDate,
        focusTimezone: state.currentSession?.focusTimezone,
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
  };
}
