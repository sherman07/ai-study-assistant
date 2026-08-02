# Enhanced Focus Mode and Original Animated Scenes

**Date:** 2026-08-02  
**Status:** Approved design  
**Surface:** Synapse Focus Room setup and distraction-free Focus Mode

## Objective

Turn Focus Room into a dependable, copyright-safe study environment. Replace the eight selectable scene backgrounds with original Synapse artwork, give every scene a smooth and repeatable ambient-motion profile, improve the five sound-preset choices, and make Focus Mode more useful without making it visually noisy.

The finished experience must keep the user's current topic, study intention, timer, and progress understandable at a glance. Secondary controls appear only when the user moves the pointer, taps, focuses a control, or uses a keyboard shortcut.

## Scope

This project covers:

- Eight original scene backgrounds owned as project assets.
- Five priority scenes completed first, followed by three complementary scenes.
- Seamless code-driven ambient motion with static and reduced-motion fallbacks.
- Five icon-aligned audio presets with explicit active feedback and smooth audio transitions.
- An enhanced Focus Mode HUD with progressive disclosure.
- Quick-note and session-task interactions that remain local and resilient.
- Desktop, mobile, keyboard, accessibility, media-loop, and regression testing.
- A short sprint evidence report recording acceptance results and remaining limitations.

This project does not add social features, cloud music uploads, streaming-service integration, collaborative rooms, or AI-generated music.

## Copyright and Asset Ownership

All eight background artworks will be generated specifically for Synapse and saved under the project's Focus Room asset directory. Existing or reference-site background images and animations will not be shipped as scene media. The supplied screenshots are composition and interaction references only; they are not source assets.

Every generated background will:

- Avoid visible brands, logos, recognizable copyrighted characters, watermarks, and copied UI.
- Contain no embedded text that must remain legible.
- Be stored locally in the project with a descriptive stable filename.
- Include its final generation prompt in the delivery notes.

Audio remains a set of deliberately selected, properly licensed tracks and ambient recordings already represented in the product data. Attribution and license links remain accessible in the full sound mixer. No unlicensed audio will be added, and the UI will not imply that third-party licensed recordings are owned by Synapse.

## Scene System

### Sprint 1: five priority scenes

1. **Morning Window** — clear morning study desk, trees and soft daylight. Motion: slow foliage sway, restrained sun drift, subtle curtain movement. Audio: Soft Piano with light nature ambience.
2. **Garden Café** — quiet plant-filled café study table. Motion: rain traces or soft leaf movement, gentle lamp warmth, minimal steam. Audio: Lo-fi Café with low café rain.
3. **Tokyo Night** — elevated night desk overlooking a calm city. Motion: slow cloud drift, sparse window-light shimmer, occasional distant light movement. Audio: Deep Focus with restrained noise ambience.
4. **Snow Window Cabin** — warm desk inside a timber cabin during snowfall. Motion: layered snowfall, faint firelight or lamp variation, extremely slow camera drift. Audio: Warm Ambience with soft wind.
5. **Bamboo Cabin** — quiet pavilion looking into bamboo and water. Motion: bamboo sway, water shimmer, very slow mist movement. Audio: Nature Flow with forest or water ambience.

### Sprint 2: remaining scenes

6. **Cabin Twilight** — dusk cabin above a distant landscape. Motion: cloud drift, lamp warmth, subtle atmospheric haze. Audio: Soft Piano with light wind.
7. **Sunset Classroom** — empty classroom during a gentle sunset. Motion: changing window light, dust motes, slow curtain movement. Audio: Soft Piano with minimal room tone.
8. **Last Light Lounge** — quiet modern lounge during rain and fading daylight. Motion: window rain, restrained lamp variation, distant cloud movement. Audio: Warm Ambience with rain.

### Motion implementation

Each scene uses one original full-bleed artwork plus a declarative motion profile. The renderer provides slow camera movement and scene-specific code-native overlays such as rain, snow, mist, light, water shimmer, or foliage shadows. Animations use transform and opacity where possible to remain compositor-friendly.

Motion loops must return to their starting state without a visible jump. Different overlay cycles use compatible durations so repetition is not obvious during an ordinary focus session. No scene depends on an externally hosted video.

The background renderer will:

- Preload the selected scene before revealing it.
- Keep the previous scene visible until the next scene is ready.
- Crossfade between scenes without a black or empty frame.
- Render only the active scene's animated layers after transition cleanup.
- Pause decorative animation while the document is hidden.
- Resume from a valid state when the page becomes visible again.
- Use a static image when media loading fails.
- Disable decorative motion when `prefers-reduced-motion: reduce` is active.
- Reduce layer density on small screens and constrained devices.

## Audio Presets

The five right-rail icons become explicit presets instead of ambiguous one-off mappings:

| Icon meaning | Preset label | Music | Ambient layer | Intended use |
| --- | --- | --- | --- | --- |
| Piano keys | Soft Piano | Piano | Nature | Reading and reflective study |
| Music notes | Lo-fi Café | Lo-fi | Café Rain | Routine exercises and writing |
| Waves | Nature Flow | Deep Focus at a restrained level | Nature | Calm concentration |
| Cup | Warm Ambience | Minimal | Rain or café ambience | Evening study |
| Radio signal | Deep Focus | Deep Focus | White Noise | Difficult problem solving |

The selected preset has a persistent visual active state, `aria-pressed`, a descriptive tooltip, and a short visible label on selection. Changing presets crossfades audio. Repeated selection does not create duplicate playback channels. The full mixer continues to expose music and ambient volume independently, license/attribution details, and playback errors.

## Enhanced Focus Mode

### Persistent information

Focus Mode always presents a compact HUD containing:

- Current study topic from the selected material title.
- Current study intention from `studyGoal`.
- Remaining or elapsed time.
- Timer state and progress.
- Current Pomodoro number.

If the room was opened without a selected material, the topic falls back to “Focus Room” and the intention remains editable.

### Progressive controls

Secondary controls appear when any of these signals occurs:

- Pointer movement.
- Touch or pen interaction.
- Keyboard navigation or supported shortcut.
- Focus entering the HUD.

They fade after a short idle delay only when no control contains focus, no popover is open, and the controls are not pinned. Touch users can pin or unpin the controls. The always-visible timer/topic block does not disappear.

The revealed control set contains:

- Start, pause, and resume.
- Add five minutes.
- Skip to the next phase or start the break.
- Toggle room audio.
- Open the sound preset/mixer panel.
- Change scene.
- Open Quick Note.
- Open the current session task list.
- Pin or unpin controls.
- Exit Focus Mode.

Destructive or disruptive actions such as reset and end session remain outside the primary row or require confirmation.

### Keyboard behavior

- `Space`: start, pause, or resume the timer when focus is not in an editable control.
- `M`: mute or resume room audio.
- `N`: open Quick Note.
- `T`: open the session task list.
- `S`: open scene selection.
- `?`: open a shortcut reference.
- `Escape`: close the active popover first; if none is open, leave Focus Mode.

Shortcuts do not fire while typing in an input, textarea, select, or content-editable element. Buttons retain native Tab and Enter/Space behavior.

### Quick Note

Quick Note is a small focused editor for capturing a thought without leaving Focus Mode. It autosaves through the existing Focus Room draft mechanism and visibly confirms the save. Closing and reopening the note must preserve its content. It does not invoke AI or navigate away from the room.

### Session tasks

The task control shows the current study-plan items, progress, and a direct completion toggle. It reuses the existing store actions and does not duplicate task state. The compact HUD may show a small “completed / total” summary without exposing the full checklist while idle.

## Visual Design

The existing warm, photographic, glass-over-wallpaper direction remains. Focus Mode gains one stronger information hierarchy rather than more permanent chrome:

- Topic and timer form the single persistent focal surface.
- Revealed controls use the same circular icon language as the setup rail.
- Text labels appear on hover, focus, or inside opened panels; icon-only buttons retain accessible names.
- Glass opacity is strong enough to keep timer and topic readable against every scene.
- A restrained scene-specific foreground scrim is allowed for readability, but it must not flatten or recolor the generated artwork.
- Desktop controls stay near the HUD and avoid the center of the scene.
- Mobile controls become a reachable bottom sheet with safe-area spacing and no horizontal overflow.

## Component Boundaries

- `FocusBackground`: owns scene loading, transitions, visibility behavior, and static fallback.
- `SceneMotionLayer`: renders the declarative motion profile and reduced-motion alternative.
- `FocusModeHUD`: composes persistent session information and revealed controls.
- `FocusModeControls`: contains timer, audio, note, task, scene, pin, and exit actions.
- `FocusModePopover`: provides accessible note, task, scene, mixer, and shortcut surfaces.
- `AudioPresetRail`: renders the five named preset buttons and active feedback.
- Focus Room store: remains the source of truth for timer, material, goal, task, scene, note, and audio state.

The page component remains composition glue. It must not absorb the new interaction logic into one monolithic component.

## State and Failure Handling

- Scene and preset selection persist through the existing Focus Room draft/session flow.
- Re-entering Focus Mode preserves timer progress, note text, task state, selected scene, and sound configuration.
- Missing material data falls back to safe topic and goal labels.
- A failed visual asset leaves the last valid scene or its local poster visible and reports no blocking UI error.
- A blocked or failed audio source leaves the timer and room usable and displays the existing audio error message in the mixer.
- Repeated control activity resets one reveal timer instead of creating many timers.
- Event listeners, animation frames, and transition timers are cleaned up on unmount.

## Performance Requirements

- Original artwork should use an efficient web format at an appropriate desktop resolution with responsive sizing where useful.
- The active scene is the only scene running decorative animation after a transition.
- Animations favor `transform` and `opacity`; continuous layout and expensive full-screen filters are avoided.
- The UI remains responsive during scene changes and repeated Focus Mode entry/exit.
- No playback, animation, or reveal-control loop may accumulate listeners, DOM nodes, audio channels, or timers.
- The page must remain stable through at least 25 repeated scene changes and a sustained loop test covering multiple full animation cycles.

## Agile Delivery and Verification

### Sprint 1 — owned scene foundation

- Generate and validate the first five original scene assets.
- Add motion profiles and static/reduced-motion fallbacks.
- Replace the five preset mappings and add active feedback.
- Verify scene switching, audio crossfades, loop continuity, and responsive setup layout.

### Sprint 2 — complete scene set and Focus Mode

- Generate and validate the remaining three original scene assets.
- Add enhanced Focus Mode HUD, intent-based reveal, pinning, shortcuts, Quick Note, tasks, scene control, and sound control.
- Verify state persistence and repeated entry/exit.

### Sprint 3 — usability and regression proof

- Build and run the existing Focus Room regression suite.
- Add focused automated tests for motion profiles, preset semantics, shortcut guards, reveal-timer cleanup, persistent topic/goal, Quick Note, and task actions.
- Use the in-app browser to click the complete primary path on desktop and mobile-sized viewports.
- Test mouse, keyboard, and touch-equivalent behavior.
- Test reduced motion and document visibility changes.
- Perform repeated scene-switch and animation-loop stability tests.
- Capture implementation screenshots and compare them with the accepted visual concept.
- Write a concise sprint report with passed acceptance criteria, issues found, fixes made, and any intentional limitations.

## Acceptance Criteria

The work is complete when:

1. All eight selectable scenes use original local Synapse artwork and none use the current reference-site visuals or animations.
2. The five priority scenes and their paired audio presets are completed and verified before the remaining three scenes are integrated.
3. Every scene has smooth repeatable motion, a static fallback, reduced-motion behavior, and transition cleanup.
4. The five right-rail icons have semantically matched preset names, visible selection state, accessible state, and working audio configuration.
5. Focus Mode always shows the current topic, intention, timer, and progress.
6. Secondary controls reveal on pointer, touch, focus, or shortcut; hide safely; and can be pinned.
7. Timer, audio, add-time, phase skip, Quick Note, tasks, scene selection, shortcuts, and exit controls work from Focus Mode.
8. Editable fields suppress global shortcuts while the user is typing.
9. Repeated scene changes, repeated Focus Mode entry/exit, and sustained animation loops do not create visible glitches, duplicate audio, crashes, or accumulating runtime resources.
10. Desktop and mobile browser verification, automated regressions, accessibility checks, and the sprint evidence report pass without unresolved high-severity defects.

