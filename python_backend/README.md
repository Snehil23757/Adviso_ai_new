# Adviso AI Python Backend

FastAPI service for the React platform frontend.

## Run Locally

```powershell
cd python_backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The Vite frontend proxies `/api/*` to `http://127.0.0.1:8000` in development.

The backend runs without an API key using deterministic business-analysis fallbacks. Add `OPENAI_API_KEY` to `python_backend\.env` for AI-enhanced strategy reports.

## Queue Workers

CSV upload completion only queues work. Run FastAPI and Celery separately:

```powershell
cd python_backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
cd python_backend
.\.venv\Scripts\celery.exe -A app.celery_app.celery_app worker -Q csv,ai,email,maintenance,default --pool=solo --loglevel=INFO
```

Use `--pool=solo` for local Windows development. In Linux containers, omit it and scale workers with `CELERY_WORKER_CONCURRENCY` or Celery's `--concurrency` flag.

Run Celery beat for scheduled cleanup of stale uploads:

```powershell
cd python_backend
.\.venv\Scripts\celery.exe -A app.celery_app.celery_app beat --loglevel=INFO
```

Required queue environment:

```env
REDIS_URL="rediss://default:YOUR_UPSTASH_PASSWORD@YOUR_UPSTASH_HOST.upstash.io:6379"
RESEND_API_KEY="re_your_key"
EMAIL_FROM_WELCOME="Adviso AI <welcome@adviso.ai>"
EMAIL_FROM_SUPPORT="Adviso AI Support <support@adviso.ai>"
APP_PUBLIC_URL="https://adviso.ai"
DB_POOL_MIN_SIZE=1
DB_POOL_MAX_SIZE=10
CELERY_WORKER_CONCURRENCY=2
UPLOAD_RATE_LIMIT_PER_MINUTE=10
AI_RATE_LIMIT_PER_MINUTE=30
WEBSOCKET_RATE_LIMIT_PER_MINUTE=60
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_STORAGE_BUCKET="datasets"
```

Health checks:

- `GET /api/health/redis`
- `GET /api/health/celery`
- `GET /api/health/queues`
- `GET /api/health/database`
