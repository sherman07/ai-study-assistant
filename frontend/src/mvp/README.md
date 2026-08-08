# Frontend MVP layout

```text
View (React / HTML)
  → Presenter (focus-room/presenters, legacy/presenters)
    → Model (focus-room/model, pure legacy stores)
      ← Services (apiClient, dataApiClient, auth)
```

## Before adding anything new

Do the lightweight architecture-refactor mini-pass (see `.cursor/rules/architecture-quality.mdc` and `.cursor/skills/architecture-refactor/SKILL.md`): place the change in the correct layer, preserve contracts, keep it proportional, and add a focused test when behaviour matters.

## Rules

1. New Focus Room scene / audio / motion behaviour goes through `model/sceneBundle.js`.
2. New React→legacy calls prefer `legacy/presenters/workspaceActions.js` over raw `legacyAction("string")`.
3. Do not grow `controller_sections` with new product logic; extract a model/presenter first.
4. Keep stable DOM ids until their legacy binders are migrated.

See `docs/architecture/MVP.md` and `docs/architecture/SCENE_CONNECTIONS.md`.
