/**
 * Presenter for Focus Room scene selection.
 * Views and the Zustand store should call these helpers instead of
 * hand-wiring music/ambient/motion fields.
 */
import {
  listSelectableScenes,
  resolveSceneBundle,
  sceneSelectionPatch
} from "../model/sceneBundle.js";

export function getScenePresentation(sceneId) {
  const bundle = resolveSceneBundle(sceneId);
  if (!bundle) {
    return {
      scene: null,
      motion: null,
      title: "Focus Room",
      kicker: "",
      description: "",
      image: "",
      musicType: "Deep Focus",
      ambientSound: "Nature"
    };
  }
  return {
    scene: bundle.scene,
    motion: bundle.motion,
    title: bundle.scene.name,
    kicker: bundle.scene.kicker || "",
    description: bundle.scene.description || "",
    image: bundle.scene.image || "",
    musicType: bundle.musicType,
    ambientSound: bundle.ambientSound,
    audio: bundle.audio
  };
}

export function applySceneSelection(sceneId, previousState = {}) {
  return sceneSelectionPatch(sceneId, previousState);
}

export function getSelectableScenePresentations(selectedSceneId = "") {
  return listSelectableScenes(selectedSceneId).map(scene => getScenePresentation(scene.id));
}
