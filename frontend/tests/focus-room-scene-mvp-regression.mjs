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

const {
  assertSceneCatalogIntegrity,
  listSelectableScenes,
  resolveSceneBundle,
  sceneSelectionPatch
} = await import("../src/focus-room/model/sceneBundle.js");
const {
  applySceneSelection,
  getScenePresentation,
  getSelectableScenePresentations
} = await import("../src/focus-room/presenters/scenePresenter.js");
const {
  FOCUS_ROOM_RETURN_TARGET_KEY,
  describeWorkspaceReturnTarget,
  isKnownWorkspaceReturnAction,
  normalizeFocusRoomWorkspaceTarget,
  parseFocusRoomReturnTargetRaw
} = await import("../src/focus-room/model/workspaceReturnTarget.js");
const { FOCUS_ROOM_SCENES } = await import("../src/focus-room/data.js");
const { SCENE_MOTION_PROFILES } = await import("../src/focus-room/sceneMotion.js");

const integrityErrors = assertSceneCatalogIntegrity();
assert.deepEqual(integrityErrors, [], `scene catalog integrity: ${integrityErrors.join("; ")}`);

for (const scene of FOCUS_ROOM_SCENES) {
  const bundle = resolveSceneBundle(scene.id);
  assert.ok(bundle, `bundle missing for ${scene.id}`);
  assert.equal(bundle.scene.id, scene.id);
  assert.equal(bundle.musicType, scene.musicType);
  assert.equal(bundle.ambientSound, scene.ambientSound);
  assert.ok(bundle.motion?.id, `motion missing for ${scene.id}`);
  assert.ok(Array.isArray(bundle.motion.layers) && bundle.motion.layers.length > 0);
  assert.ok(bundle.audio?.musicTrack, `audio music track missing for ${scene.id}`);
  assert.ok(bundle.audio?.ambientSound, `audio ambient missing for ${scene.id}`);

  const expectedMotionId = scene.motionProfile || scene.id;
  assert.ok(
    SCENE_MOTION_PROFILES[expectedMotionId] || SCENE_MOTION_PROFILES["morning-window"],
    `no motion profile mapping for ${scene.id}`
  );

  const patch = sceneSelectionPatch(scene.id, { musicType: "Lo-fi", ambientSound: "Rain" });
  assert.deepEqual(patch, {
    selectedScene: scene.id,
    musicType: scene.musicType,
    ambientSound: scene.ambientSound
  });

  const presentation = getScenePresentation(scene.id);
  assert.equal(presentation.title, scene.name);
  assert.equal(presentation.image, scene.image);
}

assert.equal(sceneSelectionPatch("does-not-exist"), null);
assert.equal(applySceneSelection("does-not-exist"), null);

const selectable = listSelectableScenes();
assert.ok(selectable.length >= 8);
assert.equal(getSelectableScenePresentations().length, selectable.length);

const normalized = normalizeFocusRoomWorkspaceTarget({
  materialId: " hist-1 ",
  action: "Quiz",
  source_id: "src-9",
  source_index: "2",
  source_label: "Slide 2",
  section_title: "Derivatives",
  highlight_id: "hl-1",
  excerpt: " dy/dx "
});
assert.deepEqual(normalized, {
  materialId: "hist-1",
  action: "quiz",
  sourceId: "src-9",
  sourceIndex: 2,
  sourceLabel: "Slide 2",
  sectionTitle: "Derivatives",
  highlightId: "hl-1",
  excerpt: "dy/dx"
});
assert.equal(isKnownWorkspaceReturnAction("quiz"), true);
assert.equal(isKnownWorkspaceReturnAction("nope"), false);
assert.equal(describeWorkspaceReturnTarget({ action: "notes" }).kind, "notes");
assert.equal(FOCUS_ROOM_RETURN_TARGET_KEY, "synapse.focusRoom.return-target.v1");
assert.deepEqual(
  parseFocusRoomReturnTargetRaw(JSON.stringify({ action: "assistant", materialId: "m1" })),
  normalizeFocusRoomWorkspaceTarget({ action: "assistant", materialId: "m1" })
);
assert.equal(parseFocusRoomReturnTargetRaw("{bad"), null);

console.log("focus-room-scene-mvp-regression: passed");
