import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.join(repoRoot, "frontend");
const distFrontendRoot = path.join(repoRoot, "dist", "frontend");

const files = [
  "auth-client.js",
  "admin-common.js",
  "admin-access.js",
  "admin-settings.js",
  "admin-pages.css",
  "billing-pages.css",
  "billing-result.js",
  "config.js",
  "focus-room.html",
  "landing-auth.css",
  "landing-auth.js",
  "pricing.js",
  "reset-password.js",
  "robots.txt",
  "site.webmanifest",
  "style.css",
  "theme-bootstrap.js",
  "synapse-selects.css",
  "synapse-selects.js",
  "verify-auth.js"
];

const directories = [
  "assets",
  "logos",
  "src/focus-room",
  "src/legacy",
  "styles",
  "vendor"
];

const legacyControllerSections = [
  "00_creditsgate.js",
  "01_uploadedfiles.js",
  "01_aiproviderandlearningfigures.js",
  "01_fileuploadandsources.js",
  "01_generationjobanalysis.js",
  "01_generationjobcontrols.js",
  "02_openvisualmodal.js",
  "02_studytoolsandsettings.js",
  "02_timelinestore.js",
  "03_rendertimeline.js",
  "03_timelineactions.js",
  "03_visualguidestore.js",
  "04_rendervisualguidelaunch.js",
  "04_visualguiderenderandquiz.js",
  "04_masterygraph.js",
  "04_memorycards.js",
  "04_masterygraphrender.js",
  "05_persistcurrentquiztohistory.js",
  "05_quizgenerationandrender.js",
  "05_flashcardstore.js",
  "06_deleteflashcarddeck.js",
  "06_flashcardstudy.js",
  "06_mindmapdata.js",
  "06_mindmaprender.js",
  "07_focusmindmappoint.js",
  "07_voicetutor.js",
  "08_extractrealtimeresponsetranscript.js",
  "08_workspaceandaccount.js",
  "08_accountbilling.js",
  "08_historyandsourceassets.js",
  "09_togglesourceviewer.js",
  "09_sourcepreview.js",
  "09_sourceviewerbody.js",
  "09_historysync.js",
  "09_historyload.js",
  "10_focusroombridge.js",
  "11_generationjobs.js",
  "12_broadcastjobs.js",
  "12_broadcastpipeline.js",
  "12_broadcastrealtime.js",
  "12_broadcastplayback.js",
  "13_studytoolmemory.js",
  "14_learningcompanion.js",
  "99_boot.js",
];

function copyFile(relativePath) {
  const source = path.join(frontendRoot, relativePath);
  const target = path.join(distFrontendRoot, relativePath);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing frontend runtime file: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(relativePath) {
  const source = path.join(frontendRoot, relativePath);
  const target = path.join(distFrontendRoot, relativePath);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing frontend runtime directory: ${relativePath}`);
  }
  fs.cpSync(source, target, { recursive: true });
}

fs.mkdirSync(distFrontendRoot, { recursive: true });

for (const file of files) copyFile(file);
for (const directory of directories) copyDirectory(directory);

const legacyControllerBody = [
  "window.__synapseCombinedEvalStarted = true;",
  ...legacyControllerSections.map(fileName => {
    const source = fs.readFileSync(path.join(frontendRoot, "src/legacy/controller_sections", fileName), "utf8");
    return `\n/* ${fileName} */\n${source}`;
  })
].join("\n");
const legacyControllerSource = [
  "window.__synapseRunCombinedController = function synapseRunCombinedController() {",
  legacyControllerBody,
  "  window.__synapseCombinedControllerReady = true;",
  "  window.dispatchEvent(new Event('synapse-combined-controller-ready'));",
  "};",
  "if (window.__synapseRuntimeUtilitiesReady) {",
  "  window.__synapseRunCombinedController();",
  "} else {",
  "  window.addEventListener('synapse-runtime-utilities-ready', window.__synapseRunCombinedController, { once: true });",
  "}"
].join("\n");
const combinedControllerTarget = path.join(distFrontendRoot, "src/legacy", "synapse-legacy-controller-combined.js");
fs.mkdirSync(path.dirname(combinedControllerTarget), { recursive: true });
fs.writeFileSync(combinedControllerTarget, legacyControllerSource);

console.log("frontend runtime assets copied");
