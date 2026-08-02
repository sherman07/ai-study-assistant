import assert from "node:assert/strict";

const values = new Map();
globalThis.localStorage = {
  getItem(key) {
    return values.has(key) ? values.get(key) : null;
  },
  setItem(key, value) {
    values.set(key, String(value));
  },
  removeItem(key) {
    values.delete(key);
  }
};

const data = await import("../src/focus-room/data.js");

assert.equal(data.FOCUS_ROOM_SESSION_KEY, "synapse.focusRoom.sessions.v1");
assert.equal(data.FOCUS_ROOM_SCENES.length, 8);
assert.ok(data.FOCUS_ROOM_SCENES.every(scene => scene.id && scene.name && scene.image), "each scene should have an image-backed identity");
assert.equal(data.FOCUS_ROOM_GALLERY_SCENES.length, 8, "the Innook-style setup gallery should have a complete two-row scene set");
assert.deepEqual(
  data.FOCUS_ROOM_GALLERY_SCENES.map(scene => scene.name),
  ["Morning Window", "Cabin Twilight", "Last Light Lounge", "Garden Café", "Sunset Classroom", "Tokyo Night", "Snow Window Cabin", "Bamboo Cabin"]
);
assert.ok(data.FOCUS_ROOM_GALLERY_SCENES.every(scene => scene.image.includes("/original/")), "all selectable scenes must use original Synapse artwork");
assert.ok(data.FOCUS_ROOM_GALLERY_SCENES.every(scene => scene.motionProfile), "all selectable scenes must have a motion profile");

globalThis.getSynapseFocusRoomMaterials = () => [];
globalThis.getSynapseFocusRoomCurrentMaterial = () => null;
assert.deepEqual(data.getFocusRoomMaterials(), []);
delete globalThis.getSynapseFocusRoomMaterials;
delete globalThis.getSynapseFocusRoomCurrentMaterial;

const material = data.normalizeFocusRoomMaterial({
  id: "history-1",
  title: "Vector Calculus Review",
  summary: "# Key Ideas\n\nGradients measure steepest increase.\n\n## Worked Examples\nUse partial derivatives.",
  sections: {
    "Key Ideas": "Gradients measure steepest increase.",
    "Worked Examples": "Use partial derivatives."
  },
  flashcards: [
    { front: "Gradient", back: "Direction of steepest increase" }
  ],
  quizzes: [
    {
      id: "quiz-1",
      title: "Gradient Check",
      questions: [{ question: "What does a gradient measure?" }],
      report: { objectivePercent: 100 }
    }
  ],
  mindMap: { branches: [{ title: "Gradients" }] },
  sourceFingerprint: "abc123"
});

assert.equal(material.materialId, "history-1");
assert.equal(material.materialTitle, "Vector Calculus Review");
assert.equal(material.aiSummary.includes("Gradients"), true);
assert.deepEqual(material.studyHeadings.slice(0, 2), ["Key Ideas", "Worked Examples"]);
assert.equal(material.flashcards.length, 1);
assert.equal(material.quizzes[0].report.objectivePercent, 100);
assert.equal(material.promptMode, "professor_mode");
assert.equal(material.isSourceRestricted, false);

const sourceLinkedMaterial = data.normalizeFocusRoomMaterial({
  id: "source-linked",
  title: "Cardiology Lecture",
  summary: "# Evidence Bank\n\nBeta blockers reduce heart rate in the uploaded lecture.",
  sections: {
    "Evidence Bank": "Beta blockers reduce heart rate in the uploaded lecture."
  },
  sourceItems: [{
    id: "upload:cardiology:0",
    name: "cardiology-week-3.pdf",
    title: "Cardiology Week 3",
    kind: "pdf",
    content: "The lecture states that beta blockers reduce heart rate and contractility."
  }],
  source_highlights: [{
    title: "Beta blocker mechanism",
    excerpt: "beta blockers reduce heart rate and contractility",
    source_id: "upload:cardiology:0",
    section_title: "Evidence Bank"
  }]
});

assert.equal(sourceLinkedMaterial.sourceHighlights.length, 1);
assert.equal(sourceLinkedMaterial.sourceHighlights[0].sourceId, "upload:cardiology:0");
assert.equal(sourceLinkedMaterial.sourceHighlights[0].sectionTitle, "Evidence Bank");
assert.ok(sourceLinkedMaterial.sourceHighlights[0].excerpt.includes("heart rate"));

const fallbackSourceHighlights = data.normalizeFocusRoomMaterial({
  id: "source-fallback",
  summary: "# Notes\n\nUse the uploaded source.",
  sourceItems: [{
    id: "text:primary",
    title: "Pasted source",
    kind: "note",
    content: "This pasted source excerpt should become a navigable evidence highlight in Focus Room."
  }]
});

assert.equal(fallbackSourceHighlights.sourceHighlights.length, 1);
assert.equal(fallbackSourceHighlights.sourceHighlights[0].sourceId, "text:primary");
assert.ok(fallbackSourceHighlights.sourceHighlights[0].excerpt.includes("pasted source excerpt"));

const mergedMaterials = data.mergeFocusRoomMaterials([
  material
], [{
  id: "history-1",
  summary: "# Key Ideas\n\nUpdated summary.",
  prompt_mode: "source_strict_research_mode",
  sections: {
    "Key Ideas": "Updated source-grounded idea."
  },
  sources: [{ title: "Chapter 1 PDF" }]
}]);

assert.equal(mergedMaterials.length, 1);
assert.equal(mergedMaterials[0].isSourceRestricted, true);
assert.equal(mergedMaterials[0].sources[0].title, "Chapter 1 PDF");
assert.equal(mergedMaterials[0].sections["Key Ideas"], "Updated source-grounded idea.");

const plan = data.buildFocusRoomStudyPlan({
  material,
  goal: "Prepare for tomorrow's quiz",
  durationMinutes: 45
});

assert.equal(plan.length, 4);
assert.ok(plan[0].task.includes("Prepare for tomorrow's quiz"));
assert.ok(plan.some(item => item.task.includes("Worked Examples")));

const shortPlan = data.buildFocusRoomStudyPlan({
  material,
  durationMinutes: 10
});
assert.equal(shortPlan.reduce((total, item) => total + item.minutes, 0), 10);

const clampedPlan = data.buildFocusRoomStudyPlan({
  material,
  durationMinutes: 5
});
assert.equal(clampedPlan.reduce((total, item) => total + item.minutes, 0), 10);

const session = data.saveFocusRoomSession({
  sessionId: "session-1",
  materialId: "history-1",
  materialTitle: "Vector Calculus Review",
  studyGoal: "Prepare for tomorrow's quiz",
  selectedScene: "morning-window",
  pomodoroDuration: 45,
  startedAt: "2026-06-09T00:00:00.000Z",
  endedAt: "2026-06-09T00:30:00.000Z",
  totalFocusTime: 1800,
  flashcardsCompleted: 3,
  quizScore: 80,
  completedTasks: ["Review Key Ideas"],
  aiReflection: "You completed a focused review session."
});

assert.equal(session.materialTitle, "Vector Calculus Review");
assert.equal(data.readFocusRoomSessions().length, 1);
assert.equal(data.formatFocusRoomDuration(3661), "1h 1m");
assert.equal(data.formatFocusRoomDuration("bad"), "0m");

const defaultSession = data.saveFocusRoomSession();
assert.equal(defaultSession.materialTitle, "Study material");
assert.equal(defaultSession.totalFocusTime, 0);

const invalidNumericSession = data.saveFocusRoomSession({
  sessionId: "session-invalid-numeric",
  musicVolume: "bad",
  ambientVolume: "bad",
  pomodoroDuration: "bad",
  totalFocusTime: "bad",
  flashcardsCompleted: "bad",
  quizScore: "bad"
});

assert.equal(invalidNumericSession.musicVolume, 60);
assert.equal(invalidNumericSession.ambientVolume, 50);
assert.equal(invalidNumericSession.pomodoroDuration, 25);
assert.equal(invalidNumericSession.totalFocusTime, 0);
assert.equal(invalidNumericSession.flashcardsCompleted, 0);
assert.equal(invalidNumericSession.quizScore, null);

assert.equal(data.FOCUS_ROOM_ACTIVE_SESSION_KEY, "synapse.focusRoom.active-session.v1");
data.saveFocusRoomActiveSession("history-1", {
  view: "session",
  elapsedSeconds: 900,
  workspaceNotes: "Need more practice with examples."
});
assert.equal(data.readFocusRoomActiveSessionForMaterial("history-1").elapsedSeconds, 900);
data.clearFocusRoomActiveSession("history-1");
assert.equal(data.readFocusRoomActiveSessionForMaterial("history-1"), null);

const originalSetItem = globalThis.localStorage.setItem;
const originalWarn = console.warn;
globalThis.localStorage.setItem = () => {
  throw new Error("storage unavailable");
};
console.warn = () => {};
const unpersistedSession = data.saveFocusRoomSession({
  sessionId: "session-unpersisted",
  materialTitle: "Offline Review"
});
assert.equal(unpersistedSession.persisted, false);
assert.ok(
  data.readFocusRoomSessions().some(item => item.sessionId === "session-unpersisted" && item.persisted === false),
  "unpersisted sessions should remain visible from the in-memory fallback"
);
globalThis.localStorage.setItem = originalSetItem;
console.warn = originalWarn;

console.log("focus room data regression passed");
