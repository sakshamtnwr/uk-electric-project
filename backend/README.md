# Python FastAPI backend

This backend powers the UK Wind Forecast Accuracy Dashboard. It retrieves the public Elexon BMRS `FUELHH` actual-generation and `WINDFOR` wind-forecast datasets, selects forecasts available at a configured cutoff, normalizes to hourly values, and returns the same response shape expected by the React UI.

## Important interpretation

- `decision_date` is a purchase-decision date in January 2026.
- For this prototype, delivery is assumed to be the following calendar day (`decision_date + 1 day`). This is an explicit modelling assumption and should be confirmed against the client's intended purchase timing.
- `cutoff_time` is interpreted in `Europe/London`. The default `12:00` is configurable and is not a confirmed client requirement.
- Forecasts published after the cutoff are excluded. For each forecast target interval, the latest eligible `publishTime` is selected.
- FUELHH `generation` values are average MW for half-hour settlement intervals. Two half-hour values are averaged to produce an hourly average; they are not summed. An actual hour is marked missing if either half-hour period is unavailable.
- WINDFOR examples supplied with the project use hourly `startTime` records. The aggregation also supports half-hour target records if both intervals are present.
- Metric rows are matched by delivery-hour start time. MAE, RMSE and mean bias only include hours with both actual and forecast values.

## Run locally

Requires Python 3.11 or newer.

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment, then run:

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for interactive API documentation.

## Endpoints

- `GET /api/v1/health`
- `GET /api/v1/analysis?decision_date=2026-01-15&cutoff_time=12:00`

Example health check:

```bash
curl http://localhost:8000/api/v1/health
```

Example analysis:

```bash
curl "http://localhost:8000/api/v1/analysis?decision_date=2026-01-15&cutoff_time=12%3A00"
```

The delivery date for that example is 2026-01-16.

## Configuration

- `ELEXON_API_BASE` defaults to `https://data.elexon.co.uk/bmrs/api/v1`.
- `ELEXON_TIMEOUT_SECONDS` defaults to 20 seconds.
- `ANALYSIS_CACHE_TTL_SECONDS` defaults to 900 seconds.
- `FRONTEND_ORIGINS` is a comma-separated list; defaults to local Vite ports 3000 and 5173.

No API key or database is required for the documented public BMRS endpoints. Upstream API/network errors return HTTP 502 and should be retried by the frontend.

## Run tests

```bash
python -m pip install -r requirements.txt
pytest -q
```

## Current integration status

The backend is added as a separate service and is not yet wired into `src/services/api.ts`; the existing frontend still uses demo data until that integration step is completed.
