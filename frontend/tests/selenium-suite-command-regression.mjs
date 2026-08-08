import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const seleniumSuite = packageJson.scripts["test:frontend:selenium"] || "";

assert.match(seleniumSuite, /npm run build/, "the Selenium suite must test the current production build");
assert.match(
  seleniumSuite,
  /python -m unittest discover -s frontend\/selenium_tests -v/,
  "the Selenium suite must run the dedicated browser journeys",
);

console.log("selenium suite command regression passed");
