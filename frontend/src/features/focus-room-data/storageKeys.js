/** Focus Room storage keys and timer state constants. */
export const FOCUS_ROOM_SESSION_KEY = "synapse.focusRoom.sessions.v1";
export const FOCUS_ROOM_DRAFT_KEY = "synapse.focusRoom.draft.v1";
export const FOCUS_ROOM_ACTIVE_SESSION_KEY = "synapse.focusRoom.active-session.v1";
export const FOCUS_ROOM_SESSION_LIMIT = 40;

export const FOCUS_ROOM_TIMER_STATES = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]);

export const FOCUS_ROOM_TIMER_STATE_ALIASES = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});

export const focusRoomSessionMemory = {
  sessions: []
};
