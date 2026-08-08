# Frontend MVP layout

```text
View (React / HTML)
  → Presenter (focus-room/presenters, legacy/presenters)
    → Model (focus-room/model, pure legacy stores)
      ← Services (apiClient, dataApiClient, auth)
```

## Rules

1. New Focus Room scene / audio / motion behaviour goes through `model/sceneBundle.js`.
2. New React→legacy calls prefer `legacy/presenters/workspaceActions.js` over raw `legacyAction("string")`.
3. Do not grow `controller_sections` with new product logic; extract a model/presenter first.
4. Keep stable DOM ids until their legacy binders are migrated.

See `docs/architecture/MVP.md` and `docs/architecture/SCENE_CONNECTIONS.md`.
