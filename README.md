# DiaCare Healthcare Application

Combined React/Vite frontend and Python/FastAPI + ML backend. The original source, ML models, SQLite database, API endpoints, and frontend pages are preserved. The frontend Dashboard prediction now calls the existing FastAPI HbA1c endpoint when the backend is available and falls back to the original local calculation if it is unavailable.

## Structure

- `frontend/` — existing DiaCare React/Vite application
- `backend/diabetes_ml/` — existing FastAPI, ML models, data, SQLite database, tests, and patient model artifacts
- `backend/run.py` — portable FastAPI launcher using `PORT` (default `8000`)

## Run

### Backend

```bash
cd backend
pip install -r diabetes_ml/requirements.txt
python run.py
```

API: `http://localhost:8000`
Swagger: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

During development, Vite proxies frontend `/api` requests to `http://localhost:8000`. Set `VITE_API_URL` when the frontend should call a separately hosted API directly; configure the backend's `CORS_ORIGINS` for that deployment.

### Optional backend environment

Copy `backend/.env.example` and configure `PORT` and `CORS_ORIGINS` for your environment. Secrets are intentionally not included.

Insulin patient records and meal prediction history are stored in `backend/diacare.db` and remain available after backend restarts. Set `DIACARE_DATABASE_PATH` to use a different SQLite file. Insulin Prediction supports multiple food items and portion quantities in one meal estimate; sample foods are suggestions, so verify portions and dosing with nutrition information and a clinician. The Reports page can print a clinician-oriented care summary with glucose readings and saved meal insulin estimates; estimates are informational and are not prescriptions or administration records.

### Tests

From `backend/diabetes_ml`:

```bash
pytest -q
```

## Packaging

Development environments such as `node_modules`, Python virtual environments, caches, `.git`, and compiled Python bytecode are intentionally excluded from the final archive. Install dependencies from the included manifests.
