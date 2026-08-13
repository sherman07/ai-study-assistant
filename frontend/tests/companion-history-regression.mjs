import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authClientSource, landingAuthSource, focusRoomStoreSource, focusRoomDataSource, companionWorkspaceSource } from "./_sourceTrees.mjs";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

const historyController = readLegacyControllerSections("09_togglesourceviewer.js");
const companionWorkspace = companionWorkspaceSource();
const analysisStage = read("frontend/src/react/components/AnalysisStage.js");
const uploadStage = read("frontend/src/react/components/UploadStage.js");
const store = read("frontend/src/legacy/learningCompanionChatStore.js");
const boot = readLegacyControllerSections("99_boot.js");
const main = read("frontend/src/app/main.js");

assert.match(analysisStage, /data-workspace-kind": "materials"/, "generated notes must show Materials kind");
assert.doesNotMatch(uploadStage, /data-workspace-kind": "materials"/, "materials home should rely on the active navigation state instead of a duplicate badge");
assert.match(companionWorkspace, /data-workspace-kind": "companion"/, "companion workspace must show Companion kind");
assert.match(companionWorkspace, /syncCompanionThreadToHistory/, "companion chats must sync into recent learning");
assert.match(companionWorkspace, /startNewLearningCompanionThread/, "new chat must archive instead of wiping history");
assert.match(historyController, /kind: "companion"/, "history save must support companion entries");
assert.match(historyController, /isCompanionHistoryItem/, "history load/delete must branch for companion");
assert.match(historyController, /history-item-kind--\$\{kindClass\}/, "recent learning rows must label materials vs companion");
assert.match(historyController, /kindLabel = companion \? "Companion" : "Materials"/, "recent learning rows must distinguish companion from materials");
assert.match(historyController, /synapse-companion-thread-activate/, "opening companion history must activate the thread");
assert.match(boot, /syncCompanionThreadToHistory/, "companion history sync must be exported on window");
assert.match(main, /__synapseCompanionChat/, "companion store bridge must be available to legacy history");
assert.match(store, /THREADS_INDEX_KEY|companion\.threads\.v2/, "companion store must keep a multi-thread index");

console.log("companion history regression passed");
