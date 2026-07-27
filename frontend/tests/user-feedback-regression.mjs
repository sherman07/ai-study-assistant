import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const historyNav = read("frontend/src/react/components/HistoryNavigation.js");
const uploadStage = read("frontend/src/react/components/UploadStage.js");
const uploadController = read("frontend/src/legacy/controller_sections/01_uploadedfiles.js");
const modeController = read("frontend/src/legacy/controller_sections/14_learningcompanion.js");
const historyController = read("frontend/src/legacy/controller_sections/09_togglesourceviewer.js");
const auth = read("frontend/landing-auth.js");
const layoutCss = read("frontend/styles/01-section.css");
const historyCss = read("frontend/styles/04-section.css");

assert.match(historyNav, /data-feature-flag.*new-chat/, "New chat must remain explicitly tagged in the same navigation");
assert.match(historyNav, /data-learning-experience-target.*materials/, "Materials mode needs a target the mode controller can update");
assert.match(historyNav, /learningModeStatusText/, "the rail must show the active learning mode");
assert.match(modeController, /syncLearningExperienceModeStatus\(mode\)/, "mode changes must update visible status");
assert.match(layoutCss, /\.learning-rail-new-chat:hover[\s\S]*transform: translateY\(-1px\)/, "New chat needs visible hover feedback");

assert.match(uploadStage, /id: "uploadStatus"/, "upload UI needs a live status surface");
assert.match(uploadStage, /upload-guidance/, "upload UI must explain the upload steps");
assert.match(uploadController, /setUploadStatus\("success"/, "successful file selection must be announced");
assert.match(uploadController, /flashUploadState\("error"/, "failed file selection must be animated and announced");

assert.match(historyController, /toggleGeneratedHistorySections/, "generated history classes need an expandable title list");
assert.match(historyController, /fetchGeneratedContentSectionsFromDataApi\(contentId, page, 50\)/, "section titles should be loaded lazily through paginated requests");
assert.match(historyController, /openGeneratedHistorySection/, "generated section titles must open the selected section");
assert.match(layoutCss, /generated-notes-state \.history-nav[\s\S]*display: none !important/, "generated notes must keep the history rail out of the primary document view");
assert.match(historyCss, /generated-history-section-link/, "generated title links need visible navigation styling");

assert.match(auth, /error\?\.state === 'email_not_configured'/, "localhost must handle missing SMTP configuration explicitly");
assert.match(auth, /Continue with local demo/, "localhost signup needs a recoverable demo action");
assert.match(auth, /Sending confirmation…/, "signup loading state must explain the slow operation");

console.log("user feedback regression passed");
