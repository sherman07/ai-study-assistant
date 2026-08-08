# Synapse MVP architecture

Proportional Model–View–Presenter (plus thin services) for the three Synapse surfaces.
This is the target dependency direction for new code and for incremental extractions.

## System surfaces

```text
Presentation          Application / Presenters         Model / Domain           Infrastructure
─────────────────     ───────────────────────────      ───────────────────      ─────────────────
HTML / React views    Workspace presenters             Study material rules    FastAPI AI clients
Focus Room JSX        Focus session / scene presenters Scene + audio + motion  Express + Supabase
Static auth pages     Auth / billing page scripts      Entitlements / credits  Stripe, SMTP, disk
```

**Dependency direction:** View → Presenter → Model ← Services/Infrastructure.

Views must not call Stripe, Supabase service role, or OpenAI directly. Models must not import React or Express.

## Frontend (`frontend/src`)

| Layer | Location | Responsibility |
| --- | --- | --- |
| View | `react/components/*`, `focus-room/components/*`, `landing/*` | Render + user events only |
| Presenter | `focus-room/presenters/*`, `legacy/presenters/*` | Map events → model patches / service calls |
| Model | `focus-room/model/*`, pure helpers in `legacy/*` stores | Scene bundles, return targets, drafts, validation |
| Services | `legacy/apiClient.js`, `legacy/dataApiClient.js`, `auth-client.js` | HTTP I/O |
| Legacy adapter | `legacy/controller_sections/*` via `runtime.legacyAction` | Temporary bridge until presenters own flows |

### Scene connection (Focus Room)

Selecting a scene must go through `resolveSceneBundle` / `scenePresenter` so image, motion profile, default music, and ambient stay consistent. See [SCENE_CONNECTIONS.md](./SCENE_CONNECTIONS.md).

### Workspace ↔ Focus Room

Cross-page handoff uses a normalised return-target model (`workspaceReturnTarget`) and the existing localStorage key `synapse.focusRoom.return-target.v1`. Do not invent a second handoff shape.

## Backend (`backend`)

| Layer | Location | Responsibility |
| --- | --- | --- |
| Presentation | FastAPI routes in `app.py` + `app_sections/*` | HTTP adapters (migrate toward routers over time) |
| Application | `application/` | Use-case orchestration (new code lands here) |
| Domain | `domain/` | Pure contracts (companion, prompt modes, URL rules) |
| Infrastructure | `core/` clients, storage, config | OpenAI/Gemini, Data API client, assets, env |

`app_sections` remain load-order `exec` modules for compatibility. **Do not grow them**—add domain/application modules and call from sections.

## Data API (`server`)

| Layer | Location | Responsibility |
| --- | --- | --- |
| Presentation | `src/routes/*` | Validate HTTP, call services |
| Application | `src/services/*`, `src/billing/*` | Billing/credits orchestration |
| Domain rules | `billing/plans.js`, `billing/credits.js`, `utils/validators.js` | Pure plan/credit rules |
| Repository | `src/repositories/*` | Supabase table access |
| Infrastructure | `src/supabase/*`, Stripe SDK | External I/O |

## Do not break

- Public routes, env var names, DOM ids used by the legacy controller, Focus Room storage keys, Supabase schema.
- Prefer characterisation tests before extracting god files (`01_uploadedfiles`, `10_parse_quiz_type_plan`, `useFocusRoomStore`).

## Out of scope for this MVP cut

- Greenfield SPA / React Router migration of the whole MPA
- Replacing `app_sections` exec loader in one PR
- Merging workspace quiz/flashcard UIs with Focus Room tool UIs
- Deleting legacy billing routes on FastAPI without a dedicated cutover
