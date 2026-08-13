import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authClientSource, landingAuthSource, focusRoomStoreSource, focusRoomDataSource, companionWorkspaceSource } from "./_sourceTrees.mjs";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const historyNav = read("frontend/src/react/components/HistoryNavigation.js");
const uploadStage = read("frontend/src/react/components/UploadStage.js");
const uploadController = readLegacyControllerSections("01_uploadedfiles.js");
const modeController = readLegacyControllerSections("14_learningcompanion.js");
const historyController = readLegacyControllerSections("09_togglesourceviewer.js");
const auth = landingAuthSource();
const layoutCss = read("frontend/styles/01-section.css");
const historyCss = read("frontend/styles/04-section.css");

assert.match(historyNav, /data-feature-flag.*new-chat/, "New chat must remain explicitly tagged in the same navigation");
assert.match(historyNav, /data-learning-experience-target.*materials/, "Materials mode needs a target the mode controller can update");
assert.match(historyNav, /learningModeStatusText/, "the rail must show the active learning mode");
assert.match(modeController, /syncLearningExperienceModeStatus\(mode\)/, "mode changes must update visible status");
assert.match(layoutCss, /\.learning-rail-new-chat:hover[\s\S]*transform: translateY\(-1px\)/, "New chat needs visible hover feedback");

assert.match(uploadStage, /id: "uploadStatus"/, "upload UI needs a live status surface");
assert.match(uploadStage, /h\("h2", null, "Drop files here"\)/, "upload UI must state the primary action directly");
assert.doesNotMatch(uploadStage, /upload-guidance/, "upload UI should not repeat decorative step labels");
assert.match(uploadController, /setUploadStatus\("success"/, "successful file selection must be announced");
assert.match(uploadController, /flashUploadState\("error"/, "failed file selection must be animated and announced");

assert.match(historyController, /toggleGeneratedHistorySections/, "generated history classes need an expandable title list");
assert.match(historyController, /fetchGeneratedContentSectionsFromDataApi\(contentId, page, 50\)/, "section titles should be loaded lazily through paginated requests");
assert.match(historyController, /openGeneratedHistorySection/, "generated section titles must open the selected section");
assert.match(layoutCss, /generated-notes-state \.history-nav[\s\S]*display: flex !important/, "generated notes must preserve the existing navigation rail");
assert.match(historyCss, /generated-history-section-link/, "generated title links need visible navigation styling");

assert.match(auth, /error\?\.state === 'email_not_configured'/, "localhost must handle missing SMTP configuration explicitly");
assert.match(auth, /Continue with local demo/, "localhost signup needs a recoverable demo action");
assert.match(auth, /Sending confirmation…/, "signup loading state must explain the slow operation");

console.log("user feedback regression passed");
