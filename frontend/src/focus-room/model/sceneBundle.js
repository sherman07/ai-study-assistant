/**
 * Focus Room scene connection model.
 * Single place that binds catalog scene → motion → default audio.
 */
import {
  FOCUS_ROOM_SCENES,
  getFocusRoomAudioProfile
} from "../data.js";
import { sceneMotionProfile } from "../sceneMotion.js";
import { currentScene, sceneById } from "../utils.js";

export function listCatalogScenes() {
  return FOCUS_ROOM_SCENES.slice();
}

export function listSelectableScenes(selectedSceneId = "") {
  const selected = String(selectedSceneId || "");
  return FOCUS_ROOM_SCENES.filter(scene => !scene.galleryOnly || scene.id === selected);
}

/**
 * Resolve the full atmospheric bundle for a scene id.
 * @returns {{ scene: object, motion: object, audio: object, musicType: string, ambientSound: string } | null}
 */
export function resolveSceneBundle(sceneId) {
  const matched = sceneById(sceneId);
  if (!matched && sceneId) {
    // Unknown id: still resolve the default scene so callers never get a half-bundle.
  }
  const scene = matched || currentScene(sceneId);
  if (!scene?.id) return null;

  const motion = sceneMotionProfile(scene.motionProfile || scene.id);
  const musicType = String(scene.musicType || "Deep Focus");
  const ambientSound = String(scene.ambientSound || "Nature");
  const audio = getFocusRoomAudioProfile({ musicType, ambientSound });

  return {
    scene,
    motion,
    audio,
    musicType,
    ambientSound
  };
}

/**
 * Store patch when the user selects a scene.
 * Keeps selectedScene, musicType, and ambientSound coherent.
 */
export function sceneSelectionPatch(sceneId, previousState = {}) {
  const matched = sceneById(sceneId);
  if (!matched) return null;
  const bundle = resolveSceneBundle(matched.id);
  if (!bundle) return null;
  return {
    selectedScene: bundle.scene.id,
    musicType: bundle.musicType || previousState.musicType,
    ambientSound: bundle.ambientSound || previousState.ambientSound
  };
}

export function assertSceneCatalogIntegrity(scenes = FOCUS_ROOM_SCENES) {
  const errors = [];
  const seen = new Set();
  for (const scene of scenes) {
    if (!scene?.id) errors.push("scene missing id");
    else if (seen.has(scene.id)) errors.push(`duplicate scene id: ${scene.id}`);
    else seen.add(scene.id);
    if (!scene?.name) errors.push(`scene ${scene?.id || "?"} missing name`);
    if (!scene?.image) errors.push(`scene ${scene?.id || "?"} missing image`);
    if (!scene?.musicType) errors.push(`scene ${scene?.id || "?"} missing musicType`);
    if (!scene?.ambientSound) errors.push(`scene ${scene?.id || "?"} missing ambientSound`);
  }
  return errors;
}
