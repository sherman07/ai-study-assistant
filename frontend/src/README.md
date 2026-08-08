# Frontend Architecture

The frontend boots through a React shell while preserving the existing Synapse
controller behavior.

## MVP boundaries

Dependency direction: **View → Presenter → Model ← Services**.

- `mvp/README.md` — short rules for new code
- `docs/architecture/MVP.md` — system-wide target structure
- `docs/architecture/SCENE_CONNECTIONS.md` — how Focus Room scenes connect

| Layer | Paths |
| --- | --- |
| View | `react/components/`, `focus-room/components/`, `landing/` |
| Presenter | `focus-room/presenters/`, `legacy/presenters/` |
| Model | `focus-room/model/`, pure helpers in `legacy/*` stores |
| Services | `legacy/apiClient.js`, `legacy/dataApiClient.js`, auth scripts |

## Boot flow

- `main.js` mounts the React shell, registers Focus Room return-target normalisation, then loads the legacy controller.
- `react/App.js` is the React entry component.
- `react/runtime.js` exposes the browser React runtime plus compatibility helpers for invoking legacy global actions.
- `legacy/presenters/workspaceActions.js` is the preferred named bridge for React→legacy calls.
- `legacy/controller.js` remains the feature controller for uploads, notes, source viewing, study tools, tutor chat, voice tutor, and history until those flows are extracted.
- `legacy/loadLegacyController.js` loads the controller only after React has rendered the DOM that the controller binds to.

## Focus Room scenes

Scene selection must go through `focus-room/model/sceneBundle.js` /
`focus-room/presenters/scenePresenter.js` so image, motion, music, and ambient
stay coherent. See `docs/architecture/SCENE_CONNECTIONS.md`.

## Refactor Direction

New UI should be added as focused React components first. Prefer presenters over
raw `legacyAction("string")` calls. Keep DOM ids stable until their callers are
migrated.
