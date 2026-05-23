# Adviso AI Python Backend

FastAPI service for the React platform frontend.

## Run Locally

```powershell
cd C:\Users\snehi\OneDrive\Documents\Adviso_AI\adviso_ai_platform\python_backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The Vite frontend proxies `/api/*` to `http://127.0.0.1:8000` in development.

The backend runs without an API key using deterministic business-analysis fallbacks. Add `OPENAI_API_KEY` to `python_backend\.env` for AI-enhanced strategy reports.
