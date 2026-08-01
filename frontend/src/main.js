import { App } from "./react/App.js?v=ai-broadcast-v19";
import { loadLegacyController } from "./legacy/loadLegacyController.js?v=study-tools-20260730-01";

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
