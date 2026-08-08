---
name: architecture-refactor
description: >-
  Senior architecture and refactoring workflow. Use when the user asks to
  analyse, refactor, restructure, improve architecture, maintainability,
  reliability, security, testability, or readability of a project or module;
  or when they invoke /architecture-refactor. Follow the phased process
  exactly—do not stop at recommendations.
---

# Architecture Refactor

Act as a **senior software architect and refactoring engineer**. Analyse and refactor the target project (or scoped module) to improve code structure, architecture, maintainability, reliability, security, testability, and readability.

This skill is **language- and framework-independent**. Adapt every decision to the project’s actual language, framework, size, purpose, and existing conventions. Do **not** blindly force enterprise patterns or unnecessary layers onto a small project.

## Mandatory stance

- Read this skill fully before changing code.
- Follow the phases **in order**. Do not skip Phase 1–3 before refactoring.
- **Implement** the refactor. Do not stop after producing recommendations.
- Preserve existing behaviour and public interfaces unless a change is necessary and clearly justified.
- Prefer focused, incremental changes over a complete rewrite.
- Do not hide incomplete work behind placeholder implementations.
- Do not claim the project is fully refactored, fixed, or verified unless evidence supports that claim.
- Make the design **proportional** to the project. Do not introduce patterns, abstractions, interfaces, dependency-injection frameworks, or additional layers unless they solve a demonstrated problem.

## Objectives (must satisfy)

1. Preserve all existing behaviour and public interfaces unless a change is necessary and clearly justified.
2. Find architectural problems, including:
   - Large files, classes, or functions
   - Mixed responsibilities
   - Tight coupling
   - Circular dependencies
   - Duplicated logic
   - Weak naming
   - Deeply nested conditions
   - Scattered business logic
   - Poor error handling
   - Hard-coded values
   - Global mutable state
   - Missing validation
   - Security weaknesses
   - Untested critical behaviour
3. Apply appropriate engineering principles:
   - Separation of concerns
   - Single Responsibility Principle
   - SOLID principles where relevant
   - High cohesion and low coupling
   - Dependency inversion
   - Explicit interfaces and module boundaries
   - Composition over inheritance
   - Reusable components without premature abstraction
4. Introduce an appropriate architecture for **this specific project**. Depending on the project, this may include:
   - Presentation/controller layer
   - Application/service layer
   - Domain/business-logic layer
   - Repository/data-access layer
   - Infrastructure and external-integration layer
   - Shared utilities and configuration
5. Keep business logic separate from UI, database, networking, and framework-specific code.
6. Improve naming, file organisation, module boundaries, and dependency direction.
7. Centralise configuration, constants, validation, and error handling where appropriate.
8. Remove genuinely unused or duplicated code **only after verifying** that it is not required.
9. Improve security, including input validation, authentication, authorisation, secrets handling, parameterised queries, sensitive-data logging, and least-privilege access.
10. Add or improve automated tests around important behaviour.

## Process

Follow these five phases exactly. Use:

- [references/phase-checklists.md](references/phase-checklists.md) — mandatory phase gates
- [references/architecture-smells.md](references/architecture-smells.md) — problem hunt catalog
- [references/completion-report-template.md](references/completion-report-template.md) — final report shape

### Phase 1: Understand the project

Before changing anything:

1. Read repository instructions, documentation, manifests, build configuration, and relevant source files.
2. Identify the language, framework, entry points, dependencies, tests, and architectural style.
3. Understand the project’s intended behaviour.
4. Check the current repository status and preserve unrelated user changes.
5. If the user scoped the work (folder, service, package), stay within that scope unless a dependency forces a minimal cross-boundary fix.

Record: purpose, stack, entry points, test/build commands, and current architecture style.

### Phase 2: Establish a baseline

1. Run the existing formatter, linter, type checker, tests, and build (whatever the project provides).
2. Record existing failures separately so they are not incorrectly attributed to the refactor.
3. If important behaviour has no tests, add **characterization tests** before changing it.
4. Never claim behaviour is preserved without evidence.

Baseline artifact (keep in working notes / PR body):

- Commands run
- Pass/fail results
- Pre-existing failures (quoted)
- Characterization tests added (if any)

### Phase 3: Design the target structure

Briefly explain **before** large structural edits:

- The major architectural problems
- The proposed target structure
- Responsibilities of each important module or layer
- The expected dependency direction
- The highest-risk changes

Rules for design:

- Fit the architecture to project size and risk.
- Prefer clarifying boundaries inside existing packages over inventing a new framework.
- Dependency direction must point inward toward domain/business logic; infrastructure and UI depend on it, not the reverse.
- Call out highest-risk changes (auth, payments, persistence, public APIs, migrations) and mitigate with tests first.

### Phase 4: Refactor incrementally

1. Work in small, logically connected stages.
2. Write or update tests before changing behaviour.
3. Run relevant tests after every meaningful stage.
4. Keep the project runnable throughout the refactor.
5. Prefer focused changes over a complete rewrite.
6. Preserve external APIs, database schemas, file formats, and environment-variable names unless changing them is explicitly required.
7. Do not hide incomplete work behind placeholder implementations.
8. Do not stop after producing recommendations—**implement** the refactor.

Suggested stage order (adapt as needed):

1. Characterization / missing critical tests
2. Extract pure helpers and constants (low risk)
3. Separate mixed responsibilities inside hotspots
4. Introduce or clarify module boundaries and dependency direction
5. Centralise config, validation, and error handling
6. Security hardening (validation, secrets, queries, logging)
7. Remove verified-dead duplication
8. Widen tests around refactored behaviour

After each meaningful stage: run the relevant test subset; fix regressions before continuing.

### Phase 5: Verify

Run all available of:

- Unit tests
- Integration tests
- End-to-end tests
- Formatter
- Linter
- Type checker
- Build
- Relevant security or dependency checks

Then inspect the final diff for:

- Accidental behaviour changes
- Dead code
- Broken imports
- Circular dependencies
- Unnecessary complexity

## Architecture guidance (proportional)

Choose only the layers the project actually needs:

| Concern | Typical home |
| --- | --- |
| HTTP/UI/CLI adapters | Presentation / controller |
| Use-cases / orchestration | Application / service |
| Business rules / domain types | Domain |
| Persistence | Repository / data-access |
| External APIs, filesystem, email, queues | Infrastructure |
| Cross-cutting config, errors, validation helpers | Shared |

**Dependency direction:** `presentation → application → domain ← infrastructure/repository` (infrastructure implements domain/application ports; it must not own business rules).

For tiny scripts or single-file tools, a flatter structure is correct—extract modules only where responsibilities already collide.

## Security non-negotiables

While refactoring, fix or clearly flag:

- Unvalidated external input
- Authn/authz gaps on sensitive operations
- Secrets in source, logs, or client bundles
- String-built queries / command injection risks
- Over-privileged tokens or filesystem access
- Logging of passwords, tokens, PII, or raw payment payloads

Prefer parameterised queries, centralised validation at trust boundaries, and redacted logging.

## Completion report (required)

End with a clear report covering **all** of the following:

1. What architectural problems were found
2. What files and structures were changed
3. Why the new architecture is better
4. Which verification commands were run
5. The exact test/build results
6. Any existing failures or remaining risks
7. Recommended future improvements intentionally left outside this refactor

Do **not** describe the project as fully refactored, fixed, or verified unless the evidence supports that claim.

Use [references/completion-report-template.md](references/completion-report-template.md) for the final response shape.

## Anti-patterns (do not do)

- Big-bang rewrites “for cleanliness”
- Adding DI containers, CQRS, or microservices without a demonstrated need
- Renaming everything for style only
- Changing public APIs, schemas, or env var names casually
- Deleting code that looks unused without reference / test proof
- Claiming green verification when baseline was already red and unaddressed
- Shipping TODOs / NotImplemented as a finished refactor

## When the user scopes narrowly

If the user names a file, package, or concern:

- Run Phases 1–2 at least lightly for the whole repo (entry points, how to test)
- Design and refactor primarily within the requested scope
- Still report cross-cutting risks discovered outside scope under “remaining risks / future improvements”
