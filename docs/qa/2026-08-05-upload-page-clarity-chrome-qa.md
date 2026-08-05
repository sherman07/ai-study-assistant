# Upload Page Clarity Chrome QA

Date: 2026-08-05

Branch: `codex/upload-page-redesign`

## Scope

Production-build verification of the Materials upload home in Chrome, covering visual hierarchy, source controls, keyboard focus, responsive behavior, and the empty-learning sidebar state.

## Test environment

- Vite production build served from `http://127.0.0.1:5179/frontend/index.html`
- Desktop viewport: 1440 x 900
- Mobile viewport: 390 x 844
- Resolved appearance during live QA: dark
- Light-theme safety covered by semantic theme tokens and the theme regression suite

## Feedback rounds

### Round 1: visual hierarchy

- Confirmed one task heading: `Add study materials`.
- Confirmed the retired `AI Academic Tutor`, `Study Smarter`, and `Start with AI tutor` hero elements are absent from the upload page.
- Confirmed file upload is the first and only primary action above the fold.
- Confirmed links, pasted notes, language, prompt mode, study depth, and analysis remain in the original workflow order.

Result: pass.

### Round 2: control interaction

- Added `https://example.com/study-guide`; the input cleared and a source chip appeared.
- Entered a pasted study note and confirmed the textarea retained the complete value.
- Changed output language to English.
- Changed prompt mode to Tutor Mode.
- Changed study depth to Deep Study.
- Clicked Select files and confirmed Chrome opened a native file chooser.

Result: pass. Chrome's automation security policy rejected programmatic fixture injection, so no file was transmitted and the picker was cancelled.

### Round 3: usability and accessibility

- Keyboard navigation reached Select files, the hidden file input, and the drop zone in the expected order.
- The drop zone displayed a 3 px visible focus ring with a 3 px offset.
- Desktop layout had no horizontal overflow at 1440 x 900.
- Mobile layout had no horizontal overflow at 390 x 844; the Add action stacked below the link field and remained full width.
- Mobile showed the heading, upload action, status guidance, and online-source entry in a clear single-column flow.

Result: pass.

### Round 4: Chrome-found refinement

Chrome exposed an oversized empty-history call to action in the left rail. The grid item was stretching from 85 px of content to 441 px of available space, making the 36 px action render as a 214 px block.

Added intrinsic grid alignment to `.history-empty-state` and regression coverage. Re-tested in Chrome:

- empty state height: 85 px
- `Upload material to start` button height: 36 px
- alignment: start / start

Result: fixed and passed.

## Console review

No upload-redesign-specific runtime failure was observed. The local preview reported pre-existing environment warnings for multiple Supabase auth clients and an unavailable backend at `127.0.0.1:3001`; these do not originate from this UI change.

## Automated verification

- Upload-stage clarity regression
- Upload-stage form regression
- User-feedback regression
- Companion-history regression
- AI learning-companion shell regression
- Account-menu regression
- Theme-system regression
- Workspace-nav responsive regression
- Production Vite build

All passed.

The portable frontend suite now skips Puppeteer probes that require an optional Linux Chrome environment; those probes remain available through `pnpm run test:frontend:chrome`. Live upload-page Chrome coverage for this change was completed through the connected desktop browser.
