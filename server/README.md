# Synapse Data API

This service is the persistence layer for Synapse. It is separate from the FastAPI AI backend:

- FastAPI on `8001`: AI analysis, extraction, tutor, quizzes, timelines, generated assets.
- Express data API on `3001`: users, generated content records, study rooms, focus sessions, flashcards, progress.

The frontend calls this API over HTTP. It never connects directly to Supabase or MySQL.

## Storage Mode

This repo supports a Supabase-first storage model with a local MySQL fallback:

- Users, generated-note history, study rooms, focus sessions, flashcards, and progress can be stored in Supabase using the server-side Service Role key.
- MySQL is an alternative fallback when Supabase storage is not configured; the service does not dual-write or mirror records between the two databases.
- If Supabase storage is not configured, the API falls back to MySQL-only behavior.

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

Create a local MySQL database and app user. If the MySQL CLI is available:

```sql
CREATE DATABASE IF NOT EXISTS synapse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'synapse_app'@'localhost' IDENTIFIED BY 'replace_with_a_strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON synapse.* TO 'synapse_app'@'localhost';
FLUSH PRIVILEGES;
```

On this Mac the MySQL CLI may be available as `/usr/local/mysql/bin/mysql` even when `mysql` is not on `PATH`.

Copy the env template and fill in your real local password:

```bash
cp .env.example .env
```

Run the schema with Node/mysql2, not the MySQL CLI:

```bash
npm run db:setup
```

To clear local test accounts and generated app data from MySQL:

```bash
npm run db:reset
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

Add Supabase for account storage, generated-note history, and study-tool history.

1. In Supabase, open the SQL Editor and run [`server/src/db/supabase-schema.sql`](/Users/zhenghui/Desktop/Synapse-ai-study-assistant/server/src/db/supabase-schema.sql).
2. In `server/.env`, set:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_public_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_SCHEMA=public
```

3. In `frontend/config.js` or your deployed runtime config, set:

```js
window.SYNAPSE_SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
window.SYNAPSE_SUPABASE_ANON_KEY = "your_public_anon_key";
```

4. Restart the data API and backend after updating env files.

The frontend still signs in through Supabase Auth. The server verifies bearer tokens with `SUPABASE_ANON_KEY`, then stores user profiles and histories with `SUPABASE_SERVICE_ROLE_KEY`. Keep the service-role key only in `server/.env` or your server secret manager.

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

Synapse uses Stripe-hosted Checkout and the Stripe Customer Portal. The frontend only sends a server-owned plan id (`pro_monthly` or `pro_yearly`); the Express API looks up the Stripe Price IDs from environment variables and only updates access from verified webhooks. Pro Monthly uses subscription Checkout. Pro Yearly uses one-time Checkout and grants one year of Pro access after Stripe reports the payment as paid.

Required server environment variables:

```env
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
```

Local webhook testing:

```bash
stripe listen --forward-to http://127.0.0.1:3001/api/billing/webhook
```

Configure the Stripe Customer Portal in the Stripe Dashboard before using “Manage billing portal”. Keep `ALLOW_LOCAL_DEMO_AUTH=false` in production so only verified Supabase users can start Checkout.

## Production Notes

- Use Supabase for users, generated contents, and learning-history tables when you want cloud-backed account and study data.
- Keep MySQL configured only if you need the legacy/local fallback. For a managed production instance, set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` as server-only secrets.
- Set `ALLOW_LOCAL_DEMO_AUTH=false` before accepting real accounts.
- Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` for bearer-token verification.
- Configure `SUPABASE_SERVICE_ROLE_KEY` on the server only if you want Supabase-backed storage.
- Configure Stripe secrets and price IDs in server-side environment variables only.
- Restrict `SYNAPSE_DATA_CORS_ORIGINS` to deployed frontend origins.
- Store all secrets in the platform secret manager.
- Use TLS between public clients and the API; keep MySQL private.
