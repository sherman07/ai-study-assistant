/** Session bootstrap, hydration, and history actions. */
import {
  clearFocusRoomActiveSession,
  focusTrailIdentity,
  readFocusRoomActiveSessionForMaterial,
  readFocusRoomSessions,
  saveFocusRoomActiveSession,
  saveFocusRoomSession
} from "../../focus-room-data/index.js";
import {
  clampDuration,
  clampDurationSeconds,
  clampVolume,
  currentScene
} from "../../../focus-room/utils.js";
import { normalizeFocusTopics } from "../../../focus-room/focusTopics.js";
import { DEFAULT_AUDIO_CHANNELS } from "../constants.js";
import {
  persistDraftFromState,
  readDraftForMaterial,
  resetProgressState
} from "../helpers/draftHelpers.js";
import {
  clockNowMs,
  configuredDurationSeconds,
  persistTimerSnapshot,
  timerSnapshot,
  timerStateFields,
  timerStateFor,
  timerTotalSeconds
} from "../helpers/timerHelpers.js";
import {
  hydratedMaterialState,
  restoreActiveSessionState
} from "../helpers/sessionHydration.js";

export function createSessionActions(set, get) {
  return {
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
  };
}
