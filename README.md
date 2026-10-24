# UK Wind Forecast Accuracy Dashboard

A dashboard for comparing GB national wind generation forecasts with actual generation from the public Elexon BMRS API. It helps users inspect forecast errors and data completeness for a selected day-ahead purchase-decision date.

## Live application

- **Dashboard:** https://uk-electric-frontend.vercel.app
- **Backend health:** https://uk-electric-backend-theta.vercel.app/api/v1/health
- **API documentation:** https://uk-electric-backend-theta.vercel.app/docs

## Features

- Select a purchase-decision date in January 2026 and a forecast publication cutoff time in UK time.
- Compare forecast and actual wind generation for 24 hourly delivery periods.
- View MAE, RMSE, mean bias, data completeness, and the records behind the metrics.
- Export the displayed analysis to CSV.
- Handle missing or unmatched periods without treating missing values as zero.

## Data and methodology

The backend retrieves data from two public Elexon BMRS streams:

- **WINDFOR:** wind generation forecasts, including target time (`startTime`) and publication time (`publishTime`).
- **FUELHH:** actual wind generation, with half-hourly settlement readings.

The selected purchase-decision date is assumed to be followed by the delivery date on the next calendar day. This is a documented prototype assumption and should be confirmed against the client's intended purchasing process. The default cutoff of **12:00 UK time** is illustrative, not a confirmed client requirement.

The backend considers forecast publications from the decision date up to the selected cutoff, then chooses the latest eligible forecast for each delivery hour. `publishTime` records when a forecast was published; `startTime` identifies the delivery interval it predicts. Actual half-hourly MW readings are averaged into hourly values only when both half-hour readings are available. MW readings are averaged, not summed.

Error is defined as **forecast − actual**:

- **MAE:** average absolute error.
- **RMSE:** square root of the average squared error; larger errors have greater influence.
- **Mean bias:** average signed error; positive values indicate overforecasting on average.
- **Completeness:** matched hourly records divided by 24 expected hours, expressed as a percentage.

Only periods with both forecast and actual values contribute to MAE, RMSE, and mean bias. The analysis covers the selected day; a single day should not be treated as proof of longer-term forecast performance.

## Technology

- **Frontend:** React, TypeScript, and Vite.
- **Backend:** Python and FastAPI.
- **Data source:** public Elexon BMRS API; no API key is required.
- **Local containers:** Docker and Docker Compose.
- **Deployment:** frontend and backend are deployed as separate Vercel projects from the same GitHub repository.

## Run locally

### Option A: Docker Compose

From the repository root, with Docker Desktop running:

```bash
docker compose up --build
```

- Dashboard: <http://localhost:3000>
- Backend API docs: <http://localhost:8000/docs>
- Backend health: <http://localhost:8000/api/v1/health>

### Option B: Run frontend and backend separately

Start the backend in one terminal:

```bash
cd backend
python -m venv .venv
```

Activate the environment (Windows PowerShell):

```powershell
.\.venv\Scripts\Activate.ps1
```

Install packages and start FastAPI:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

In a second terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend uses `VITE_API_BASE_URL` to locate the backend. Its local default is `http://localhost:8000`.

## API endpoints

- `GET /api/v1/health` — checks that the API is running.
- `GET /api/v1/analysis?decision_date=2026-01-15&cutoff_time=12:00` — returns the analysis for the selected decision date and cutoff. The example evaluates delivery on 16 January under the next-day assumption.

## Tests

Backend tests are in `backend/tests/`. Run them from the backend directory:

```bash
pytest -q
```

They check key analysis behaviour, including half-hourly-to-hourly aggregation, forecast cutoff selection, metric calculations, missing data, and API validation.

## Deployment configuration

The frontend and backend use separate Vercel projects with Root Directories `frontend` and `backend` respectively.

- Frontend environment variable: `VITE_API_BASE_URL` = deployed backend base URL, without a trailing slash or `/api/v1/analysis` suffix.
- Backend environment variable: `FRONTEND_ORIGINS` = exact allowed frontend origin(s), including `https://` and without a trailing slash.
- Backend configuration may also set `ELEXON_API_BASE`, `ELEXON_TIMEOUT_SECONDS`, and `ANALYSIS_CACHE_TTL_SECONDS`.

Commit `.env.example` templates, but do not commit real `.env` files, secrets, `.venv`, or `node_modules`.

## AI assistance disclosure

Google AI Studio was used to generate the initial frontend prototype. ChatGPT assisted with backend implementation, integration, and documentation. The source code, assumptions, and results should be reviewed before relying on the analysis.
