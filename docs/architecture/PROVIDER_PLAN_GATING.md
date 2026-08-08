# AI provider plan gating

## Product rule

| Plan | Allowed text providers |
| --- | --- |
| Free / anonymous / inactive | **DeepSeek only** |
| Active Pro (`pro_monthly` / `pro_yearly`) | **GPT + Gemini + DeepSeek** (plus backend default) |

Free users who pick GPT/Gemini (or Backend default that resolves to GPT) are **clamped to DeepSeek**. Pro unlocks multi-provider choice.

## Enforcement layers (MVP)

1. **Domain** — `backend/domain/provider_access.py`, `server/src/billing/providerAccess.js`, `frontend/src/legacy/model/providerAccess.js`
2. **Entitlements** — `userEntitlements().features.allowedAiProviders` / `multiAiProviders`
3. **Credits API** — `/api/billing/credits/estimate|spend` reject free→GPT/Gemini (`402`)
4. **AI backend** — `select_request_text_provider()` resolves Pro via data-API entitlements (Bearer token); otherwise fail-closed to free → DeepSeek
5. **UI** — Account → Study → Generate AI disables GPT/Gemini for free; `setAiProvider` clamps stored preference

## Why this shape

- UI-only locks are bypassable via direct API calls; backend + credits gates close that hole.
- Anonymous callers are treated as free (DeepSeek only).
- Broadcast still *requests* OpenAI when Pro allows it; free broadcast runs on DeepSeek.
