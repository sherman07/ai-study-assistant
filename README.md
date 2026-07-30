# Synapse AI Study Assistant

Synapse is an AI-powered study website and workspace that turns PDFs, lecture slides, videos, images, links, and notes into active learning: structured notes, mind maps, questions, flashcards, timelines, source previews, and tutor feedback.

## Project Structure

- `frontend/` - static public website, auth prototype pages, and the study workspace shell.
- `frontend/src/` - React shell plus the existing legacy controller modules.
- `backend/` - FastAPI backend for analysis, tutoring, quizzes, flashcards, source previews, contact enquiries, and generated assets.
- `server/` - Express data API backed by Supabase for user and study data.
- `logos/` and `frontend/logos/` - Synapse logo assets for local root serving and static frontend publishing.
- `scripts/validate_static_site.mjs` - launch-readiness validation for static HTML.
- `deploy/` - production runtime notes and service templates.

## Install

Create and activate a Python virtual environment, then install the backend dependencies:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
```

Install the frontend toolchain from the project root:

```bash
npm install
```

Node is used for the Vite frontend build/dev server and the regression checks.

If `node` or `npm` is not available in your terminal, use the project-local Node helper:

```bash
source scripts/use_local_node.sh
node --version
npm --version
```

Run the `source` command in each new terminal tab before using `npm`; it only updates that terminal session.

## Environment Variables

Create `backend/.env` for local backend secrets:

```env
OPENAI_API_KEY=your_key_here
SYNAPSE_PUBLIC_BACKEND_URL=http://127.0.0.1:8001
SYNAPSE_CORS_ALLOW_ORIGINS=http://127.0.0.1:5175,http://localhost:5175
ENABLE_LOCAL_PPTX_APP_RENDER=false
ENABLE_SOURCE_PPTX_PREVIEW_RENDER=true
```

Optional contact/email delivery:

```env
SYNAPSE_CONTACT_WEBHOOK_URL=https://your-form-or-email-webhook.example/contact
```

Production auth and billing:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_STUDENT=price_...
STRIPE_PRICE_PRO=price_...
SYNAPSE_FRONTEND_BASE_URL=https://your-frontend-domain.com
SYNAPSE_CANONICAL_FRONTEND_BASE_URL=https://your-frontend-domain.com
# Local webhook testing only:
SYNAPSE_ALLOW_UNSIGNED_STRIPE_WEBHOOK=false
```

Signup confirmation, confirmation resend, and password reset emails are generated
from Supabase Auth action links but delivered by Synapse through the backend SMTP
provider. Keep these values only in `backend/.env` and in the Render
`synapse-ai-backend` environment:

On Render, `SYNAPSE_FRONTEND_BASE_URL` and `SYNAPSE_CANONICAL_FRONTEND_BASE_URL`
must be your live Vercel origin (including `/frontend` when that is where
`verify.html` lives). If the public backend URL is hosted and the frontend base
is still localhost, Synapse forces the canonical Vercel verify URL into emails
so confirmation links never open `localhost` on phones.

```env
SYNAPSE_SMTP_HOST=smtp.gmail.com
SYNAPSE_SMTP_PORT=587
SYNAPSE_SMTP_SECURITY=starttls
SYNAPSE_SMTP_USERNAME=your-sender@example.com
SYNAPSE_SMTP_PASSWORD=your-smtp-password
SYNAPSE_SMTP_FROM_EMAIL=your-sender@example.com
SYNAPSE_SMTP_FROM_NAME=Synapse
```

The sender account or domain must be authorized by the SMTP provider. For Gmail,
use an app password rather than the normal account password. The email link
opens the relevant Synapse verification or reset page on the public frontend and
the browser completes the Supabase session there. The public frontend only
receives the Supabase URL and publishable key; never place the service-role key
or SMTP password in `frontend/`.

After deployment, open the backend `/health` endpoint and confirm
`supabase_auth_configured` and `synapse_email_delivery_configured` are `true`.
These are readiness flags only and do not expose secret values.

The landing page reads `window.SYNAPSE_CONTACT_ENDPOINT` when you want to post contact enquiries to a specific deployed endpoint. If it is not set, localhost submissions try `http://127.0.0.1:8001/contact`; otherwise they are saved locally for launch testing.

The auth pages use Supabase Auth when `window.SYNAPSE_SUPABASE_URL` and `window.SYNAPSE_SUPABASE_ANON_KEY` are configured. Without those public frontend values, the older browser-local demo auth remains available for development only.

Google sign-in uses Supabase OAuth. In Supabase Auth, enable the Google provider, add your Google OAuth client credentials, and allow the local redirect URL `http://127.0.0.1:5175/frontend/index.html` plus your deployed frontend callback URL.

The data API is configured separately in `server/.env`. Keep `SYNAPSE_INTERNAL_API_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY` out of frontend files and Git. See `server/README.md` for the Supabase setup.

Edit or replace `frontend/config.js` during deployment with your public backend, Supabase, and Stripe Price ID values. `frontend/config.example.js` shows the same shape with filled example placeholders.

## Run Locally

Start the full local stack with one command:

```bash
bash scripts/start_local_stack.sh
```

This starts:

- Vite frontend on `5175`
- FastAPI backend on `8001`
- Express data API on `3001`

Check status or stop it later:

```bash
bash scripts/status_local_stack.sh
bash scripts/stop_local_stack.sh
```

If `backend/.env` does not exist yet, the start script creates it from `backend/.env.example`. Add your real `OPENAI_API_KEY` there, or run:

```bash
bash scripts/set_backend_openai_key.sh
```

To use Gemini for text generation instead of OpenAI, keep OpenAI settings in
`backend/.env` and put Gemini/Vertex settings in the separate
`backend/.env.gemini` file:

```env
AI_TEXT_PROVIDER=gemini
GEMINI_AUTH_MODE=adc
GEMINI_PROJECT_ID=your-google-cloud-project-id
GEMINI_LOCATION=us-central1
```

Gemini uses the same Synapse prompt-mode builder, source context, and validators
as the GPT path. OpenAI-only features such as realtime voice, transcription, and
hosted image generation still require `OPENAI_API_KEY`.

The upload form includes a Generate AI switch. Leave it on backend default to
use `AI_TEXT_PROVIDER`, or choose GPT/Gemini for that generation request only.

Start the backend:

```bash
.venv/bin/python run_backend.py
```

Start the Vite frontend:

```bash
npm run dev
```

Start the Supabase-backed data API in another terminal when you want durable app data:

```bash
cd server
npm install
npm run dev
```

Open the public site:

```text
http://127.0.0.1:5175/frontend/landing.html
```

Open the study workspace:

```text
http://127.0.0.1:5175/frontend/index.html
```

The standalone Focus Room is feature-flagged and enabled by default in the current local frontend configuration. Set `window.SYNAPSE_FOCUS_ROOM_ENABLED` to `false` before the runtime loads to keep it unavailable from the workspace UI and direct URL access:

```text
http://127.0.0.1:5175/frontend/focus-room.html#/focus-room/:materialId
```

The project-root `index.html` redirects to the public landing page. `app.html` redirects to the study workspace.

## Validate And Test

Run the static launch validation:

```bash
node scripts/validate_static_site.mjs
```

Run frontend regression scripts:

```bash
npm run test:focus-room
```

Build the Vite frontend:

```bash
npm run build
```

Run backend tests:

```bash
.venv/bin/python -m unittest backend.tests.test_visual_gallery_and_cache
```

The Vite build writes `dist/`; keep static validation and regression checks in the release gate because the app still preserves several direct HTML entry points.

## Deploy

For a static-only marketing launch, publish `frontend/` as the static directory and use `landing.html` as the public entry page. If your host requires `index.html` as the entry page, deploy from the project root or configure a route/redirect from `/` to `/landing.html`.

For the full Synapse app, deploy both parts:

1. Host `frontend/` as static files.
2. Deploy `backend.app:app` as a FastAPI service.
3. Set `window.SYNAPSE_API_BASE` in production HTML or a small injected config script.
4. Set `window.SYNAPSE_CONTACT_ENDPOINT` to the deployed contact endpoint, for example `https://api.your-domain.com/contact`.
5. Set `window.SYNAPSE_SUPABASE_URL`, `window.SYNAPSE_SUPABASE_ANON_KEY`, and Stripe public Price IDs in frontend config.
6. Configure backend CORS with the deployed frontend origin.
7. Store all secrets in the hosting platform, never in Git.

Recommended backend command:

```bash
.venv/bin/python -m uvicorn backend.app:app --host 0.0.0.0 --port 8001
```

For PPTX source previews in production, install LibreOffice and configure:

```env
LIBREOFFICE_PATH=/usr/bin/libreoffice
SOURCE_PREVIEW_RENDER_DPI=120
SOURCE_PREVIEW_PPTX_CONVERT_TIMEOUT=120
SOURCE_PREVIEW_MAX_SLIDES=80
SOURCE_PREVIEW_MAX_PDF_PAGES=160
```

See `deploy/README.md` for service templates and backend runtime notes.

## Launch Checklist

- Static validation passes.
- Backend tests pass.
- Public landing page opens from the deployed root URL.
- Navigation links scroll or route correctly.
- Contact form posts to a deployed endpoint or is intentionally disabled until email delivery is configured.
- `OPENAI_API_KEY`, CORS origins, public backend URL, and contact webhook are set in production.
- Supabase Auth URL, anon key, and service role key are configured before accepting real user accounts.
- Stripe secret key, webhook secret, and Price IDs are configured before charging for credit packs.
- Stripe webhook route `/billing/webhook` is registered in the Stripe dashboard.
- Account deletion and export are tested with a real Supabase test user before launch.
- Privacy Policy and Terms are reviewed for your jurisdiction and actual data processors.
- Mobile, tablet, and desktop layouts are manually checked.
- Browser console is free of launch-blocking errors.
- Uploaded study source flow is tested against the deployed backend.
