import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const switchToolSource = read("frontend/src/legacy/controller_sections/02_openvisualmodal.js");
const mindMapSource = read("frontend/src/legacy/controller_sections/06_deleteflashcarddeck.js");
const studyToolsSource = read("frontend/src/react/components/StudyTools.js");
const legacyControllerRoot = path.join(repoRoot, "frontend/src/legacy/controller_sections");

const toolMappings = {
  mindmap: ["toolBtnMindMap", "toolPanelMindMap"],
  visualguide: ["toolBtnVisualGuide", "toolPanelVisualGuide"],
  timeline: ["toolBtnTimeline", "toolPanelTimeline"],
  masterygraph: ["toolBtnMasteryGraph", "toolPanelMasteryGraph"],
  quiz: ["toolBtnQuiz", "toolPanelQuiz"],
  flashcards: ["toolBtnFlashcards", "toolPanelFlashcards"],
  broadcast: ["toolBtnBroadcast", "toolPanelBroadcast"]
};

const renderStart = mindMapSource.indexOf("function renderMindMap(mindMap) {");
const renderEnd = mindMapSource.indexOf("\nfunction ", renderStart + 10);
assert.ok(renderStart >= 0 && renderEnd > renderStart, "renderMindMap should remain a named legacy renderer");
const renderMindMapSource = mindMapSource.slice(renderStart, renderEnd);

assert.match(
  switchToolSource,
  /document\.querySelectorAll\("\.tool-panel"\)\.forEach\(panel => panel\.classList\.remove\("active"\)\)/,
  "switchTool should clear every active tool panel before selecting one"
);
assert.match(
  switchToolSource,
  /document\.querySelectorAll\("\.tool-switch-btn"\)\.forEach\(button =>/, 
  "switchTool should clear every active tool button before selecting one"
);
assert.match(
  switchToolSource,
  /const STUDY_TOOL_BUTTON_IDS = \{/,
  "switchTool should use one centralized mapping for every tool button"
);
for (const [toolName, [buttonId, panelId]] of Object.entries(toolMappings)) {
  assert.match(switchToolSource, new RegExp(`${toolName}: "${panelId}"`), `${toolName} should map to its panel`);
  assert.match(switchToolSource, new RegExp(`${toolName}: "${buttonId}"`), `${toolName} should map to its button`);
}
assert.doesNotMatch(
  renderMindMapSource,
  /toolPanelMindMap[\s\S]{0,160}classList\.add\(["']active["']\)/,
  "renderMindMap must not re-open the Mind Map panel after another tool is selected"
);
assert.doesNotMatch(
  renderMindMapSource,
  /toolBtnMindMap[\s\S]{0,100}classList\.add\(["']active["']\)/,
  "renderMindMap must not re-select the Mind Map button after another tool is selected"
);
assert.equal(
  (studyToolsSource.match(/active:\s*true/g) || []).length,
  1,
  "StudyTools should declare exactly one initially active tool"
);
assert.ok(
  studyToolsSource.includes('buttonId: "toolBtnMindMap"') && studyToolsSource.includes("active: true"),
  "StudyTools should mark Mind Map as the initial active tool button"
);
assert.ok(
  studyToolsSource.includes('panelId: "toolPanelMindMap"') &&
    /className:\s*`tool-panel\$\{tool\.active \? " active" : ""\}`/.test(studyToolsSource),
  "StudyTools should render tool panels with a dynamic active class"
);
assert.ok(
  /className:\s*`tool-switch-btn\$\{tool\.active \? " active" : ""\}`/.test(studyToolsSource),
  "StudyTools should render tool buttons with a dynamic active class"
);

const legacySources = fs.readdirSync(legacyControllerRoot)
  .filter(file => file.endsWith(".js") && file !== "02_openvisualmodal.js")
  .map(file => ({ file, source: fs.readFileSync(path.join(legacyControllerRoot, file), "utf8") }));
for (const { file, source } of legacySources) {
  assert.doesNotMatch(
    source,
    /toolPanel(?:MindMap|VisualGuide|Timeline|MasteryGraph|Quiz|Flashcards|Broadcast)[^\n]{0,180}classList\.add\(["']active["']\)/,
    `${file} must not activate a tool panel outside switchTool`
  );
  assert.doesNotMatch(
    source,
    /toolBtn(?:MindMap|VisualGuide|Timeline|MasteryGraph|Quiz|Flashcards|Broadcast)[^\n]{0,140}classList\.add\(["']active["']\)/,
    `${file} must not activate a tool button outside switchTool`
  );
}

console.log("study tool exclusivity regression passed");
