# Focus Room scene connections

Scenes are the atmospheric spine of Focus Room. Every scene selection must update **one coherent bundle** so UI, motion, and audio stay aligned.

## Connection graph

```text
Scene catalog (FOCUS_ROOM_SCENES)
        │
        ▼
resolveSceneBundle(sceneId)
        │
        ├── scene          → FocusBackground image / preload
        ├── motion         → SceneMotionLayer (sceneMotion profiles)
        ├── musicType      → store + Howler music track
        ├── ambientSound   → store + ambient layers
        └── audio profile  → getFocusRoomAudioProfile(music + ambient)
                │
                ▼
        useFocusRoomStore.selectScene / scenePresenter.applySceneSelection
                │
                ├── persistDraftFromState
                ├── SessionOverviewCard / TopFocusNav labels
                └── SoundControlPanel / Room settings drawers
```

## Canonical API

Use `frontend/src/focus-room/model/sceneBundle.js`:

- `resolveSceneBundle(sceneId)` — single read model for a scene
- `sceneSelectionPatch(sceneId, previous)` — store patch for selection
- `listSelectableScenes(selectedId)` — gallery minus `galleryOnly` extras

Presenters (`focus-room/presenters/scenePresenter.js`) are the only place views/store actions should interpret “user picked a scene”.

## Invariants

1. Every catalog scene has `id`, `name`, `image`, `motionProfile` (or id fallback), `musicType`, `ambientSound`.
2. Motion profiles in `sceneMotion.js` are keyed by scene id; missing keys fall back to `morning-window`.
3. Changing scene updates music/ambient defaults from the scene unless a future explicit “lock audio” flag exists (it does not today).
4. Background preload failures must not corrupt `selectedScene` identity in the store.

## Related surfaces

| Surface | How it consumes the bundle |
| --- | --- |
| Setup / SceneSelector | Lists scenes; calls `selectScene` |
| FocusBackground | Renders `scene.image` + motion profile |
| Audio hooks | Read `musicType` / `ambientSound` from store |
| Session summary | Shows `currentScene(record.selectedScene).name` |
| Workspace bridge | Does not change scenes; only materials/tools on return |
