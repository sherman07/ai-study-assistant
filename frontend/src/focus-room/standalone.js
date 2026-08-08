import { API_BASE } from "../legacy/apiConfig.js";
import { SynapseApiClient } from "../legacy/apiClient.js";
import { initFocusRoom } from "./controller.js";
import { installStandaloneFocusRoomBridge } from "./standalone-bridge.js";
import { normalizeFocusRoomWorkspaceTarget } from "./model/workspaceReturnTarget.js";

const root = document.getElementById("focusRoomRoot");

if (!root) {
  throw new Error("Focus Room root element was not found.");
}

document.getElementById("focusRoomFallbackTitle")?.remove();
globalThis.apiClient = new SynapseApiClient(API_BASE);
globalThis.__synapseNormalizeFocusRoomWorkspaceTarget = normalizeFocusRoomWorkspaceTarget;
installStandaloneFocusRoomBridge();

if (!globalThis.location.hash || globalThis.location.hash === "#") {
  globalThis.location.hash = "#/focus-room";
}

initFocusRoom({ root });
