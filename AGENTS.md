# AGENTS.md

## Cursor Cloud specific instructions

Synapse is a multi-service app. See `README.md` and `server/README.md` for full docs; the notes below only cover non-obvious cloud-environment caveats.

### Services

- Frontend — Vite/React static + workspace shell, port `5175`. Run: `npm run dev`.
- Backend — FastAPI (AI analysis, tutor, quizzes, flashcards, contact, billing), port `8001`. Run: `.venv/bin/python run_backend.py`.
- Data API — Express persistence layer, port `3001`. Run from `server/`: `npm run dev`.

Start everything at once with `bash scripts/start_local_stack.sh` (status/stop: `scripts/status_local_stack.sh`, `scripts/stop_local_stack.sh`).

### Environment / setup caveats

- The update script installs deps only. It does NOT create the `.env` files. `start_local_stack.sh` auto-creates `backend/.env` from `backend/.env.example`, but it hard-fails if `server/.env` is missing. If `server/.env` is absent, run `cp server/.env.example server/.env` first. These files are git-ignored and persist in the VM snapshot.
- System package `python3.12-venv` is required to build the Python virtualenv; it is installed once during environment setup (not in the update script).
- No real `OPENAI_API_KEY` / Supabase / Stripe / MySQL credentials are configured by default. The example `.env` uses a placeholder `OPENAI_API_KEY`, so `/health` reports `api_key_loaded:true` even though live OpenAI-backed AI generation (notes, tutor, quizzes, flashcards, images) will fail until a real key is added to `backend/.env`.
- MySQL is not installed. The Data API starts and serves `/health` in `degraded` mode (`mysql.connected:false`); this is expected. `start_local_stack.sh` may print "Data API did not become ready" during startup because MySQL connection retries delay first readiness, but the service does come up on `3001`.

### Testing caveats

- Backend test `backend.tests.test_visual_gallery_and_cache.SourceStrictNotesTests.test_text_provider_override_is_request_scoped` only passes when NO usable `OPENAI_API_KEY` is present. With the placeholder key in `backend/.env`, `has_openai()` is true and the request-scoped gemini override downgrades back to openai, failing this one test. Temporarily move `backend/.env` aside to get a clean 65/65 run.
- Lint/test/build commands are documented in `README.md` and `package.json`/`server/package.json` scripts. Key ones: static validation `node scripts/validate_static_site.mjs`; frontend regression `npm run test:focus-room`; data API `npm run check` (in `server/`); frontend build `npm run build`.
