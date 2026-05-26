# Adviso AI Decision Intelligence Platform

Adviso AI is an explainable AI-powered business intelligence and decision-support platform. It helps organizations, setups, MSMEs, founders, and business analysts transform fragmented operational data into strategic recommendations, what-if scenario simulations, and actionable execution checklists.

This repository contains the complete full-stack codebase configured with a React/Vite/Tailwind frontend, a FastAPI production backend, optional OpenAI report synthesis, and containerized Docker layers.

---

## Technical Architecture

### Frontend Layer (React + Vite + Tailwind CSS)
* **Custom Theme Design**: High-contrast, dark-mode-first styling incorporating clean typography, precise responsive margins, and subtle glassmorphic sheets.
* **Live What-If Simulator**: Real Recharts charts recalculating cumulative revenue growth and efficiency ratios dynamically in response to parameter slider inputs.
* **Operation Strategy Center**: An interactive console communicating with Express server endpoints, displaying structured AI playbooks, confidence indexes, metrics gauges, and operational check-lists.

### Backend Layer (Python + FastAPI)
* **API Ingress routing**: Exposes active endpoints under `/api/*`, including `/api/analyze`, `/api/health`, `/api/metrics`, and business calculator services.
* **AI Decision Layer**: Supports optional OpenAI-powered strategy reports through `OPENAI_API_KEY`.
* **Fall-back Engine**: In the absence of an API key, the system returns deterministic business-analysis reports so the frontend remains fully testable.

---

## Directory Structure

```
/
├── backend/                  # Full-Stack Express Server Node API
│   ├── config/               # Environmental config, API checks
│   ├── routes/               # API endpoint routing (/api/analyze)
│   └── services/             # Legacy local strategy fallback service
├── src/                      # Client-side React SPA
│   ├── components/           # Live Portal widgets and interactive Recharts
│   ├── sections/             # Page panels (Hero, Features, Pricing, etc.)
│   ├── types.ts              # Type-safe model schemas
│   ├── main.tsx              # React entry core
│   └── index.css             # Tailwind base & custom assets
├── server.ts                 # Full-stack developer/production express gateway
├── Dockerfile                # Production multi-stage build container script
├── docker-compose.yml        # Multi-container orchestration tool
├── package.json              # System script commands and dependencies
└── README.md                 # System setup documentation
```

---

## Quick Setup Instructions

### Prerequisites
1. **Node.js** (v20 or higher recommended)
2. **Python 3.12**
3. **npm** or yarn package manager

### 1. Environment Configurations
Create a `.env` file at the root of the project using the structure listed in `.env.example`:

```env
# Optional: create python_backend/.env
OPENAI_API_KEY="your_api_key_here"
AI_MODEL="gpt-4o-mini"
```

### 2. Install Project Dependencies
Run npm installations to load required system assets:
```bash
npm install
```

### 3. Launch Local Development Server
Create and run the Python backend:
```powershell
cd python_backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

In another terminal, execute the frontend runtime script:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser. Vite proxies `/api/*` to the Python backend.

### 4. Build and Launch Standalone Production Bundle
To compile and execute the complete deployment package:
```bash
# Compile client bundles and transpile Express controllers
npm run build

# Start Standalone CJS Production Server
npm run start
```

---

## Docker Deployment

To build and run the full-stack container on port 3000:

### Option A: Using Docker Compose (Recommended)
Launch the application with a single build-and-run instruction:
```bash
docker-compose up --build -d
```

### Option B: Build and Run Manually
Alternatively, trigger traditional image compilation commands:
```bash
# Build production image
docker build -t advisohub/adviso-system:latest .

# Run image and expose port 3000
docker run -p 3000:3000 --env-file .env advisohub/adviso-system:latest
```

---

## Security and Containment Attributes

1. **Token Isolation**: The client never communicates with outside servers directly and has zero visibility into underlying database keys or secret endpoints.
2. **Read-Only Schemas**: Recommended operations are modeled using restricted read scopes.
3. **No Auditing Leaks**: We do not capture, record, or buffer raw business details. All simulations are performed active and processed ephemeral in-memory.
