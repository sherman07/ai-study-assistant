# Architecture smells catalog

Use this as a hunt list during Phase 1–3. Only act on smells that exist in the target codebase.

## Structure and size

| Smell | Signals | Prefer |
| --- | --- | --- |
| God file / class | Thousands of lines; many unrelated methods | Split by responsibility; keep public façade if needed |
| Long function | Deep nesting; many locals; mixed I/O and rules | Extract pure helpers; early returns |
| Shotgun surgery | One change touches many unrelated files | Raise cohesion; introduce a single owner module |

## Coupling and boundaries

| Smell | Signals | Prefer |
| --- | --- | --- |
| Mixed responsibilities | UI builds SQL; handlers embed business rules | Separate presentation / application / domain / infra |
| Tight coupling | Concrete infra types leaked everywhere | Depend on narrow interfaces/functions at boundaries |
| Circular dependencies | Import cycles; init-order hacks | Invert dependency; extract shared types |
| Scattered business logic | Same rule in UI, API, and DB triggers | Single domain/application owner |

## Quality and safety

| Smell | Signals | Prefer |
| --- | --- | --- |
| Duplicated logic | Copy-paste with drift | Shared function after confirming identical intent |
| Weak naming | `data`, `util2`, `temp` | Name after domain meaning |
| Poor error handling | Swallowed exceptions; bare `except` / empty `catch` | Typed/domain errors; fail at trust boundaries |
| Hard-coded values | Magic URLs, limits, roles inlined | Config / constants with clear owners |
| Global mutable state | Module singletons mutated from many places | Explicit context, DI at edges, or immutable config |
| Missing validation | External input trusted | Validate at boundary; keep domain assuming valid types |
| Security weakness | String SQL, secrets in repo, permissive CORS, verbose auth logs | Parameterise; secret stores; least privilege; redact |
| Untested critical behaviour | Payments, auth, migrations, parsers without tests | Characterization tests before refactor |

## Proportionality reminder

Finding a smell does not require a new framework. Prefer the smallest boundary that removes the demonstrated problem.
