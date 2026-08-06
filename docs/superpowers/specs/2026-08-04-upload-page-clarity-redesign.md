# Upload Page Clarity Redesign

Date: 2026-08-04

## Objective

Redesign the Materials upload page so the first screen has one obvious purpose: add study sources. Remove the competing marketing labels and duplicate tutor action while preserving all upload, link, configuration, accessibility, and analysis behavior.

## Design read

This is a preserve-style redesign of an existing student product surface. The visual language should be calm, task-first, and professional, using the established Synapse blue and the existing application typography and icon family.

- Design variance: 4
- Motion intensity: 2
- Visual density: 4
- Theme: existing light and dark theme system
- Shape rule: soft 14-18px containers, pill treatment only for compact buttons where already established

## Current-state audit

### Preserve

- Synapse logo, side navigation, and Materials destination
- Existing form field IDs, control order, actions, keyboard behavior, and analytics-sensitive labels
- File drag and drop, file picker, online links, pasted notes, language, prompt mode, study depth, and Analyze with Synapse
- Existing status, success, error, file-preview, and link-preview behavior
- Current application color tokens, Bootstrap icon family, and theme infrastructure

### Retire

- The `AI Academic Tutor` pill above the page title
- The second `Materials` badge above the page title
- The oversized centered `Study Smarter` marketing headline
- The duplicate `Start with AI tutor` button, since Learning Companion is already available in primary navigation
- Decorative `Choose / Confirm / Analyze` steps inside the drop zone
- Excess vertical whitespace, oversized upload icon, and nested card-on-card treatment

## Selected approach

Use a task-first source workspace rather than a landing-page hero.

### Page header

- Left aligned within the same content width as the upload workspace
- Heading: `Add study materials`
- Supporting line: `Upload files, add links, or paste notes. Synapse will turn them into a connected study workspace.`
- No eyebrow, badge stack, tutor CTA, or decorative metadata

### Source workspace

The first card groups the two primary ways to add sources without hiding either one.

1. A compact but generous drag-and-drop region remains the dominant action.
2. The cloud icon becomes a smaller supporting marker.
3. The drop-zone heading becomes `Drop files here`.
4. File type guidance is reduced to one concise line.
5. `Select files` remains the only primary button in the empty state.
6. Upload status sits directly below the action with clear success and error surfaces.
7. Online links and pasted notes follow as plainly separated source methods, not nested promotional cards.

### Configuration and analysis

- Preserve current field order and IDs.
- Use consistent section spacing and a quieter border hierarchy.
- Keep the final `Analyze with Synapse` action full width and visually distinct.
- Do not hide existing configuration in an accordion because that changes discoverability and interaction behavior.

## Responsive behavior

- Desktop: content width remains constrained and left aligned; the source workspace uses the available width without oversized empty zones.
- Tablet: spacing compresses while preserving full-width inputs and drop-zone readability.
- Mobile: header, drop zone, link controls, settings, and analysis action form a single column. Button labels must not wrap.
- The first upload action remains visible within the initial viewport at common laptop sizes.

## Interaction states

- Empty: direct instruction and one primary file action
- Hover and drag-over: stronger border and subtle surface shift only
- Keyboard focus: visible focus ring with sufficient contrast
- Loading: preserve current status region and prevent layout jumps
- Success: green contextual status and persistent file preview
- Error: red contextual status with readable recovery guidance
- Dark mode: maintain the same hierarchy using semantic surface and text tokens
- Reduced motion: no essential behavior depends on animation

## Accessibility

- Preserve `dropZone` role, tab stop, and upload aria-label.
- Preserve live regions for upload and link feedback.
- Maintain form labels and field IDs.
- Ensure body copy and button contrast meet WCAG AA.
- Keep all primary interactions keyboard reachable.
- Do not rely on color alone for status.

## Implementation boundaries

- Primary component: `frontend/src/react/components/UploadStage.js`
- Primary styling: `frontend/styles/01-section.css`
- Theme compatibility may require a narrowly scoped adjustment in `frontend/styles/04-section.css` or `frontend/styles/99-dark-mode.css`.
- Update focused upload-shell regression tests to describe the new hierarchy.
- Do not change backend endpoints, upload parsing, controller actions, form field names, or navigation labels.

## Verification

1. Add focused source-level regressions for the retired and required elements.
2. Run existing upload, Companion-shell, user-feedback, account-theme, and workspace layout regressions.
3. Build the production bundle.
4. Open the production preview in Chrome at desktop and mobile widths.
5. Verify the empty state, file picker trigger, drag target, link input, pasted notes, settings, dark mode, keyboard focus, and final analysis action.
6. Inspect browser logs for errors introduced by the redesign.

## Success criteria

- The page communicates `add study sources` within one glance.
- Only one primary action competes for attention above the fold.
- The upload control appears substantially higher and requires less scrolling than before.
- No duplicated Materials identity or tutor action remains in the page content.
- All existing functionality and field contracts remain intact.
- Desktop, mobile, light, and dark states remain clear and usable.
