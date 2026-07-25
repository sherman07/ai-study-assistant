#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeLegacyControllerCombined } from "./legacy_controller_combined.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(
  repoRoot,
  "frontend/src/legacy/synapse-legacy-controller-combined.js"
);
writeLegacyControllerCombined(target);
console.log(`legacy controller combined written: ${path.relative(repoRoot, target)}`);
