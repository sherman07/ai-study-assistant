import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { authClientSource, landingAuthSource, focusRoomStoreSource, focusRoomDataSource, companionWorkspaceSource, read as readRepo } from "./_sourceTrees.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const configSource = fs.readFileSync(path.join(repoRoot, "frontend/config.js"), "utf8");
const authSource = authClientSource();
const landingAuthSourceText = landingAuthSource();
const verifyAuthSource = fs.readFileSync(path.join(repoRoot, "frontend/verify-auth.js"), "utf8");

function runConfig(href) {
  const location = new URL(href);
  let redirectedTo = "";
  const windowStub = {
    location: {
      href: location.toString(),
      protocol: location.protocol,
      hostname: location.hostname,
      host: location.host,
      replace(nextUrl) {
        redirectedTo = nextUrl;
      }
    }
  };
  vm.runInNewContext(configSource, { URL, window: windowStub });
  return { publicOrigin: windowStub.SYNAPSE_PUBLIC_APP_ORIGIN, redirectedTo };
}

const oldDeployment = runConfig(
  "https://synapse-ai-study-assistant-tutor-pkxgbnj79.vercel.app/frontend/reset-password.html?mode=recovery#token_hash=one-time&type=recovery"
);
assert.equal(oldDeployment.publicOrigin, "https://synapse-ai-study-assistant-tutor.vercel.app");
assert.equal(
  oldDeployment.redirectedTo,
  "https://synapse-ai-study-assistant-tutor.vercel.app/frontend/reset-password.html?mode=recovery#token_hash=one-time&type=recovery",
  "Old Vercel deployment hosts must redirect to the canonical public Synapse origin without losing auth callback data"
);

const canonicalDeployment = runConfig("https://synapse-ai-study-assistant-tutor.vercel.app/frontend/index.html");
assert.equal(canonicalDeployment.publicOrigin, "https://synapse-ai-study-assistant-tutor.vercel.app");
assert.equal(canonicalDeployment.redirectedTo, "", "The canonical public deployment must not redirect itself");

const localDevelopment = runConfig("http://127.0.0.1:5175/frontend/index.html");
assert.equal(localDevelopment.publicOrigin, "http://127.0.0.1:5175");
assert.equal(localDevelopment.redirectedTo, "", "Local development must remain on its local origin");

assert.ok(authSource.includes("function publicAppOrigin()"), "Auth routes should use the canonical public origin when it is configured");
assert.ok(authSource.includes("function absolutePublicUrl(path)"), "Auth callbacks should be built from a canonical public URL helper");
assert.ok(authSource.includes("absoluteAppUrl,"), "Landing and verification pages should be able to use the canonical workspace URL");
assert.ok(landingAuthSourceText.includes("window.SynapseAuth?.absoluteAppUrl?.()"), "Login and Google auth should return to the canonical workspace URL");
assert.ok(verifyAuthSource.includes("window.SynapseAuth?.absoluteAppUrl?.()"), "Email verification should return to the canonical workspace URL");

console.log("canonical public origin regression passed");
