import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const constantsSource = read("frontend/src/react/constants.js");
const uploadStageSource = read("frontend/src/react/components/UploadStage.js");
const uploadControllerSource = read("frontend/src/legacy/controller_sections/01_uploadedfiles.js");
const accountSettingsSource = read("frontend/src/legacy/controller_sections/08_extractrealtimeresponsetranscript.js");

assert.ok(
  constantsSource.includes("AI_PROVIDER_OPTIONS"),
  "React constants should expose AI provider options"
);
assert.ok(
  constantsSource.includes("GPT") && constantsSource.includes("Gemini"),
  "AI provider options should let users choose GPT or Gemini"
);
assert.ok(
  uploadStageSource.includes('id: "aiProvider"')
    && uploadStageSource.includes('type: "hidden"'),
  "Upload stage should expose a hidden AI provider control for analyze payloads"
);
assert.ok(
  !uploadStageSource.includes("aiProviderButtons()"),
  "Upload stage must not restore the removed Generate AI button row"
);
assert.ok(
  accountSettingsSource.includes('accountPreferenceSelect("provider"')
    || accountSettingsSource.includes("Generate AI"),
  "AI provider choice should live in Account Settings study defaults"
);
assert.ok(
  uploadControllerSource.includes('formData.append("ai_provider"'),
  "Analyze form should send selected ai_provider to the backend"
);
assert.ok(
  uploadControllerSource.includes("synapse.ai.provider.v1"),
  "Selected AI provider should persist across page reloads"
);
assert.ok(
  !uploadControllerSource.includes('aiProvider ? aiProvider.value : "openai"'),
  "Initial provider selection should not silently override Backend default with OpenAI"
);
assert.ok(
  uploadControllerSource.includes("const initialAiProvider"),
  "Controller should make the initial provider choice explicit"
);

console.log("ai provider switch regression passed");
