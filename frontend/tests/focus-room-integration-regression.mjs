import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");
const exists = file => fs.existsSync(path.join(repoRoot, file));

function assertReactResolverConfig(source, label) {
  assert.ok(
    source.includes('dedupe: ["react", "react-dom"]'),
    `${label} should dedupe React so optimized dependencies share one hook dispatcher`
  );
  assert.ok(
    source.includes('"react": resolve(__dirname, "node_modules/react")'),
    `${label} should alias react to the project install`
  );
  assert.ok(
    source.includes('"react-dom": resolve(__dirname, "node_modules/react-dom")'),
    `${label} should alias react-dom to the project install`
  );
  assert.ok(
    source.includes('"react/jsx-runtime": resolve(__dirname, "node_modules/react/jsx-runtime.js")'),
    `${label} should alias the React JSX runtime to the project install`
  );
}

function assertFocusRoomOptimizerConfig(source) {
  assert.ok(source.includes("optimizeDeps"), "Vite dev config should eagerly optimize Focus Room dependencies");
  for (const dep of [
    "react",
    "react-dom",
    "react-dom/client",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "zustand/react/shallow",
    "motion/react",
    "@radix-ui/react-dialog",
    "@radix-ui/react-tabs",
    "@radix-ui/react-slider"
  ]) {
    assert.ok(
      source.includes(`"${dep}"`),
      `Vite dev config should pre-optimize ${dep} with the initial React dependency graph`
    );
  }
}

const packageJson = JSON.parse(read("package.json"));
const runtimeConfig = read("frontend/config.js");
const viteConfig = read("vite.config.js");
const staticFocusRoomConfig = read("vite.focus-room-static.config.js");
const main = read("frontend/src/main.js");
const app = read("frontend/src/react/App.js");
const runtime = read("frontend/src/react/runtime.js");
const appShell = read("frontend/src/react/components/AppShell.js");
const analysisStage = read("frontend/src/react/components/AnalysisStage.js");
const historyNavigation = read("frontend/src/react/components/HistoryNavigation.js");
const controller = read("frontend/src/legacy/controller.js");
const boot = read("frontend/src/legacy/controller_sections/99_boot.js");
const uploadSection = read("frontend/src/legacy/controller_sections/01_uploadedfiles.js");
const historySection = read("frontend/src/legacy/controller_sections/09_togglesourceviewer.js");
const focusBridge = read("frontend/src/legacy/controller_sections/10_focusroombridge.js");
const indexHtml = read("frontend/index.html");
const focusRoomHtml = read("frontend/focus-room.html");
const focusRoomStaticLoader = read("frontend/src/focus-room/static-compatible-loader.js");
const focusRoomStandalone = read("frontend/src/focus-room/standalone.js");
const focusRoomStandaloneBridge = read("frontend/src/focus-room/standalone-bridge.js");
const focusRoomData = read("frontend/src/focus-room/data.js");
const focusUtils = read("frontend/src/focus-room/utils.js");
const focusRoomController = read("frontend/src/focus-room/controller.js");
const focusRoomQueryClient = read("frontend/src/focus-room/queryClient.js");
const focusRoomStore = read("frontend/src/focus-room/hooks/useFocusRoomStore.js");
const focusRoomPage = read("frontend/src/focus-room/components/FocusRoomPage.jsx");
const topFocusNav = read("frontend/src/focus-room/components/TopFocusNav.jsx");
const bottomControlDock = read("frontend/src/focus-room/components/BottomControlDock.jsx");
const focusTimerCard = read("frontend/src/focus-room/components/TimerCard.jsx");
const focusToolPanel = read("frontend/src/focus-room/components/FocusRoomToolPanel.jsx");
const focusMaterialContent = read("frontend/src/focus-room/components/FocusMaterialContent.jsx");
const sessionSummaryModal = read("frontend/src/focus-room/components/SessionSummaryModal.jsx");
const soundControlPanel = read("frontend/src/focus-room/components/SoundControlPanel.jsx");
const style = read("frontend/style.css");
const focusStyle = read("frontend/styles/09-focus-room.css");

for (const dep of [
  "react",
  "react-dom",
  "vite",
  "@vitejs/plugin-react",
  "react-router-dom",
  "motion",
  "gsap",
  "zustand",
  "@tanstack/react-query",
  "howler",
  "lucide-react",
  "radix-ui"
]) {
  assert.ok(packageJson.dependencies[dep], `package.json should install ${dep}`);
}
assert.ok(packageJson.scripts.build.includes("vite build"), "package.json should expose a Vite build");
assert.ok(packageJson.scripts.build.includes("copy_frontend_runtime_assets.mjs"), "production build should copy static frontend runtime assets into dist/frontend");
assert.ok(packageJson.scripts["test:focus-room"].includes("focus-room-integration-regression.mjs"), "package.json should expose focused Focus Room tests");
assert.ok(runtimeConfig.includes("SYNAPSE_FOCUS_ROOM_ENABLED"), "runtime config should expose the Focus Room feature flag");
assert.ok(viteConfig.includes("frontend/index.html"), "Vite config should include the workspace HTML entry");
assert.ok(viteConfig.includes("frontend/focus-room.html"), "Vite config should include the Focus Room HTML entry");
for (const deploymentEntry of [
  "index.html",
  "app.html",
  "frontend/login.html",
  "frontend/signup.html",
  "frontend/forgot-password.html",
  "frontend/reset-password.html",
  "frontend/verify.html",
  "frontend/privacy.html",
  "frontend/terms.html",
  "frontend/404.html"
]) {
  assert.ok(
    viteConfig.includes(deploymentEntry),
    `Vite config should include ${deploymentEntry} so Vercel publishes the public route`
  );
}
assert.ok(viteConfig.includes("@vitejs/plugin-react"), "Vite config should use the React plugin");
assert.ok(packageJson.scripts.build.includes("vite.focus-room-static.config.js"), "build should regenerate the static Focus Room bundle");
assert.ok(staticFocusRoomConfig.includes("frontend/assets/focus-room-app"), "static Focus Room bundle should build into frontend assets");
assert.ok(staticFocusRoomConfig.includes("process.env.NODE_ENV"), "static Focus Room bundle should define process.env.NODE_ENV for browser-only serving");
assertReactResolverConfig(viteConfig, "Vite dev config");
assertReactResolverConfig(staticFocusRoomConfig, "Focus Room static build config");
assertFocusRoomOptimizerConfig(viteConfig);
assert.ok(
  runtimeConfig.includes('const SYNAPSE_PRODUCTION_API_BASE = "https://synapse-ai-backend-idnc.onrender.com"'),
  "runtime config should point public Vercel builds at the Render FastAPI backend"
);
assert.ok(
  runtimeConfig.includes('const SYNAPSE_PRODUCTION_DATA_API_BASE = "https://synapse-data-api.onrender.com"'),
  "runtime config should point public Vercel builds at the Render data API"
);

assert.ok(indexHtml.includes("react@18/umd/react.production.min.js"), "Workspace should keep CDN React for static-server compatibility");
assert.ok(indexHtml.includes("react-dom@18/umd/react-dom.production.min.js"), "Workspace should keep CDN ReactDOM for static-server compatibility");
assert.ok(main.includes("flushSync"), "main.js should preserve guarded synchronous shell boot");
assert.ok(main.includes("window.ReactDOM"), "Workspace main.js should use CDN ReactDOM globals on the static server");
assert.ok(runtime.includes("globalThis.React"), "React runtime helper should use the static-compatible React global");
assert.ok(app.includes("h(AppShell)"), "React app should render the shell as React elements");
assert.ok(!app.includes("dangerouslySetInnerHTML"), "React app should not inject the workspace shell as an HTML string");
assert.ok(!appShell.includes("FocusRoom()"), "AppShell should not render the separate Focus Room shell");
assert.ok(!analysisStage.includes("focusRoomCta"), "generated notes should not expose a duplicate Focus Room entry point");
assert.ok(controller.includes("\"10_focusroombridge.js\""), "legacy controller should load the Focus Room bridge");
assert.ok(historyNavigation.includes("learning-rail-focus-room"), "left learning navigation should include the Focus Room action");
assert.ok(
  historyNavigation.includes('legacyAction("openSynapseFocusRoom")')
    || historyNavigation.includes("workspacePresenters.openSynapseFocusRoom()"),
  "left learning navigation should open Focus Room through the shared bridge"
);
assert.ok(
  historyNavigation.includes("workspacePresenters") || historyNavigation.includes("legacyAction"),
  "left learning navigation should keep an explicit presenter or legacy action boundary"
);
assert.ok(boot.includes("getSynapseFocusRoomMaterials"), "boot should expose Focus Room material bridge helpers");
assert.ok(boot.includes("openSynapseFocusRoom"), "boot should expose the disabled-safe Focus Room opener");
assert.ok(uploadSection.includes("renderFocusRoomWorkspaceActions"), "analysis view should refresh Focus Room CTAs");
assert.ok(!historySection.includes("history-focus-room-btn"), "history rows should not duplicate the persistent left-nav Focus Room action");
assert.ok(
  runtimeConfig.includes('window.SYNAPSE_FOCUS_ROOM_ENABLED = window.SYNAPSE_FOCUS_ROOM_ENABLED !== false'),
  "Focus Room should be enabled by default while allowing an explicit false override"
);
assert.ok(style.includes("09-focus-room.css"), "global stylesheet should import Focus Room styles");
assert.ok(focusRoomHtml.includes("static-compatible-loader.js"), "Focus Room should use the static-compatible loader");
assert.ok(
  focusRoomHtml.includes("SYNAPSE_FOCUS_ROOM_ENABLED"),
  "Standalone Focus Room page should check the Focus Room flag before booting"
);
assert.ok(
  focusRoomHtml.includes('window.location.replace("index.html")'),
  "Standalone Focus Room page should redirect direct visitors to the workspace while disabled"
);
assert.ok(
  focusRoomHtml.includes('import("./src/focus-room/static-compatible-loader.js?v=focus-room-loader-v17")'),
  "Standalone Focus Room page should only import the loader after the feature flag allows it"
);
assert.ok(
  !focusRoomHtml.includes("await import("),
  "Standalone Focus Room page should avoid top-level await so Vercel's production build target can transpile it"
);
assert.ok(
  !focusRoomHtml.includes('type="module" src="src/focus-room/static-compatible-loader.js'),
  "Standalone Focus Room page should not boot the loader unconditionally while disabled"
);
assert.ok(
  focusRoomHtml.includes("styles/09-focus-room.css?v=timer-controls-v3"),
  "Focus Room HTML should cache-bust the CSS after portal stacking fixes"
);
assert.ok(
  focusRoomHtml.includes("static-compatible-loader.js?v=focus-room-loader-v17"),
  "Focus Room HTML should cache-bust the standalone loader after boot fixes"
);
assert.ok(focusRoomHtml.includes("styles/09-focus-room.css"), "Standalone Focus Room page should load Focus Room styles directly");
assert.ok(!focusRoomHtml.includes("react@18"), "Standalone Focus Room should rely on Vite/npm React, not CDN React");
assert.ok(focusRoomStaticLoader.includes("focus-room-static.js"), "Focus Room static loader should import the prebuilt static bundle");
assert.ok(
  focusRoomStaticLoader.includes("focus-room-static.js?v=focus-room-static-v17"),
  "Focus Room loader should cache-bust the static bundle after portal stacking fixes"
);
assert.ok(
  !focusRoomStaticLoader.includes("./standalone.js"),
  "Focus Room loader should use the prebuilt bundle in Vite dev to avoid optimized-deps React splits"
);
assert.ok(!focusRoomStaticLoader.includes("import.meta.env?.DEV"), "Focus Room loader should not branch into the Vite source graph");
assert.ok(!focusRoomStaticLoader.includes("VITE_PORTS"), "Focus Room loader should not mistake static servers for Vite based on port numbers");
assert.ok(focusRoomStaticLoader.includes("addEventListener(\"error\""), "Focus Room loader should surface runtime boot errors");
assert.ok(focusRoomStaticLoader.includes("addEventListener(\"unhandledrejection\""), "Focus Room loader should surface async boot errors");
assert.ok(focusRoomStaticLoader.includes("focusRoomHasMounted"), "Focus Room loader should verify that React mounted visible UI");
assert.ok(exists("frontend/assets/focus-room-app/focus-room-static.js"), "prebuilt static Focus Room bundle should exist for static servers");
assert.ok(
  /innook-setup-brand[\s\S]*?background:\s*transparent/.test(focusStyle),
  "Innook brand button must reset opaque UA/theme white fills"
);
assert.ok(
  focusStyle.includes("html[data-theme=\"light\"] .react-focus-room.is-innook-setup .innook-setup-brand"),
  "Innook brand must stay transparent under light account theme"
);
assert.ok(
  focusStyle.includes("scrollbar-color: rgba(255, 250, 240, .72)"),
  "Topics queue scrollbar should stay readable on dark glass"
);
const themeStyle = read("frontend/styles/00-theme.css");
assert.ok(
  themeStyle.includes(".focus-room-surface:not(.react-focus-room) button:not(.glass-button-primary)"),
  "Light theme must not paint React Focus Room buttons as opaque white surfaces"
);
assert.ok(
  themeStyle.includes(":where(.innook-setup-brand, .focus-landing-brand, .focus-wordmark, .landing-logo, .nav-logo, .mobile-brand)"),
  "Site brand controls should share a transparent chrome reset"
);
assert.ok(focusRoomStandalone.includes("initFocusRoom({ root })"), "Standalone Focus Room boot should initialize the React controller");
assert.ok(focusRoomStandaloneBridge.includes("HISTORY_STORAGE_KEY"), "Standalone Focus Room bridge should read generated history");
assert.ok(focusRoomStandaloneBridge.includes("getSynapseFocusRoomMaterials"), "Standalone Focus Room bridge should expose material providers");
assert.ok(focusRoomStandaloneBridge.includes("returnFromFocusRoomToWorkspace"), "Standalone Focus Room bridge should return to the workspace page");
assert.ok(focusRoomStandaloneBridge.includes("item.sourceFingerprint === id"), "Standalone Focus Room should resolve material routes by source fingerprint");
assert.ok(focusRoomStandaloneBridge.includes("return getSynapseFocusRoomMaterial(activeId);"), "Standalone Focus Room should not fall back to the oldest generated note");
assert.ok(focusRoomStandaloneBridge.includes("const workspaceId = String(historyItem?.id || \"\")"), "Standalone Focus Room should return using the matching history id");
assert.ok(focusRoomData.includes("Cafe Rain"), "Focus Room data should include the two-layer Rainy Cafe ambience");
assert.ok(focusBridge.includes("function getFocusRoomFlashcardsForCurrentNote()"), "Focus Room bridge should read stored flashcards for the active note");
assert.ok(focusBridge.includes("function getFocusRoomQuizRecordsForCurrentNote()"), "Focus Room bridge should expose saved quiz record metadata");
assert.ok(focusBridge.includes("flashcards: getFocusRoomFlashcardsForCurrentNote()"), "current Focus Room material should use stored flashcard records");
assert.ok(focusBridge.includes("quizzes: getFocusRoomQuizRecordsForCurrentNote()"), "current Focus Room material should use saved quiz records");
assert.ok(
  boot.includes('typeof renderFocusRoomWorkspaceActions === "function"'),
  "boot should guard Focus Room workspace action refreshes"
);
assert.ok(
  boot.includes('typeof notifyFocusRoomMaterialsChanged === "function"'),
  "boot should guard Focus Room material change notifications"
);
assert.ok(
  focusBridge.includes("function findFocusRoomHistoryItem(materialId = \"\")"),
  "workspace bridge should resolve Focus Room materials by history id or fingerprint"
);
assert.ok(
  focusBridge.includes("function isSynapseFocusRoomEnabled()"),
  "Workspace Focus Room bridge should gate entry points behind the runtime flag"
);
assert.ok(
  focusRoomPage.includes("useShallow(activeSessionSnapshot)"),
  "Focus Room active session persistence selector should use a stable shallow snapshot"
);

for (const file of [
  "frontend/src/focus-room/components/FocusRoomPage.jsx",
  "frontend/src/focus-room/components/FocusBackground.jsx",
  "frontend/src/focus-room/components/LiquidGlass.jsx",
  "frontend/src/focus-room/components/GlassButton.jsx",
  "frontend/src/focus-room/components/TopFocusNav.jsx",
  "frontend/src/focus-room/components/FocusRoomSetup.jsx",
  "frontend/src/focus-room/components/SceneSelector.jsx",
  "frontend/src/focus-room/components/SceneCard.jsx",
  "frontend/src/focus-room/components/SoundControlPanel.jsx",
  "frontend/src/focus-room/components/PomodoroTimer.jsx",
  "frontend/src/focus-room/components/TimerCard.jsx",
  "frontend/src/focus-room/components/BottomControlDock.jsx",
  "frontend/src/focus-room/components/AILearningPanel.jsx",
  "frontend/src/focus-room/components/FocusRoomToolPanel.jsx",
  "frontend/src/focus-room/components/FocusMaterialContent.jsx",
  "frontend/src/focus-room/components/FocusWorkspaceNotes.jsx",
  "frontend/src/focus-room/components/SessionOverviewCard.jsx",
  "frontend/src/focus-room/components/FlashcardStudyMode.jsx",
  "frontend/src/focus-room/components/QuizStudyMode.jsx",
  "frontend/src/focus-room/components/MindMapViewer.jsx",
  "frontend/src/focus-room/components/AIStudyChat.jsx",
  "frontend/src/focus-room/components/SessionSummaryModal.jsx",
  "frontend/src/focus-room/components/StudyHistoryPanel.jsx",
  "frontend/src/focus-room/hooks/useIdleMode.js",
  "frontend/src/focus-room/hooks/usePomodoroTimer.js",
  "frontend/src/focus-room/hooks/useFocusSession.js",
  "frontend/src/focus-room/hooks/useSceneBackground.js",
  "frontend/src/focus-room/hooks/useStudyMaterial.js",
  "frontend/src/focus-room/hooks/useFocusRoomMaterials.js",
  "frontend/src/focus-room/hooks/useAudioSettings.js",
  "frontend/src/focus-room/hooks/useSessionHistory.js",
  "frontend/src/focus-room/hooks/useFocusRoomStore.js",
  "frontend/src/focus-room/static-compatible-loader.js"
]) {
  assert.ok(exists(file), `${file} should exist`);
}

for (const token of [
  "createRoot",
  "exposeFocusRoomGlobals",
  "__synapseFocusRoomApi"
]) {
  assert.ok(focusRoomController.includes(token), `React Focus Room controller should include ${token}`);
}
assert.ok(!focusRoomController.includes("HashRouter"), "Standalone Focus Room should not wrap its self-managed hash route in React Router");
assert.ok(!focusRoomController.includes("QueryClientProvider"), "Standalone Focus Room should avoid a React Query provider in its boot path");
assert.ok(
  focusRoomController.includes("FocusRoomPage.jsx?v=focus-room-react-vite-v6"),
  "Standalone Focus Room controller should cache-bust the page module that owns React hooks"
);
assert.ok(!focusRoomQueryClient.includes("@tanstack/react-query"), "Focus Room query helper should avoid React Query in standalone boot");
assert.ok(focusRoomQueryClient.includes("invalidateQueries"), "Focus Room query helper should still expose invalidation for material refresh events");
assert.ok(
  focusRoomQueryClient.includes("function QueryClientProvider"),
  "Focus Room query helper should keep a no-op QueryClientProvider export for stale cached standalone modules"
);

for (const token of [
  "selectedScene",
  "selectedMaterialId",
  "musicType",
  "ambientSound",
  "musicVolume",
  "ambientVolume",
  "pomodoroDuration",
  "timerStatus",
  "studyGoal",
  "studyPlan",
  "aiPanelOpen",
  "isIdle",
  "currentSession",
  "sessionHistory",
  "materialsStatus",
  "workspaceNotes",
  "assistantContext",
  "activeSourceHighlight",
  "selectSourceHighlight"
]) {
  assert.ok(focusRoomStore.includes(token), `Zustand Focus Room store should include ${token}`);
}

assert.ok(focusRoomData.includes("sourceHighlights"), "Focus Room materials should normalize source highlights for generated evidence navigation");
assert.ok(topFocusNav.includes("Synapse"), "Top navigation should retain Synapse branding");
assert.ok(topFocusNav.includes("Open Focus Trail"), "Top navigation should expose Focus Trail");
assert.ok(topFocusNav.includes("Open room settings"), "Top navigation should expose room settings");
assert.ok(!focusRoomPage.includes("AILearningPanel"), "Pure Focus Room should not mount the generated-content study suite");
assert.ok(!focusRoomPage.includes("FocusRoomToolPanel"), "Pure Focus Room should not mount Synapse Tools");
assert.ok(!focusRoomPage.includes("useStudyMaterial"), "Pure Focus Room should not hydrate generated materials");
assert.ok(!bottomControlDock.includes("Synapse Tools"), "Pure Focus Room dock should not expose Synapse Tools");
assert.ok(!focusTimerCard.includes(">Materials<"), "Pure Focus Room timer should not expose Materials");

for (const token of [
  "useIdleMode(3000)",
  "usePomodoroTimer",
  "useAudioSettings",
  "initializeFocusRoom",
  "TopFocusNav",
  "BottomControlDock",
  "SessionSummaryModal"
]) {
  assert.ok(focusRoomPage.includes(token), `Focus Room page should include ${token}`);
}
assert.ok(!focusRoomPage.includes("<PomodoroTimer"), "Focus Room session should not mount the center timer card");
assert.ok(focusTimerCard.includes("isIdle"), "Timer card Motion animation should respond to idle mode");
assert.ok(focusTimerCard.includes("timerScale"), "Timer card should scale down through Motion during idle mode");
assert.ok(focusRoomPage.includes("initializeFocusRoom"), "Pure Focus Room should initialize without a generated material");
assert.ok(
  !focusToolPanel.includes('from "radix-ui"')
    && !sessionSummaryModal.includes('from "radix-ui"')
    && !soundControlPanel.includes('from "radix-ui"'),
  "Focus Room should import Radix primitives from scoped packages instead of the umbrella module"
);
assert.ok(focusToolPanel.includes('@radix-ui/react-dialog'), "Study suite should import Dialog from the scoped Radix package");
assert.ok(focusToolPanel.includes('@radix-ui/react-tabs'), "Study suite should import Tabs from the scoped Radix package");
assert.ok(sessionSummaryModal.includes('@radix-ui/react-dialog'), "Session summary should import Dialog from the scoped Radix package");
assert.ok(soundControlPanel.includes('@radix-ui/react-slider'), "Sound controls should import Slider from the scoped Radix package");

for (const token of [
  "--glass-bg",
  "--glass-bg-strong",
  "--glass-border",
  "--glass-border-strong",
  "--glass-blur",
  "--glass-radius",
  "--text-primary",
  "body.focus-room-standalone",
  "#focusRoomFallbackTitle",
  ".liquid-glass",
  "backdrop-filter: blur(var(--glass-blur)) saturate(190%) contrast(105%)",
  ".focus-background",
  ".focus-overlay",
  ".focus-setup-stage",
  "overflow-y: auto",
  ".focus-session-grid",
  ".session-overview",
  ".timer-card",
  ".bottom-dock",
  ".ai-learning-panel",
  ".focus-tool-panel",
  "z-index: 1308",
  ".focus-material-surface",
  ".focus-action-grid",
  ".is-idle .top-nav",
  ".is-idle .extra-panel",
  ".is-idle .timer-card",
  ".is-idle .bottom-dock",
  "@media (max-width: 640px)"
]) {
  assert.ok(focusStyle.includes(token), `Focus Room liquid glass CSS should include ${token}`);
}
assert.ok(
  focusStyle.indexOf("height: 100vh;") > -1 && focusStyle.indexOf("height: 100vh;") < focusStyle.indexOf("height: 100dvh;"),
  "Focus Room surface should declare a 100vh fallback before 100dvh"
);

function createFocusBridgeContext(overrides = {}) {
  const context = {
    console,
    currentFlashcards: [],
    currentHistoryId: "history-1",
    currentMindMap: null,
    currentSourceFingerprint: "fingerprint-1",
    currentTimeline: { events: [] },
    fullSummary: "Generated notes",
    getHistory: () => [],
    makeHistoryTitle: () => "Generated notes",
    quizHistory: [],
    sections: {},
    storedTitle: "Generated notes",
    summaryContent: { textContent: "" },
    ...overrides
  };
  vm.createContext(context);
  vm.runInContext(focusBridge, context);
  return context;
}

const disabledFocusRoomContext = createFocusBridgeContext({
  document: {
    getElementById: () => null
  },
  window: {
    SYNAPSE_FOCUS_ROOM_ENABLED: false,
    location: { href: "index.html" },
    dispatchEvent() {}
  }
});
disabledFocusRoomContext.renderFocusRoomWorkspaceActions();
disabledFocusRoomContext.openSynapseFocusRoom("history-1");
assert.equal(
  disabledFocusRoomContext.window.location.href,
  "index.html",
  "Disabled Focus Room opener should not navigate to the Focus Room page"
);

const fallbackCard = { front: "Fallback card", back: "Fallback answer" };
let bridgeContext = createFocusBridgeContext({ currentFlashcards: [fallbackCard] });
assert.deepEqual(
  bridgeContext.getSynapseFocusRoomCurrentMaterial().flashcards,
  [fallbackCard],
  "Focus Room bridge should fall back to current flashcards when getFlashcardStore is missing"
);

bridgeContext = createFocusBridgeContext({
  currentFlashcards: "not-an-array",
  getFlashcardStore: () => ({ "history:history-1": { cards: [{ front: "Stored card", back: "Stored answer" }] } })
});
assert.deepEqual(
  bridgeContext.getSynapseFocusRoomCurrentMaterial().flashcards,
  [{ front: "Stored card", back: "Stored answer" }],
  "Focus Room bridge should prefer stored flashcards for the active note"
);

bridgeContext = createFocusBridgeContext({
  fullSummary: "",
  getFlashcardStore: () => ({
    "history:history-2": { cards: [{ front: "Saved card", back: "Saved answer" }] }
  }),
  getHistory: () => [{
    id: "history-2",
    title: "Saved History Note",
    summary: "# Saved History Note\n\nReview the saved material.",
    sourceFingerprint: "fingerprint-2"
  }],
  getQuizHistoryStore: () => ({
    "history:history-2": [{
      id: "quiz-2",
      title: "Saved History Quiz",
      createdAt: "2026-06-09T00:00:00.000Z",
      quiz: { questions: [{ question: "What should history keep connected?" }] },
      report: { objectivePercent: 100 }
    }]
  })
});
assert.deepEqual(
  bridgeContext.getSynapseFocusRoomMaterial("history-2").flashcards,
  [{ front: "Saved card", back: "Saved answer" }],
  "Focus Room history materials should include stored flashcards"
);
assert.deepEqual(
  JSON.parse(JSON.stringify(bridgeContext.getSynapseFocusRoomMaterial("history-2").quizzes)),
  [{
    id: "quiz-2",
    title: "Saved History Quiz",
    createdAt: "2026-06-09T00:00:00.000Z",
    updatedAt: "",
    questions: [{ question: "What should history keep connected?" }],
    report: { objectivePercent: 100 }
  }],
  "Focus Room history materials should include stored quiz records"
);

console.log("focus room integration regression passed");
