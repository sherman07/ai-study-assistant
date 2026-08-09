# Controller per-user controls

## Goal

Controllers can manage more than a single “credits” total:

1. **Daily credits** and **Boost credits** independently
2. **AI model access** overrides (GPT / Gemini / DeepSeek)
3. **Feature gates** (Deep Study, companion, broadcast, Focus Room, media analysis, …)
4. **Account status** (active / suspended)

## Supabase storage

Apply both migrations in the Supabase SQL Editor:

1. `server/src/db/migrations/001_admin_controller_access.sql`
2. `server/src/db/migrations/002_admin_user_controls_credits.sql`

Verify with:

```bash
cd server && node scripts/verify-admin-controller-supabase.mjs
```

Overrides + credit ledger live in `public.users.metadata_json`:

```json
{
  "credits": 775,
  "daily_credits": 25,
  "boost_credits": 750,
  "daily_refreshed_on": "2026-08-09",
  "welcome_granted": true,
  "admin_daily_allowance": 25,
  "admin_controls": {
    "accountStatus": "active",
    "notes": "Internal controller note",
    "features": {
      "deepStudy": "allow",
      "gptProvider": "inherit",
      "mediaAnalysis": "deny"
    },
    "updatedAt": "ISO-8601"
  }
}
```

Feature modes: `inherit` | `allow` | `deny`.

Read-only overview view (service role): `public.synapse_user_billing_overview`.

## Persistence rules

- Auth login / Auth→`public.users` sync **must not wipe** credit or `admin_controls` metadata.
- `upsertUser` only merges identity keys (`supabase_user_id`, `provider`, …).
- Controller daily edits also set `admin_daily_allowance` so UTC daily refresh does not undo them.
- Boost credits always persist until spent or explicitly cleared by a controller.

## Enforcement

- `userEntitlements()` merges plan defaults with admin overrides
- `/api/users/me` and `/api/billing/entitlements` return entitlements + daily/boost credits
- Frontend session sync loads both after login
- Account → Billing refreshes credit balance from the server
- Suspended accounts fail credit estimate/spend with **403**
- Broadcast create/retry requires `broadcastMode`
- Pro content writes check entitlement feature keys

## Admin UI

`frontend/admin-access.html` → Edit user sections: Account, Credits, AI model access, Feature gates.
