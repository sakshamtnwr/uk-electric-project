# UK Wind Forecast Accuracy Dashboard

A React + TypeScript frontend and Python FastAPI backend for comparing Elexon BMRS national wind-generation forecasts with actual wind generation.

## Project structure

- `frontend/`: React + Vite dashboard.
- `backend/`: Python + FastAPI API, Elexon fetching/matching logic, and tests.

## Run locally

### 1. Start the backend

Open a terminal in the repository root and run:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Keep this terminal open. API docs: <http://localhost:8000/docs>.

### 2. Start the frontend

Open a second terminal in the repository root and run:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (the current Vite configuration uses port 3000). The frontend defaults to `http://localhost:8000` for local API calls. To override it, create a frontend `.env.local` file containing:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

Restart the Vite dev server after changing environment variables.

## API

- `GET /api/v1/health`: backend health check.
- `GET /api/v1/analysis?decision_date=2026-01-15&cutoff_time=12:00`: forecast accuracy for the following delivery day under the configurable cutoff assumption.

The selected date is the purchase-decision date, restricted to January 2026; the backend assumes delivery on the next calendar day. The default cutoff of 12:00 UK time is an illustrative assumption, not a confirmed client requirement. Forecast publication times are filtered against the cutoff. Missing intervals are not treated as zero.

## Deploying as separate Vercel projects

The applications can remain in one GitHub repository and be deployed separately:

- Frontend Vercel project: Root Directory `frontend`, Vite preset, build command `npm run build`, output directory `dist`.
- Backend Vercel project: Root Directory `backend`, use Vercel's FastAPI/Python support.
- Set `VITE_API_BASE_URL` in the frontend project's Vercel environment variables to the backend deployment URL.
- Set `FRONTEND_ORIGINS` in the backend project's environment variables to the frontend site's origin, e.g. `https://your-frontend.vercel.app`.

A `vercel.json` rewrite is not needed for direct frontend-to-backend requests. Vercel environment variables must be set separately for each project, and the projects should be redeployed after changes.

## Tests

From a terminal in the repository root:

```powershell
cd backend
python -m pytest
```
