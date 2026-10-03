# Q-RAD — Quantum Radiology

Q-RAD is a local full-stack chest X-ray analysis prototype with a React interface and FastAPI inference service.

## Run on Windows

1. Extract the folder.
2. Open `RUN_WINDOWS.bat`.
3. The application opens in your browser at `http://127.0.0.1:5173`.
4. Upload a PNG, JPG, JPEG, or WEBP chest X-ray.
5. Select a result section to explore the finding landscape, quantum analysis, explainability, and technical workflow.

## API

The FastAPI service is available at `http://127.0.0.1:8000` and exposes interactive documentation at `/docs`.

### Main routes

- `GET /api/health`
- `GET /api/readiness`
- `POST /api/reload`
- `GET /api/config`
- `GET /api/info`
- `GET /api/models`
- `GET /api/metrics`
- `GET /api/quantum/circuit`
- `POST /api/analyze`
- `GET /api/history`
- `GET /api/history/{analysis_id}`
- `DELETE /api/history`
- `GET /api/report/{analysis_id}`
- `GET /api/assets/{name}`

## Interface

The interface keeps a white/blue light theme and a dark/blue theme. The first screen is intentionally user-facing and simple; deeper technical information appears after analysis.

## Notes

The application is designed as a software demonstration prototype. Finding scores are model outputs and are not calibrated clinical probabilities.
