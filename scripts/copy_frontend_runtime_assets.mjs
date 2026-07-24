import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeLegacyControllerCombined } from "./legacy_controller_combined.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.join(repoRoot, "frontend");
const distFrontendRoot = path.join(repoRoot, "dist", "frontend");

const files = [
  "auth-client.js",
  "billing-pages.css",
  "billing-result.js",
  "config.js",
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
  "src/legacy",
  "styles"
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

const combinedControllerTarget = path.join(distFrontendRoot, "src/legacy", "synapse-legacy-controller-combined.js");
writeLegacyControllerCombined(combinedControllerTarget, frontendRoot);
// Keep Vite/dev HTML from 404ing the same artifact referenced by index.html.
writeLegacyControllerCombined(
  path.join(frontendRoot, "src/legacy", "synapse-legacy-controller-combined.js"),
  frontendRoot
);

console.log("frontend runtime assets copied");
