# Run and deploy the UK Wind Forecast Accuracy Dashboard

The repository contains two separately deployable apps:

- `frontend/`: React + Vite dashboard.
- `backend/`: Python + FastAPI API.

## 1. Run with Docker Compose

Install and start Docker Desktop first. From the repository root (the directory containing `docker-compose.yml`), run:

```powershell
docker compose up --build
```

Then open:

- Dashboard: <http://localhost:3000>
- FastAPI docs: <http://localhost:8000/docs>
- Backend health: <http://localhost:8000/api/v1/health>

The browser calls the backend at `http://localhost:8000`; Compose configures CORS for the local dashboard origin.

Stop the containers with `Ctrl+C`, then run `docker compose down` from another terminal if needed.

## 2. Run tests

From the repository root, in a terminal:

```powershell
cd backend
python -m pytest -q
```

Expected result for the current backend tests: `7 passed`.

## 3. Deploy the frontend to Vercel

1. Push the repository to GitHub, including both `frontend/` and `backend/` folders and the updated frontend `package.json` / `package-lock.json`.
2. Import the repository in Vercel as a frontend project.
3. Set **Root Directory** to `frontend` and use the Vite preset.
4. Set the build command to `npm run build` and output directory to `dist` (normally detected automatically).
5. Add this environment variable in Vercel Project Settings → Environment Variables:

   `VITE_API_BASE_URL=https://YOUR-BACKEND-PROJECT.vercel.app`

   Replace the example value with the deployed backend origin, with no `/api/v1` suffix. Redeploy the frontend after changing it.

## 4. Deploy the backend to Vercel

1. Import the same GitHub repository as a second Vercel project.
2. Set **Root Directory** to `backend`.
3. Vercel should detect the FastAPI app. `backend/pyproject.toml` explicitly sets the entry point to `app.main:app`; dependencies are in `backend/requirements.txt`.
4. Add the environment variable:

   `FRONTEND_ORIGINS=https://YOUR-FRONTEND-PROJECT.vercel.app`

   Replace the example with the exact origin of the deployed frontend (scheme and hostname only, no trailing path). Add additional comma-separated origins if you intentionally use another frontend hostname.
5. Optional settings:
   - `ELEXON_TIMEOUT_SECONDS=20`
   - `ANALYSIS_CACHE_TTL_SECONDS=900`

No `vercel.json` rewrite is required when the frontend and backend are separate Vercel projects: the frontend uses `VITE_API_BASE_URL` to call the backend URL directly. The Docker files are for local container testing and do not control Vercel's native deployment.

## 5. Verify after deployment

- Open `https://YOUR-BACKEND-PROJECT.vercel.app/api/v1/health` and confirm an `ok` response.
- Open the deployed frontend, then check browser Developer Tools → Network for `/api/v1/analysis` requests to the backend project.
- If the browser reports a CORS error, check `FRONTEND_ORIGINS` against the exact deployed frontend origin and redeploy the backend.

## Important assumptions

The default cutoff (`12:00`) and delivery date (`decision_date + 1 day`) are demo assumptions that need confirmation against the assignment's intended purchasing timeline. Do not present the default cutoff as a confirmed market rule.
