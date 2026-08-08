# Backend application layer

Place orchestration that:

1. Loads validated inputs (from HTTP adapters)
2. Calls domain rules
3. Invokes infra (OpenAI/Gemini, Data API, visual storage)
4. Returns DTOs for the route layer

Do not put FastAPI `Request` objects or raw SQL here.
Do not grow `app_sections` with new product logic—add a function here and call it.
