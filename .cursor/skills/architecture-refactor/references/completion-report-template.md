# Completion report template

Copy this structure into the final user-facing response. Fill every section with evidence. Omit marketing language.

## 1. Architectural problems found

- Problem → where it showed up → why it mattered

## 2. Files and structures changed

- Added:
- Moved / renamed:
- Modified:
- Removed (only if verified unused):
- New module / layer boundaries (if any):

## 3. Why the new architecture is better

- Concrete improvements (cohesion, coupling, testability, security, readability)
- What was intentionally *not* introduced (and why)

## 4. Verification commands run

List exact commands, e.g.:

```bash
npm test
npm run lint
npm run build
```

## 5. Exact test / build results

- Pass / fail counts or exit codes
- Notable suite names
- Quote failures; distinguish pre-existing vs introduced

## 6. Existing failures or remaining risks

- Pre-existing failures still present
- Known residual risks (auth edges, untested paths, deferred hotspots)

## 7. Future improvements (out of scope)

- Items deliberately deferred
- Suggested next refactors with rationale

## Integrity statement

State whether behaviour preservation is:

- **Supported by tests** (cite which), or
- **Partially supported** (what lacks coverage), or
- **Not fully verified** (why)

Do not claim “fully refactored / fixed / verified” unless the evidence above supports it.
