# Synapse Architecture (React + Node, high cohesion / low coupling)

## Principles (research-backed)

Industry practice for maintainable React/Node apps favors **feature-based structure** (Feature-Sliced Design / screaming architecture), not folders by file type (`components/`, `utils/` dumps).

| Principle | Meaning here |
| --- | --- |
| **High cohesion** | Code that changes together for one capability lives in one feature folder |
| **Low coupling** | Features import each other only through a public `index.js` API |
| **Colocation** | UI, hooks, API, and pure logic for a feature stay together |
| **Hard size budget** | **Every source file ≤ 500 lines**. No exceptions for new or migrated code |
| **UI freeze** | Visual design stays the same; this refactor is structure and React composition |

References: Feature-Sliced Design, feature-based React/Node guides emphasizing public APIs and dependency direction.

## Target layout

```text
frontend/src/
  app/                 # boot, providers, root mount
  pages/               # routable shells (landing, workspace, focus-room, auth)
  features/            # user capabilities (upload, notes, quiz, credits, …)
  entities/            # core business objects (source, note, session, user)
  shared/              # truly cross-cutting UI/lib only
  legacy/              # temporary adapters only; shrinks to zero

server/src/
  app/                 # Express composition
  features/            # billing, users, generated-content, admin
  shared/              # db client, middleware, config

backend/               # AI analysis service (Python FastAPI) — kept as a bounded service
  app.py               # composition root only (≤500)
  routers/             # HTTP adapters
  services/            # use-cases
  domain/              # pure rules
```

### Dependency rule

`app → pages → features → entities → shared`

Never import deep internals of another feature. Never import `legacy` from new code except at an explicit adapter.

## Migration strategy

1. Scaffold the tree and enforce the 500-line budget in CI.
2. Move existing React (landing, focus-room, workspace shell) into `pages/` + `features/`.
3. Split every file over 500 lines into cohesive modules.
4. Replace HTML-string DOM builders with React components inside features (same markup/classes → same look).
5. Thin `legacy/controller_sections` into loaders that call feature public APIs, then delete them.

## Out of scope for UI

No visual redesign. Keep existing CSS class names and layout behavior while moving logic into React.
