# Audio and video analysis

Synapse turns uploaded audio/video into tutor-style study notes by **transcribing** the media on the AI backend, then running the existing `/analyze` note pipeline.

## Where the work happens

```text
Browser (Vercel static UI)
  → multipart POST /analyze
Render FastAPI (synapse-ai-backend)
  → domain media classification
  → application transcription (OpenAI Whisper / gpt-4o-mini-transcribe)
  → optional OpenCV key frames for video
  → structured MEDIA analysis brief
  → existing note generation
Express data API + Supabase
  → persist generated notes / history / auth (not the raw A/V bytes today)
```

## Why Vercel?

**You do not need Vercel to run transcription or AI analysis.**

Vercel hosts the **static frontend** (`index.html`, React shell, CSS). That is the “Add study materials” UI you open in the browser. Analysis requests go to the **Render** FastAPI service (`SYNAPSE_API_BASE`), not to Vercel serverless functions.

If you only care about analyzing audio/video, the required pieces are:

1. Frontend UI (Vercel *or* any static host, or local Vite)
2. FastAPI backend on Render with `OPENAI_API_KEY`
3. Optional: Express + Supabase for signed-in history/billing

You would only add Vercel *functions* if you deliberately moved AI work off Render—which this architecture does not do.

## Why Supabase?

Supabase provides **Auth**, **Postgres**, and optional **Storage** used by the data API for users, entitlements, and saved study content. Uploaded lecture audio/video for analysis are **not** required to sit in Supabase Storage today: the browser posts file bytes straight to FastAPI. Supabase Storage is used for durable visual assets and app data, not as the Whisper runtime.

## Quality path (MVP layers)

| Layer | Module | Role |
| --- | --- | --- |
| Domain | `backend/domain/media_analysis.py` | Kind, size policy, transcript quality, analysis brief |
| Application | `backend/application/media_transcription.py` | OpenAI transcription + source-unit assembly |
| HTTP adapter | `file_to_source_unit` / `/analyze` | Calls application builder for media uploads |
| Frontend model/presenter | `legacy/model/mediaUpload.js`, `mediaUploadPresenter.js` | Icons, size warnings, pre-analyze confirm |

## Limits

- Default transcription cap: `MAX_AUDIO_BYTES` (~24MB)
- Upload cap: `MAX_UPLOAD_BYTES` (~100MB)
- Video may attach sampled frames via OpenCV (`MAX_VIDEO_FRAMES`)
