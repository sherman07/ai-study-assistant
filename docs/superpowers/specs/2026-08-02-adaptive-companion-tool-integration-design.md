# Adaptive Companion Tool Integration Design

## Decision

Synapse Learning Companion will be a teaching-first, evidence-driven learning environment rather than a permanent launcher for study tools. No quiz, flashcard, teach-back, key-points, broadcast, notes-practice, mind-map, visual-guide, study-path, exam-readiness, or focus-session action appears on a new companion screen. The learner begins through normal conversation. Synapse teaches, diagnoses, and gathers evidence, then makes only the functions that fit the learner's current state available.

This policy is shared by every companion thread, class, topic, restored session, and material-backed conversation. It is not a conditional visual treatment in one component.

The existing Materials engines remain the implementation source for generated study artifacts. Companion provides a different orchestration and presentation layer: it selects context and sensible defaults, bypasses setup/landing screens, generates the real artifact, and renders the interactive result directly in the conversation.

## Product invariants

1. **Teaching before tooling.** A new Companion contains conversation, New chat, and Send. It has no function-labelled starter cards or permanent study-tool dock.
2. **Function-specific readiness.** Readiness is evaluated independently for every function. There is no global `mastery >= N` unlock and no "conversation exists" shortcut.
3. **Evidence before visibility.** An action is visible only when its validated readiness record is `eligible`. Locked actions are absent, not disabled teasers.
4. **Explicit requests are evaluated, not blindly obeyed.** "Quiz me" or "make flashcards" records the requested intent. If prerequisites are satisfied, the real activity launches immediately. Otherwise Synapse teaches, clarifies, or runs one small diagnostic and reassesses later.
5. **Real integrations only.** A generated or interactive function may not be replaced with a canned learner prompt. Teach-back, key points, and readiness reports must be first-class artifacts with stored results.
6. **No generation front pages.** Companion never shows "Generate quiz," "Generate flashcards," settings launch cards, or exam-readiness preparation pages after the action is selected. It uses policy-approved defaults and opens the activity itself.
7. **Honest sources.** Conversation, Materials, and hybrid contexts remain distinguishable. A request for notes-based practice must never silently become conversation-only practice.
8. **Performance closes the loop.** Answers, confidence ratings, explanations, skips, and activity completion update learning evidence and influence subsequent teaching and unlock decisions.
9. **Failure does not erase learning.** Every generation or interaction error is retryable without duplicating requests, user messages, artifacts, or progress.
10. **No regression of chat reliability.** New chat, saved conversations, retry, keyboard behavior, local persistence, responsive layout, and accessible announcements remain intact.

## Chosen architecture

Use a hybrid policy engine: the tutor model proposes pedagogical judgments and candidate actions; deterministic code validates prerequisites and controls visibility and launch.

The alternatives are rejected as primary control mechanisms:

- **Model-only suggestions** are flexible but inconsistent. They can expose unsupported actions or make a tool appear because the learner named it.
- **Fixed score thresholds** are predictable but flatten different learning needs into one number. A learner may be ready for a key-points artifact but not an exam simulation.

The hybrid design keeps pedagogical flexibility while enforcing source, evidence, and interaction guarantees.

## Companion readiness model

The versioned thread stores a compact `learningContext` plus a bounded readiness map. Each tool entry has the following normalized shape:

```json
{
  "tool_id": "quiz",
  "status": "locked | eligible | active | completed | cooldown",
  "reason": "Short learner-facing reason shown only when eligible",
  "evidence": ["concept-explained", "successful-recall"],
  "missing": ["topic-scope"],
  "source_strategy": "conversation | materials | hybrid | none",
  "source_ids": ["material-id"],
  "launch": "suggest | auto",
  "configuration": {},
  "recheck_after": "assistant_turn | learner_attempt | artifact_result"
}
```

The browser never trusts this object directly from the model. The backend normalizes the proposal against a server-owned tool registry and the available evidence/source bundle. The frontend performs a final catalog and capability check before rendering or launching.

### Evidence vocabulary

Evidence is bounded and observable. Initial categories include:

- `topic-identified`
- `goal-identified`
- `material-context-available`
- `material-context-selected`
- `content-taught`
- `worked-example-seen`
- `learner-attempted`
- `successful-recall`
- `successful-application`
- `teachback-complete`
- `misconception-identified`
- `misconception-repaired`
- `sufficient-content-volume`
- `multi-concept-structure`
- `assessment-goal`
- `time-constraint-known`

Evidence records contain a tool-independent type, topic/subskill, source turn or artifact ID, confidence, and timestamp. The UI never exposes hidden confidence numbers or diagnosis labels.

### Validation policy

The model may recommend a tool and explain its reasoning. Deterministic validation then applies:

- Reject unknown tools, sources, evidence types, or configurations.
- Reject duplicate or stale recommendations.
- Reject Materials-dependent actions without the selected material context.
- Reject assessment actions without a scoped topic or assessment target.
- Reject recall artifacts when there is insufficient content to generate meaningful items.
- Limit the visible recommendation set to the smallest useful choice, normally one and never more than three.
- Prefer the least disruptive tool that answers the current learning need.
- Preserve explicit learner intent so a requested tool can auto-launch as soon as it becomes eligible.

## Function registry

The registry is the single source of truth for readiness, context selection, generation, rendering, result capture, and recovery. Existing Materials functions that are meaningful in Companion are included rather than being hard-coded in the chat component.

| Function | Minimum readiness evidence | Source policy | Direct Companion result | Feedback into learning state |
| --- | --- | --- | --- | --- |
| Quiz | Scoped topic plus sufficient taught/material content; diagnostic evidence when the scope is unclear | Conversation, selected Materials, or explicit hybrid | One question at a time with real question types, answer checking, explanation, progress, and completion summary | Correctness, misconception, difficulty, skips, response progression |
| Flashcards | Sufficient stable concepts/facts or selected Materials | Conversation, selected Materials, or explicit hybrid | Real flip deck with previous/next and Again/Hard/Good/Easy confidence controls | Recall confidence, repeated difficulty, completed cards, review candidates |
| Teach-back | At least one concept has been taught or selected | Conversation or selected Materials | A structured explanation attempt followed by AI grading, specific gaps, enriched explanation, and one follow-up | Explanation quality, misconceptions, repaired gaps |
| Key points / revision note | A coherent topic or selected source exists | Conversation, selected Materials, or explicit hybrid | Saved, source-labelled revision artifact rather than a pasted prompt | Topics consolidated, unresolved gaps, artifact reopened/saved |
| AI Broadcast | Coherent content and enough substance for an audio lesson | Conversation, selected Materials, or explicit hybrid | Reuse the actual broadcast generation/playback experience, including playable output when the backend supplies audio | Playback/completion and follow-up requests; no fake listening evidence |
| Mind Map | Multiple related concepts with an identifiable structure | Conversation, selected Materials, or explicit hybrid | Reuse the interactive mind-map renderer in the conversation surface | Opened branches and concepts selected for clarification |
| Visual Guide | A genuinely visual or process-oriented concept with usable content | Selected Materials or supported conversation context | Reuse generated visual-guide cards/gallery directly | Viewed items and requested clarifications |
| Study Path / Timeline | Goal and meaningful sequence/dependencies are known | Conversation plus optional Materials | Structured, editable path/timeline artifact without a generation landing card | Started/completed steps, replanning signals, changed availability |
| Exam Readiness | Assessment goal plus enough observable practice evidence | Learning evidence plus optional Materials | Direct readiness report with evidence, limits, weak areas, and recommended next action | Snapshot stored; weak areas influence teaching and practice |
| Focus Session | A concrete next task/material and useful duration are known | Current context and selected Materials | Start the relevant focused activity without returning through generic setup when safe | Session completion, activity results, next-step recommendation |

Quiz and flashcards use one learner-facing action each. `quiz_from_notes` and `cards_from_notes` stop being separate visible tools. Source strategy is an internal launch plan and is described honestly in the resulting artifact.

## Tutor response contract

`POST /learning-companion/respond` retains the learner-facing reply and adds validated learning and tool-policy output:

- `turn_mode`
- `learning_context`
- `evidence_updates`
- `tool_readiness_updates`
- `launch_tool` when an explicitly requested function is now eligible
- `suggested_tools` for contextual actions that should be offered but not automatically started
- current grounding/citation metadata

The prompt instructs the tutor to answer direct conceptual questions, teach the smallest useful unit, ask only one diagnostic/practice question at a time, and propose tools only when supported by observable evidence. The normalizer remains authoritative if model JSON is incomplete or contradictory.

If the model request fails, the browser keeps the learner message, prior readiness map, and artifacts. It must not recover by revealing a permanent default toolbar.

## Companion orchestration

The large chat component will be split into bounded units:

- `companionToolRegistry`: catalog, prerequisites, defaults, and result adapters.
- `companionReadiness`: normalization, evidence reduction, candidate validation, visibility selection, and launch planning.
- `companionPracticeClient`: calls the existing generation endpoints with Companion context and normalized settings.
- `CompanionArtifact`: selects the correct first-class renderer.
- Function renderers for quiz, flashcards, teach-back, revision note, broadcast, mind map/visuals, path, readiness, and focus handoff.
- `CompanionWorkspace`: conversation state, sending/retry, persistence, and orchestration only.

This keeps tool rules testable without rendering React and prevents future functions from bypassing readiness by adding another permanent button.

## Entry and visibility behavior

### New conversation

- Show the welcome message, composer, Send, and New chat.
- Do not show tool-labelled starter cards, tool dock placeholders, disabled tool teasers, or the message that tools are "one tap away."
- Generic teaching copy may explain that Synapse will teach and adapt, but it must not advertise a list of locked functions.

### Ordinary teaching

- Tutor replies may include natural follow-up actions such as "Show another example" when they continue the lesson.
- Study functions appear only on the latest relevant assistant turn and/or the compose action area after deterministic validation.
- Old unlocked actions become inert or disappear when their readiness record is stale, active, or completed.

### Explicit function request

1. Record the requested function and intended scope.
2. Evaluate available topic, evidence, and sources.
3. If eligible, return `launch_tool` and generate/render the real artifact directly.
4. If not eligible, explain the smallest missing prerequisite through teaching or one diagnostic question. Do not show the locked action.
5. Reevaluate after the next relevant learner attempt or teaching turn and auto-launch when eligibility is achieved, unless the learner changes direction.

### Suggested function

When the learner did not explicitly request a function, expose at most the smallest useful eligible set. Clicking one creates a launch transaction and immediately shows function-specific progress followed by the artifact, without an intermediate settings or generate page.

## Source and configuration behavior

Each launch transaction freezes its source strategy, source IDs/fingerprint, conversation turn range, normalized configuration, request ID, and triggering readiness evidence. This prevents a delayed response from using a newer unrelated conversation.

The orchestration selects sensible defaults from the learner's goal and context:

- language follows the current material/account preference;
- difficulty follows demonstrated evidence, not self-confidence alone;
- quiz size is small by default and adaptive;
- flashcard count matches content volume rather than always requesting six;
- exam mode requires an assessment goal or explicit request;
- broadcast length follows available content/time;
- visual and map functions require content suited to those formats.

The generated artifact states whether it used the conversation, named Materials, or a hybrid. If a required source becomes unavailable, generation stops with an actionable source-specific error; it does not silently substitute another context.

## Activity feedback loop

Every renderer emits normalized events such as:

- `artifact_started`
- `question_answered`
- `answer_checked`
- `card_rated`
- `teachback_submitted`
- `artifact_completed`
- `artifact_abandoned`
- `generation_failed`
- `retry_requested`

An event adapter reduces those events into learning evidence, misconception/review candidates, and readiness updates. The next tutor request receives a bounded summary rather than raw UI state.

Quiz operates one question at a time. A checked answer receives clear correctness and explanation before the next question. Difficulty may adjust after evidence, but already generated questions remain stable.

Flashcards include confidence ratings and persist card progress. A flip alone is not mastery evidence. Difficult cards become review candidates.

Teach-back explicitly grades what was correct, missing, or jargon-only, supplies an enriched explanation, and asks at most one follow-up.

Exam readiness is an evidence report, not a motivational percentage. It names the evidence used, the evidence missing, and the highest-value next action.

## Persistence and concurrency

The thread schema version advances and stores:

- bounded chat messages;
- learning context and evidence;
- readiness by tool;
- pending explicit intent;
- artifact descriptors and progress snapshots;
- in-flight launch transaction metadata;
- last successful/failed action for safe retry.

Only one generation launch may be active per thread. Repeated clicks, Enter presses, retries, or late network responses use idempotency/request IDs to avoid duplicates. Starting a new chat archives the old thread and clears readiness, pending intent, and in-flight work for the new thread.

## Error handling

- Tutor timeout: preserve the learner message and retry the tutor turn only.
- Tool generation timeout: preserve readiness and the launch transaction; retry the same tool/source configuration without appending a fake learner message.
- Missing Materials: explain which named material is unavailable and offer to continue teaching; do not switch sources automatically.
- Malformed artifact: show a tool-specific retry state and keep the last valid activity.
- Persist failure: do not claim an activity was saved; keep the in-memory state long enough to retry.
- Stale response: discard or quarantine it using thread and request IDs rather than attaching it to the active conversation.
- Partial backend capability: hide functions whose real renderer/generator is unavailable; do not replace them with prompt imitations.

## Migration from the existing companion tools branch

The remote companion implementation at commit `a89bfda` supplies reusable generation adapters and initial in-chat quiz/flashcard rendering, but it is not accepted as-is. Migration must specifically correct these behaviors:

- remove `Quiz me` and `Make flashcards` from first-screen starters;
- remove soft intent recovery that unlocks a button solely because the learner named it;
- replace the coarse `suggested_tools` list with validated per-function readiness;
- remove duplicate notes variants from learner-facing buttons;
- replace prompt-mode Teach-back and Key points with real artifacts;
- reuse the full Materials interaction behavior rather than simplified substitutes;
- upgrade broadcast from an outline-only panel to the available real playback experience;
- integrate the rest of the registered functions;
- preserve exact source strategy and activity results;
- make timeout retry tool-specific and idempotent.

The integration should bring the relevant companion commits onto the current branch carefully rather than overwriting unrelated workspace work. Existing user changes in `server/src/config.js` and `server/tests/auth-config.test.js` are out of scope and must remain untouched.

## Testing and iterative user feedback

Testing is a product loop, not a final checkbox. Each round records findings, severity, observed evidence, corrective change, and rerun result.

### Automated policy tests

- A fresh thread returns no visible study functions.
- A first-turn direct quiz/flashcard/other request does not unlock solely from keywords.
- A well-scoped advanced learner request can auto-launch when evidence/context is already sufficient.
- Every function accepts the minimum supported evidence and rejects each missing prerequisite.
- One function may be eligible while another remains locked.
- Materials-dependent tools reject missing or stale sources without fallback.
- No response can expose unknown, duplicate, stale, or more than three suggested functions.
- Readiness, pending intent, artifacts, and results persist and reset correctly.
- Activity events update evidence and affect later readiness.
- Retry is idempotent and late responses cannot contaminate a new thread.

### Contract and integration tests

- Backend prompt/normalizer contract for evidence and readiness.
- Existing Materials quiz, flashcard, broadcast, mind-map, visual, path, and readiness adapters receive the intended source/configuration.
- Companion bypasses all setup/launch pages.
- Real renderers support the core interactions and produce normalized feedback events.
- Prompt-based Teach-back/Key points substitutions are absent.
- Existing Companion chat persistence, history, source grounding, and error recovery remain green.

### Browser usability rounds

Use the Browser plugin for rendered validation. The flow under test is: open Companion -> learn or establish evidence -> appropriate function becomes available or auto-launches -> use the real activity -> receive feedback -> observe the next teaching/readiness state.

**Round 1: visibility and comprehension**

- New learner with no topic.
- Learner asking for each function immediately.
- Learner needing teaching before practice.
- Advanced learner supplying enough context for immediate practice.
- Verify that learners do not see premature tools and understand the next teaching action.

**Round 2: full function interaction**

- Exercise every registered function through its real UI.
- Correct, partial, incorrect, skipped, repeated, abandoned, and completed paths.
- Conversation, Materials, and hybrid source strategies.
- Verify that artifact interaction changes subsequent tutoring/readiness.

**Round 3: recovery, persistence, and accessibility**

- Tutor timeout, generator timeout, malformed response, missing Materials, retry, duplicate click, and new-chat race.
- Restore saved conversations and partially completed artifacts.
- Desktop and narrow mobile viewports, keyboard-only use, focus return, live announcements, reduced motion, clipping, overflow, and scroll behavior.

**Round 4: regression and feedback-driven refinement**

- Rerun every corrected journey.
- Compare screenshots, DOM state, console health, network calls, persisted state, and wording against the acceptance criteria.
- Record remaining risks and do not claim completion while a high-severity readiness, source-integrity, duplicate-request, or activity-blocking issue remains.

The feedback log may be temporary QA output outside the repository unless the user asks to preserve it. Automated regression coverage for every corrected defect remains in the repository.

## Acceptance criteria

The work is complete only when fresh automated and browser evidence proves all of the following:

1. No study-function buttons or function-labelled starter cards appear in a fresh Companion.
2. Every existing Companion class/thread uses the same centralized readiness policy.
3. Each registered function has independent, evidence-backed visibility and launch rules.
4. Explicit requests are either directly launched with sufficient evidence or handled through teaching/diagnosis without premature controls.
5. Quiz, flashcards, teach-back, key points, and all other registered functions are real integrations rather than canned prompts.
6. Selected actions bypass generation/setup front pages and render the activity itself.
7. Conversation, Materials, and hybrid sources remain explicit and never silently substitute for one another.
8. Activity performance updates teaching context and later readiness.
9. Generated artifacts and progress reopen safely; New chat starts cleanly.
10. Timeouts and failures are tool-specific, retryable, idempotent, and non-destructive.
11. Multiple usability rounds cover the requested personas, functions, outcomes, viewports, persistence, and error states.
12. All focused tests, the complete frontend regression suite, relevant backend tests, build, console checks, and rendered interaction checks pass, with remaining risks reported honestly.

## Out of scope

- Replacing the existing generation models or introducing a second generation backend.
- A new public course marketplace or standalone LMS dashboard.
- Cross-user social comparison or public mastery rankings.
- Pretending that simulated browser personas are recruited human research participants. The implementation will perform rigorous scenario-based usability evaluation and will distinguish it from external participant research.
