import { App } from "./react/App.js?v=notes-taller-v2";
import { loadLegacyController } from "./legacy/loadLegacyController.js?v=settings-modal-pattern-20260720-06";
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
import {
  enforceProviderPreference,
  providerSettingsDescription,
  providerSettingsOptions,
  sessionIsPro
} from "./legacy/presenters/providerAccessPresenter.js";

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

window.__synapseProviderAccess = {
  enforceProviderPreference,
  providerSettingsDescription,
  providerSettingsOptions,
  sessionIsPro
};

function reclampStoredAiProviderForSession() {
  try {
    const stored = window.localStorage?.getItem("synapse.ai.provider.v1") || "";
    const enforced = enforceProviderPreference(stored);
    const next = enforced?.value ?? enforced?.provider ?? "deepseek";
    if (typeof window.setAiProvider === "function") {
      window.setAiProvider(next);
      return;
    }
    window.localStorage?.setItem("synapse.ai.provider.v1", next);
    const providerInput = document.getElementById("aiProvider");
    if (providerInput) providerInput.value = next;
  } catch {
    // Ignore storage / DOM issues during early boot.
  }
}

window.addEventListener("synapse-auth-changed", () => {
  reclampStoredAiProviderForSession();
});

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
