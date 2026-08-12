# Controller live QA and security design

## Objective

Run a thorough, authenticated quality-assurance campaign for Synapse using the
controller account supplied by the owner. Verify the real end-user journey
without changing the existing information architecture, component placement, or
blue/liquid-glass visual system. Fix only defects reproduced by the campaign or
security vulnerabilities supported by evidence.

## Test-data policy

- Test content, Tutor messages, quizzes, research interactions, sessions, and
  Focus Trail entries are deliberately retained in the controller account for
  owner inspection.
- The controller credentials are used only in a controlled browser session and
  are never written to source, logs, screenshots, fixtures, or commits.
- Do not run billing purchases, password resets, destructive user actions, or
  production-data deletion.

## Campaign stages

### 1. Service readiness

Probe the public backend, data API, Render liveness/health endpoints, and
Supabase schema connectivity. Record degraded providers separately from product
defects. Do not make paid provider calls merely to test a health endpoint; use
the real generation and Tutor flows below as the authoritative integration
checks.

### 2. Authenticated controller journey

Sign in through the rendered product. Confirm account/controller state, page
identity, no framework error overlay, console health, keyboard focus, and core
navigation. This validates the same browser-facing authentication path users
take rather than an API-only approximation.

### 3. Study workspace and Tutor AI

Create a clearly labelled test study source and generate study content. Verify
loading/progress feedback, resulting notes, citations/source grounding where
applicable, the right-side Tutor conversation, and error/retry behavior. Test
internet research only through visible product controls and validate that the
result is attributed and remains within the selected material context.

### 4. Study tools and companion

Exercise flashcards, quiz creation and answer/review states, study history,
adaptive companion, and visible tool controls. For each interaction, verify the
expected state change, usefulness of feedback, persistence where intended, and
desktop plus mobile usability. Fix any reproduced functional or interaction
defect in place; do not redesign the shell.

### 5. Focus Room

Enter the room, test scene/audio controls, timer states, drawers, Focus Trail,
session completion, keyboard/Escape behavior, reduced-motion behavior, light
and dark appearance, and persistence. Verify the Focus Trail records through
the live Supabase-backed data path.

### 6. Security audit and hardening

Run a repository-wide security scan with source-backed findings, then fix only
validated issues. Review authentication/session handling, authorization and
controller boundaries, Supabase/RLS exposure, input/upload boundaries, secrets,
HTTP headers/CORS, dependency health, and deployment configuration. Re-test
each fix and preserve all existing product behavior.

## Evidence and acceptance criteria

- Every live flow records: route, action, observed UI state, screenshot, and
  relevant browser console/network outcome.
- Use the existing automated suites as regression evidence after any fix.
- A flow passes only when the expected user-visible state occurs, there is no
  related unhandled console error, and the persistence/security boundary behaves
  as designed.
- Report external-provider outages/configuration failures explicitly rather than
  masking them as product passes.
- Final handoff contains pass/fail coverage, fixed defects, deliberately
  retained test records, security findings/remediations, health results, and
  remaining risks.

## Error handling and stop conditions

- For a reproducible defect, capture evidence, trace it to the smallest
  responsible component/service, repair it with a test-first regression check,
  then replay the live flow.
- Stop before any action that would alter billing, reset account access, delete
  existing data, or require new paid infrastructure authority.
- If a provider is unavailable, continue testing independent surfaces and mark
  that integration as blocked with its exact diagnostic.
