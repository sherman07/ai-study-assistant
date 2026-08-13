import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const switchToolSource = readLegacyControllerSections("02_openvisualmodal.js");
const mindMapSource = readLegacyControllerSections("06_deleteflashcarddeck.js");
const legacyControllerRoot = path.join(repoRoot, "frontend/src/legacy/controller_sections");

globalThis.React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { StudyTools } = await import(pathToFileURL(path.join(repoRoot, "frontend/src/react/components/StudyTools.js")));
const studyToolsHtml = renderToStaticMarkup(React.createElement(StudyTools));

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
  (studyToolsHtml.match(/class="tool-switch-btn active"/g) || []).length,
  1,
  "StudyTools should declare exactly one initially active tool"
);
assert.equal(
  (studyToolsHtml.match(/class="tool-panel active"/g) || []).length,
  1,
  "StudyTools should provide one initial active tool panel"
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
