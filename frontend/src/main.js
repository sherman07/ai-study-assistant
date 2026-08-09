import { App } from "./react/App.js?v=notes-taller-v2";
import { loadLegacyController } from "./legacy/loadLegacyController.js?v=history-degraded-v1";
import {
  activateLearningCompanionThread,
  companionHistoryId,
  companionThreadHasUserContent,
  deleteLearningCompanionThread,
  listLearningCompanionThreads,
  loadLearningCompanionThread,
  saveLearningCompanionThread,
  startNewLearningCompanionThread,
  titleFromCompanionThread,
} from "./legacy/learningCompanionChatStore.js?v=ai-learning-companion-v2";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Synapse root element was not found.");
}

if (!window.React || !window.ReactDOM) {
  root.innerHTML = [
    '<main class="notes-area">',
    '<section class="upload-stage">',
    '<p>Synapse could not load the React runtime. Please refresh the page.</p>',
    '</section>',
    '</main>'
  ].join("");
  throw new Error("React runtime was not loaded before Synapse booted.");
}

window.__synapseCompanionChat = {
  activate(id) {
    return activateLearningCompanionThread(id, window.localStorage);
  },
  delete(id) {
    return deleteLearningCompanionThread(id, window.localStorage);
  },
  load() {
    return loadLearningCompanionThread(window.localStorage);
  },
  list() {
    return listLearningCompanionThreads(window.localStorage);
  },
  save(thread) {
    return saveLearningCompanionThread(thread, window.localStorage);
  },
  startNew() {
    return startNewLearningCompanionThread(window.localStorage);
  },
  hasUserContent(thread) {
    return companionThreadHasUserContent(thread);
  },
  titleFrom(thread) {
    return titleFromCompanionThread(thread);
  },
  historyId(threadId) {
    return companionHistoryId(threadId);
  },
};

const reactRoot = window.ReactDOM.createRoot(root);
const renderApp = () => reactRoot.render(window.React.createElement(App));

function bootSynapseRuntime() {
  loadLegacyController();
}

function scheduleSynapseRuntimeBoot() {
  requestAnimationFrame(() => {
    try {
      bootSynapseRuntime();
    } catch (error) {
      console.error("Synapse boot failed:", error);
    }
  });
}

if (typeof window.ReactDOM.flushSync === "function") {
  window.ReactDOM.flushSync(renderApp);
  try {
    bootSynapseRuntime();
  } catch (error) {
    console.error("Synapse boot failed:", error);
    scheduleSynapseRuntimeBoot();
  }
} else {
  renderApp();
  scheduleSynapseRuntimeBoot();
}
