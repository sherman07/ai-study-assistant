# Synapse Backend Runtime Guide

Synapse has two separate parts:

- Frontend: browser UI, usually served from `frontend/`.
- Backend: FastAPI API on port `8001`, required for analysis, tutor, quiz, flashcards, source previews, and generated assets.
- Data API: Express API on port `3001`, required for durable Supabase users, generated content records, focus sessions, flashcards, study rooms, and progress.

If the frontend shows `Cannot reach the Synapse backend at http://127.0.0.1:8001`, the backend process is not running or is not reachable from the browser.

## Local Development

Run the backend from the project root:

```bash
.venv/bin/python run_backend.py
```

Then check:

```bash
curl http://127.0.0.1:8001/health
```

Keep that terminal open while using the frontend.

For a quick local frontend server:

```bash
npm run dev
```

Then open:

```text
http://127.0.0.1:5175/frontend/index.html
```

## Keep It Running On Your Mac

For local development, use the LaunchAgent template:

```text
deploy/com.synapse.backend.plist.example
```

Copy it to:

```text
~/Library/LaunchAgents/com.synapse.backend.plist
```

Then replace the placeholder paths with your real project path and Python path.

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.synapse.backend.plist
```

Stop it:

```bash
launchctl unload ~/Library/LaunchAgents/com.synapse.backend.plist
```

This is useful for local testing. It is not a production deployment.

## Production Deployment Shape

For a real online Synapse deployment:

1. Run the FastAPI backend as a managed service.
2. Put a reverse proxy or platform router in front of it.
3. Host the frontend as static files.
4. Configure the frontend API base to call the public backend URL.
5. Configure the contact form endpoint if public enquiries should be delivered.
6. Store secrets as environment variables, not in Git.

Recommended backend process command for the first production MVP:

```bash
.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8001
```

Use one worker initially because parts of the current backend still keep short-lived in-memory state for compatibility. Scale to multiple workers only after those paths are fully stateless or backed by shared storage.

For a Linux VM, use:

```text
deploy/synapse-backend.service.example
```

For managed platforms such as Render, Railway, Fly.io, or a container host, set the same command in the platform's web service start command, with the platform-provided port when required.

## Required Production Environment

Set these as environment variables:

```env
OPENAI_API_KEY=...
SYNAPSE_PUBLIC_BACKEND_URL=https://api.your-domain.com
SYNAPSE_DATA_API_INTERNAL_URL=https://data-api.your-domain.com
SYNAPSE_INTERNAL_API_TOKEN=long_random_internal_token
SYNAPSE_CORS_ALLOW_ORIGINS=https://your-frontend-domain.com
ENABLE_LOCAL_PPTX_APP_RENDER=false
ENABLE_SOURCE_PPTX_PREVIEW_RENDER=true
SYNAPSE_CONTACT_WEBHOOK_URL=https://your-form-or-email-webhook.example/contact
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_STUDENT=price_...
STRIPE_PRICE_PRO=price_...
SYNAPSE_FRONTEND_BASE_URL=https://your-frontend-domain.com
SYNAPSE_ALLOW_UNSIGNED_STRIPE_WEBHOOK=false
```

Set these for the Express data API service only:

```env
SYNAPSE_DATA_API_PORT=3001
SYNAPSE_DATA_CORS_ORIGINS=https://your-frontend-domain.com
ALLOW_LOCAL_DEMO_AUTH=false
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
SYNAPSE_INTERNAL_API_TOKEN=the_same_long_random_internal_token
```

Install LibreOffice on the production server if you want high-quality PPTX previews:

```env
LIBREOFFICE_PATH=/usr/bin/libreoffice
```

Never commit `.env`, API keys, or local runtime files.

## Frontend API URL

In local development, the frontend defaults to:

```text
http://127.0.0.1:8001
```

In production, set the frontend to use the deployed backend URL. For this codebase, the frontend can read:

```js
window.SYNAPSE_API_BASE = "https://api.your-domain.com";
window.SYNAPSE_DATA_API_BASE = "https://data-api.your-domain.com";
window.SYNAPSE_CONTACT_ENDPOINT = "https://api.your-domain.com/contact";
window.SYNAPSE_SUPABASE_URL = "https://your-project.supabase.co";
window.SYNAPSE_SUPABASE_ANON_KEY = "your-public-anon-key";
window.SYNAPSE_STRIPE_PRICE_STARTER = "price_...";
window.SYNAPSE_STRIPE_PRICE_STUDENT = "price_...";
window.SYNAPSE_STRIPE_PRICE_PRO = "price_...";
```

This can be injected in the production HTML or set in `frontend/config.js`, which is loaded before `auth-client.js` on each frontend entrypoint. `frontend/config.example.js` shows the complete shape with example placeholders.

## Public Website Entry

The project-root `index.html` redirects to `frontend/landing.html`, which is the public website entry. The study workspace remains at `frontend/index.html`, and the project-root `app.html` redirects there.

If you publish only the `frontend/` directory, configure your hosting platform to serve `landing.html` for `/`, or add an equivalent redirect/rewrite. The logo assets are mirrored into `frontend/logos/` so `/logos/synapse.png` works when `frontend/` is the static publish directory.

## Contact Form Runtime

The FastAPI backend exposes `POST /contact`. Valid submissions are appended to:

```text
.synapse_runtime/contact_inquiries.jsonl
```

If `SYNAPSE_CONTACT_WEBHOOK_URL` is set, the backend also forwards the validated enquiry payload to that webhook. Use a transactional email provider, form backend, or CRM webhook here for production delivery.

## Auth Caveat

The login/signup flow uses Supabase Auth when frontend Supabase config is present. The browser-local fallback is still useful for frontend flow testing, but it is not production account security.

## Billing Runtime

The backend exposes:

```text
POST /billing/checkout
POST /billing/portal
POST /billing/webhook
GET /account/export
POST /account/delete
```

Checkout and portal routes require a valid Supabase bearer token from the frontend. Register `/billing/webhook` in Stripe and set `STRIPE_WEBHOOK_SECRET` so completed Checkout Sessions are recorded in `.synapse_runtime/billing_ledger.jsonl`.

`/account/delete` deletes the Supabase auth user when `SUPABASE_SERVICE_ROLE_KEY` is configured and marks the Stripe customer with deletion metadata. It does not erase Stripe financial records, which should be retained according to your accounting and legal requirements.

`/account/export` returns server-side account, billing, contact, and deletion records. Browser-local note history is exported by the frontend because it lives in local storage/IndexedDB.
