import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyControllerSections } from "./helpers/readLegacyControllerSections.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const route = read("server/src/routes/generatedContent.js");
const repository = read("server/src/repositories/generatedContentRepository.js");
const client = read("frontend/src/legacy/dataApiClient.js");
const history = readLegacyControllerSections("09_togglesourceviewer.js");
const postmanPath = path.join(repoRoot, "docs/api/Synapse.postman_collection.json");

assert.ok(route.includes('router.get("/:id/sections"'), "generated-content should expose a paginated sections route");
assert.ok(repository.includes("getGeneratedContentSections"), "repository should expose paginated section loading");
assert.ok(client.includes("fetchGeneratedContentSectionsFromDataApi"), "frontend data client should fetch generated-content pages");
assert.ok(history.includes("fetchGeneratedContentSectionsFromDataApi"), "history loading should hydrate generated note sections page by page");
assert.ok(fs.existsSync(postmanPath), "API Postman collection should document the generated-content pagination request");

const collection = JSON.parse(fs.readFileSync(postmanPath, "utf8"));
const requestNames = JSON.stringify(collection);
assert.match(requestNames, /Analyze materials/);
assert.match(requestNames, /Get generated content sections/);
assert.match(requestNames, /page_size/);

console.log("generated content pagination regression passed");
