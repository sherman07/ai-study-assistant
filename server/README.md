# Synapse Data API

This service is the persistence layer for Synapse. It is separate from the FastAPI AI backend:

- FastAPI on `8001`: AI analysis, extraction, tutor, quizzes, timelines, generated assets.
- Express data API on `3001`: users, generated content records, study rooms, focus sessions, flashcards, progress.

The frontend calls this API over HTTP. It never connects directly to Supabase.

## Storage Mode

This service uses Supabase as its single persistence store:

- Users, generated-note history, study rooms, focus sessions, flashcards, and progress are stored in Supabase using the server-side Service Role key.
- The API reports a degraded health status if Supabase is not configured or reachable.

## Local Setup

Install dependencies from this folder:

```bash
cd server
npm install
```

If your terminal says `npm: command not found`, load the project-local Node helper from the project root first:

```bash
cd /Users/zhenghui/Desktop/Synapse-ai-study-assistant
source scripts/use_local_node.sh
cd server
npm install
```

Run the `source` command again in each new terminal tab before using `npm`.

Copy the env template and add your Supabase credentials:

```bash
cp .env.example .env
```

Start the data API:

```bash
npm run dev
```

Check health:

```bash
curl http://127.0.0.1:3001/health
```

## Supabase Setup

Configure Supabase for account storage, generated-note history, and study-tool history.

1. In Supabase, open the SQL Editor and run [`server/src/db/supabase-schema.sql`](./src/db/supabase-schema.sql).
2. For controller admin / site-access features on an existing project, also run [`server/src/db/migrations/001_admin_controller_access.sql`](./src/db/migrations/001_admin_controller_access.sql). This adds `users.platform_role`, `platform_settings`, and `site_access_allowlist`, and bootstraps `shermanzheng8@gmail.com` as the primary controller.
3. In `server/.env`, set:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_public_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_SCHEMA=public
SYNAPSE_BOOTSTRAP_CONTROLLER_EMAILS=shermanzheng8@gmail.com
```

4. In `frontend/config.js` or your deployed runtime config, set:

```js
window.SYNAPSE_SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
window.SYNAPSE_SUPABASE_ANON_KEY = "your_public_anon_key";
```

5. Restart the data API and backend after updating env files.

Optional: after applying the migration, verify with:

```bash
cd server
node scripts/verify-admin-controller-supabase.mjs
```

The frontend still signs in through Supabase Auth. The server verifies bearer tokens with `SUPABASE_ANON_KEY`, then stores user profiles and histories with `SUPABASE_SERVICE_ROLE_KEY`. Keep the service-role key only in `server/.env` or your server secret manager.

Controller pages (`/frontend/admin-settings.html`, `/frontend/admin-access.html`) call `/api/admin/*` on this data API. Those routes require a signed-in controller and read/write Supabase through the service role.

The schema enables RLS and grants access explicitly for `authenticated` and `service_role`, matching Supabase's newer Data API behavior where tables may not be exposed automatically. The Express server uses the service role and still performs owner checks in application code before reading or writing user-scoped records.

## FastAPI Mirroring

Set the same internal token in both places:

```env
# server/.env
SYNAPSE_INTERNAL_API_TOKEN=long_random_value

# backend/.env
SYNAPSE_DATA_API_INTERNAL_URL=http://127.0.0.1:3001
SYNAPSE_INTERNAL_API_TOKEN=long_random_value
```

If this token is missing or the data API is down, FastAPI still returns generated notes to the frontend. Durable storage is skipped and logged.

## Frontend Config

For local development the frontend defaults to:

```js
window.SYNAPSE_DATA_API_BASE = "http://127.0.0.1:3001";
```

For production, set this to your deployed data API URL in `frontend/config.js` or injected runtime config. Do not put database credentials or Supabase service-role keys in frontend files.

## Stripe Billing

Synapse uses Stripe-hosted Checkout and the Stripe Customer Portal. The frontend only sends server-owned plan or boost pack ids; the Express API looks up Stripe Price IDs from environment variables and only updates access or Boost Credits from verified webhooks.

### Plans

| Plan | Price | Credits |
|---|---|---|
| Free | $0 | 500 welcome + 50 fresh AI credits daily |
| Pro Monthly | $9.99 USD / month | 1,000 fresh AI credits daily (subscription Checkout) |
| Pro Annual | $99.99 USD / year | 1,000 fresh AI credits daily (one-time Checkout, one year of Pro) |

### Boost Credit packs

| Pack | Credits | Price |
|---|---:|---:|
| Small Boost | 10,000 | $4.99 |
| Standard Boost | 25,000 | $9.99 |
| Plus Boost | 70,000 | $24.99 |
| Max Boost | 150,000 | $49.99 |

Daily credits reset each UTC day and are spent first. Boost Credits persist until used. Before generation, clients can call `POST /api/billing/credits/estimate` to show the expected range, maximum charge, which balance will be used, and a lower-cost option when available. `POST /api/billing/credits/spend` deducts credits after a confirmed action.

Required server environment variables:

```env
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BOOST_SMALL=price_...
STRIPE_PRICE_BOOST_STANDARD=price_...
STRIPE_PRICE_BOOST_PLUS=price_...
STRIPE_PRICE_BOOST_MAX=price_...
```

Local webhook testing:

```bash
stripe listen --forward-to http://127.0.0.1:3001/api/billing/webhook
```

Configure the Stripe Customer Portal in the Stripe Dashboard before using “Manage billing portal”. Keep `ALLOW_LOCAL_DEMO_AUTH=false` in production so only verified Supabase users can start Checkout.

## Production Notes

- Use Supabase for users, generated contents, and learning-history tables when you want cloud-backed account and study data.
- Supabase is the only persistence service required in production.
- Set `ALLOW_LOCAL_DEMO_AUTH=false` before accepting real accounts.
- Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` for bearer-token verification.
- Configure `SUPABASE_SERVICE_ROLE_KEY` on the server only if you want Supabase-backed storage.
- Configure Stripe secrets and price IDs in server-side environment variables only.
- Restrict `SYNAPSE_DATA_CORS_ORIGINS` to deployed frontend origins.
- Store all secrets in the platform secret manager.
- Use TLS between public clients and the API.
