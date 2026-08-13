# Frontend architecture (Feature-Sliced)

See the full target layout and migration plan in
[`docs/architecture/REACT_NODE_ARCHITECTURE.md`](../../docs/architecture/REACT_NODE_ARCHITECTURE.md).

## Hard rules

- **Max 500 lines** per source file (enforced by `npm run test:architecture`).
- **Dependency rule:** `app → pages → features → entities → shared`.
  Never import deep internals of another feature; use that feature’s public `index.js`.
  New code must not import `legacy/` except at an explicit adapter boundary.

## Layout

| Layer | Path | Role |
| --- | --- | --- |
| app | `src/app/` | Boot, providers, root mount |
| pages | `src/pages/` | Routable shells (workspace, landing, focus-room) |
| features | `src/features/` | User capabilities (credits, study-tools, auth, …) |
| entities | `src/entities/` | Business objects (source, note, user) |
| shared | `src/shared/` | Cross-cutting `lib/` + `ui/` only |
| legacy | `src/legacy/` | Temporary adapters; shrinks to zero |
