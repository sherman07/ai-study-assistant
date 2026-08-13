import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllerSource = readLegacyControllerSections("01_uploadedfiles.js");
const start = controllerSource.indexOf("function sourceFigureText");
const end = controllerSource.indexOf("function cleanSourceFigureDisplayText");

assert.notEqual(start, -1, "sourceFigureText should exist");
assert.notEqual(end, -1, "cleanSourceFigureDisplayText should exist");

const visualHelpersSource = controllerSource.slice(start, end);
const makeHelpers = new Function(`
  const API_BASE = "http://192.168.1.141:8001";
  let visualGalleryData = [];
  ${visualHelpersSource}
  return {
    setVisualGalleryData(items) {
      visualGalleryData = items;
    },
    getLearningFigureByMarker,
    normalizeLearningFigures,
    sanitizeLearningFigures
  };
`);

const helpers = makeHelpers();
helpers.setVisualGalleryData([{
  index: 1,
  url: "data:image/png;base64,AA==",
  title: "Result table",
  what_shows: "A table with data, results, comparison groups, and statistical evidence.",
  visual_kind: "data/table"
}]);

assert.equal(helpers.getLearningFigureByMarker(0), null);
assert.equal(helpers.getLearningFigureByMarker(1)?.title, "Result table");

helpers.setVisualGalleryData([{
  index: 0,
  title: "Extracted lecture diagram",
  caption: "Backend selected this source figure, but the cached image URL is missing.",
  visual_kind: "diagram/model"
}]);

assert.equal(helpers.getLearningFigureByMarker(0)?.title, "Extracted lecture diagram");
assert.equal(helpers.sanitizeLearningFigures([helpers.getLearningFigureByMarker(0)]).length, 0);

helpers.setVisualGalleryData([{
  index: 2,
  url: "http://127.0.0.1:8001/assets/visuals/backend-selected.png",
  title: "Backend selected visual",
  what_shows: "Backend selected this concise source evidence card.",
  visual_kind: "source figure"
}]);

assert.equal(helpers.getLearningFigureByMarker(2)?.title, "Backend selected visual");
assert.equal(
  helpers.getLearningFigureByMarker(2)?.url,
  "http://192.168.1.141:8001/assets/visuals/backend-selected.png",
  "localhost backend visual assets should be rewritten to the active API_BASE host"
);

assert.equal(
  helpers.normalizeLearningFigures([{
    index: 3,
    url: "https://cdn.example.com/assets/visuals/external.png",
    title: "External figure"
  }])[0].url,
  "https://cdn.example.com/assets/visuals/external.png",
  "external image URLs should not be rewritten"
);

assert.equal(
  helpers.normalizeLearningFigures([{
    id: 7,
    url: "http://127.0.0.1:8001/assets/visuals/id-only.png",
    title: "ID-only source figure"
  }])[0].index,
  7,
  "explicit visual id should map to the marker index when index is absent"
);

helpers.setVisualGalleryData([{
  id: 7,
  url: "http://127.0.0.1:8001/assets/visuals/id-only.png",
  title: "ID-only source figure"
}]);

assert.equal(
  helpers.getLearningFigureByMarker(7)?.title,
  "ID-only source figure",
  "id-only visual metadata should render for matching [[VISUAL:id]] markers"
);

console.log("visual marker index regression passed");
