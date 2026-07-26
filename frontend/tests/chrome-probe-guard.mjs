/**
 * Shared gate for Chrome browser probes included in `npm run test:frontend`.
 * Soft-skips when dist/, Chrome, or puppeteer-core are unavailable so Layer A
 * stays runnable on clean checkouts; re-run after `npm run build` to exercise them.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const distRoot = path.join(root, "dist");
const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean);

function resolveChromeExecutable() {
  for (const candidate of chromeCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return "";
}

function loadPuppeteerCore() {
  try {
    return require("puppeteer-core");
  } catch {
    return null;
  }
}

/**
 * @param {string} probeName
 * @returns {{ ok: true, puppeteer: any, executablePath: string, distRoot: string, root: string } | { ok: false, reason: string }}
 */
export function prepareChromeProbe(probeName) {
  const puppeteer = loadPuppeteerCore();
  if (!puppeteer) {
    return { ok: false, reason: `${probeName}: skipped (puppeteer-core not installed)` };
  }
  if (!fs.existsSync(path.join(distRoot, "frontend"))) {
    return {
      ok: false,
      reason: `${probeName}: skipped (dist/ missing — run npm run build, then re-run this probe)`,
    };
  }
  const executablePath = resolveChromeExecutable();
  if (!executablePath) {
    return { ok: false, reason: `${probeName}: skipped (Chrome/Chromium executable not found)` };
  }
  return { ok: true, puppeteer, executablePath, distRoot, root };
}
