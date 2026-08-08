# Phase checklists

Use these checklists while executing the skill. Mark items mentally or in PR notes; do not invent progress you did not complete.

## Phase 1 — Understand

- [ ] README / CONTRIBUTING / AGENTS / docs read
- [ ] Package manifests and lockfiles identified
- [ ] Language(s), framework(s), runtime versions noted
- [ ] Entry points mapped (CLI, HTTP, workers, UI roots)
- [ ] Test runner and build scripts identified
- [ ] Existing architectural style described in one short paragraph
- [ ] Unrelated dirty/uncommitted work noted and preserved
- [ ] Scope confirmed (whole repo vs package/module)

## Phase 2 — Baseline

- [ ] Formatter run (if present)
- [ ] Linter run (if present)
- [ ] Type checker run (if present)
- [ ] Unit / integration / e2e tests run (as available)
- [ ] Build / package step run (if present)
- [ ] Pre-existing failures recorded verbatim
- [ ] Characterization tests added for untested critical behaviour
- [ ] Baseline evidence saved for the completion report

## Phase 3 — Design

- [ ] Major architectural problems listed (evidence-backed)
- [ ] Target structure sketched (folders/modules/layers)
- [ ] Responsibilities per important module stated
- [ ] Dependency direction stated
- [ ] Highest-risk changes called out
- [ ] Design kept proportional (no unjustified enterprise layers)

## Phase 4 — Incremental refactor

For each stage:

- [ ] Stage goal stated
- [ ] Tests written/updated before behaviour change
- [ ] Change kept small and cohesive
- [ ] Relevant tests re-run
- [ ] Project still runnable
- [ ] Public APIs / schemas / env names preserved (or justified)
- [ ] No placeholder / stub “completion”

Problem hunt reminders:

- [ ] Large files / classes / functions addressed or deferred with reason
- [ ] Mixed responsibilities split where it paid off
- [ ] Coupling / cycles reduced
- [ ] Duplication removed only after verification
- [ ] Naming and module boundaries improved
- [ ] Nested conditionals flattened where clarity improved
- [ ] Business logic pulled out of UI/DB/network/framework code
- [ ] Error handling and validation centralised where appropriate
- [ ] Hard-coded values moved to config/constants when justified
- [ ] Global mutable state reduced
- [ ] Security weaknesses mitigated
- [ ] Tests added around important behaviour

## Phase 5 — Verify

- [ ] All available unit tests
- [ ] All available integration tests
- [ ] All available e2e tests
- [ ] Formatter
- [ ] Linter
- [ ] Type checker
- [ ] Build
- [ ] Security / dependency checks if available
- [ ] Final diff reviewed for accidental behaviour change, dead code, broken imports, cycles, needless complexity
- [ ] Completion report filled with exact commands and results
