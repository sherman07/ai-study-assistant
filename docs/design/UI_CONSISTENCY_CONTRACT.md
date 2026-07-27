# Synapse UI Consistency Contract

All page UI subagents must follow this contract. Focus Room is the only visual exception and keeps its liquid-glass immersion.

## Subagents (`.cursor/agents/`)

| Invoke | Owns |
|---|---|
| `/ui-page-orchestrator` | Cross-page coordination |
| `/page-landing` | Landing |
| `/page-workspace` | Study workspace |
| `/page-focus-room` | Focus Room (liquid glass) |
| `/page-login` | Login |
| `/page-signup` | Signup |
| `/page-forgot-password` | Forgot password |
| `/page-reset-password` | Reset password |
| `/page-verify` | Verify email |
| `/page-pricing` | Pricing |
| `/page-billing-success` | Billing success |
| `/page-billing-cancel` | Billing cancel |
| `/page-privacy` | Privacy |
| `/page-terms` | Terms |
| `/page-404` | 404 |

## Brand & product

- Brand: **Synapse** — cinematic, intelligent, calm study assistant.
- Preserve the Synapse logo (`/logos/synapse.png`), product name, and blue soft-light identity.
- Primary accent stays Synapse blue (`#4a7cff` / theme tokens in `frontend/styles/00-theme.css`).
- Do not invent a new brand system. Extend existing tokens; do not hardcode one-off palettes per page.

## Scope boundaries (hard rules)

1. **UI/UX only.** Keep every current feature, route, form field, API call, auth flow, billing hook, and data binding.
2. **No logic rewrites.** Do not change backend contracts, Supabase calls, Stripe flows, or controller behavior.
3. **No content meaning changes.** Copy may be refined for clarity/hierarchy only when it improves UX; do not alter product claims or legal meaning on privacy/terms.
4. **Shared chrome must match** across marketing/auth/billing pages: logo treatment, nav density, button shapes, form field styling, spacing rhythm, focus rings, and footer/legal link patterns.
5. **Focus Room exception:** `frontend/focus-room.html` and `frontend/src/focus-room/**` keep the liquid-glass design. Polish glass readability, alignment, and motion — do not restyle Focus Room to look like landing/auth cards.

## Human design (avoid AI-default aesthetics)

Research and reject generic “AI product” looks. Prefer quiet, human editorial craft.

### Forbidden / avoid

- Purple-on-white or purple→indigo default gradients as the main identity
- Warm cream + terracotta + generic serif “AI landing” clichés
- Broadsheet newspaper layouts with dense hairline columns
- Glow spam, neon borders, multi-layer drop shadows, emoji decoration
- Pill clusters, fake metric strips, floating badge stickers, promo chips on heroes
- Card grids used as decoration (cards only when they contain a real interaction)
- Inset hero media cards, collage tiles, or side-panel heroes on marketing pages
- Dark-mode-only thinking; support light and dark via existing theme tokens
- Inter/Roboto/Arial as a new intentional brand face when expressive alternatives already exist in the product

### Prefer

- One clear composition per viewport; one job per section
- Real study context as visual anchor (product UI, sources, calm focus scenes) — not abstract blobs alone
- Generous spacing, readable type hierarchy, restrained motion (2–3 purposeful motions max per surface)
- Theme CSS variables from `frontend/styles/00-theme.css`, `landing.css`, `landing-auth.css`, `billing-pages.css`
- Visible focus states, keyboard paths, reduced-motion fallbacks
- Alignment that feels hand-tuned: consistent gutters, baseline rhythm, optical centering of forms and CTAs

## Shared layout tokens (non–Focus Room)

| Concern | Expectation |
|---|---|
| Max content width | Align to existing shells (~1180px marketing; auth card centered; billing shell shared) |
| Radius | Prefer existing `--radius-*` / auth/billing radii; do not invent random roundness |
| Buttons | Primary = Synapse blue fill; secondary = quiet outline/ghost; same height/padding family |
| Forms | Matching label → input → helper/error stack; identical input height/radius/focus ring |
| Nav | Logo left, primary links right; same back-to-home pattern on auth pages |
| Motion | Short ease (`cubic-bezier(0.22, 1, 0.36, 1)` or existing); respect `prefers-reduced-motion` |

## Testing checklist (required after every UI change)

Run against the owned page at **desktop (~1440)** and **mobile (~390)**:

1. Page loads without console errors related to your changes.
2. Primary landmarks are optically centered / balanced (hero, forms, billing cards, empty states).
3. Interactive controls still work (links, forms, toggles, theme if present, checkout CTAs, auth submits UI-side).
4. No horizontal overflow; no clipped text; no overlapping layers.
5. Light and dark themes still read correctly when the page uses the theme system.
6. Keyboard: tab order sensible; focus rings visible.
7. Screenshot pass: first viewport reads as one composition and still looks like Synapse after mentally removing nav chrome.

Report: what changed, what was verified, what was left alone (features/logic).

## Page ownership map

| Page | Entry | Primary sources |
|---|---|---|
| Landing | `frontend/landing.html` | `frontend/src/landing/**` |
| Study workspace | `frontend/index.html` | `frontend/src/react/**`, `frontend/src/legacy/**`, `frontend/style.css`, `frontend/styles/*` (not focus-room) |
| Focus Room | `frontend/focus-room.html` | `frontend/src/focus-room/**`, `frontend/styles/09-focus-room.css` |
| Login | `frontend/login.html` | `frontend/landing-auth.css`, `frontend/landing-auth.js` |
| Signup | `frontend/signup.html` | same auth shared styles/scripts |
| Forgot password | `frontend/forgot-password.html` | same |
| Reset password | `frontend/reset-password.html` | same + `frontend/reset-password.js` |
| Verify | `frontend/verify.html` | same + `frontend/verify-auth.js` |
| Pricing | `frontend/pricing.html` | `frontend/billing-pages.css`, `frontend/pricing.js` |
| Billing success | `frontend/billing-success.html` | `frontend/billing-pages.css`, `frontend/billing-result.js` |
| Billing cancel | `frontend/billing-cancel.html` | same |
| Privacy | `frontend/privacy.html` | page HTML + shared theme/auth styling as used |
| Terms | `frontend/terms.html` | same |
| 404 | `frontend/404.html` | page HTML + shared styles |

Root HTML mirrors under `/workspace/*.html` redirect or duplicate into `frontend/`; prefer editing **`frontend/`** canonical pages unless a root file is the true served surface.
