/** Pure timer field helpers for the Focus Room store. */
import {
  focusRoomLegacyTimerStatus,
  normalizeFocusRoomTimerState,
  saveFocusRoomActiveSession
} from "../../focus-room-data/index.js";
import {
  clampDuration,
  clampDurationSeconds,
  durationSeconds
} from "../../../focus-room/utils.js";

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

export {
  clockNowMs,
  timerStateFor,
  configuredDurationSeconds,
  timerTotalSeconds,
  elapsedSecondsAt,
  timerStateFields,
  timerSnapshot,
  persistTimerSnapshot,
  reconciledTimer
};
