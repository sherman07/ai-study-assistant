/** Scene, duration, topics, audio, and panel actions. */
import { focusRoomAudioPreset } from "../../focus-room-data/index.js";
import {
  PANEL_TABS,
  buildPlanForState,
  clampDuration,
  clampDurationSeconds,
  clampInteger,
  clampVolume,
  currentScene,
  durationSeconds,
  sceneById
} from "../../../focus-room/utils.js";
import {
  activeFocusTopic,
  createFocusTopicId,
  normalizeFocusTopic,
  normalizeFocusTopics,
  promoteNextFocusTopic
} from "../../../focus-room/focusTopics.js";
import { DEFAULT_AUDIO_CHANNELS } from "../constants.js";
import {
  normalizeAssistantContext,
  normalizeSourceHighlight,
  persistDraftFromState
} from "../helpers/draftHelpers.js";
import {
  clockNowMs,
  persistTimerSnapshot,
  timerSnapshot,
  timerStateFields
} from "../helpers/timerHelpers.js";

export function createSetupActions(set, get) {
  return {
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
  };
}
