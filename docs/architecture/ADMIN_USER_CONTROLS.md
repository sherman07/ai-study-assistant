# Controller per-user controls

## Goal

Controllers can manage more than a single “credits” total:

1. **Daily credits** and **Boost credits** independently
2. **AI model access** overrides (GPT / Gemini / DeepSeek)
3. **Feature gates** (Deep Study, companion, broadcast, Focus Room, media analysis, …)
4. **Account status** (active / suspended)

## Storage

Overrides live in `public.users.metadata_json.admin_controls`:

```json
{
  "accountStatus": "active",
  "notes": "Internal controller note",
  "features": {
    "deepStudy": "allow",
    "gptProvider": "inherit",
    "mediaAnalysis": "deny"
  },
  "updatedAt": "ISO-8601"
}
```

Feature modes: `inherit` | `allow` | `deny`.

Credit balances remain in the existing credit metadata keys (`daily_credits`, `boost_credits`, …).

## Enforcement

- `userEntitlements()` merges plan defaults with admin overrides
- Suspended accounts lose Pro and fail credit estimate/spend with **403**
- Pro-gated generated-content writes check entitlement feature keys (controller grants work without Stripe Pro)
- Deep Study credit estimates honor `features.deepStudy` / `proStudy`

## Admin UI

`frontend/admin-access.html` → Edit user sections: Account, Credits, AI model access, Feature gates.
