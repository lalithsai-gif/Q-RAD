from __future__ import annotations

import json
import mimetypes
import time
from collections import OrderedDict
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image, UnidentifiedImageError

from .config import ARTIFACTS_DIR, CONFIG, FINDINGS, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB
from .model import QRADModel

app = FastAPI(
    title='Q-RAD Quantum Radiology API',
    version='3.0.0',
    description='Full-stack inference API for Q-RAD.',
    docs_url='/docs',
    redoc_url='/redoc',
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

ENGINE = QRADModel()
HISTORY: OrderedDict[str, dict[str, Any]] = OrderedDict()
MAX_HISTORY = 20


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return default


def _save_history(result: dict[str, Any]) -> None:
    HISTORY[result['analysis_id']] = result
    HISTORY.move_to_end(result['analysis_id'])
    while len(HISTORY) > MAX_HISTORY:
        HISTORY.popitem(last=False)


@app.get('/api/health')
def health():
    r = ENGINE.readiness
    return {'status': 'ok', 'service': 'Q-RAD API', 'engine_online': r['ready_for_classical'], 'quantum_online': r['ready_for_quantum']}


@app.get('/api/readiness')
def readiness():
    return ENGINE.readiness


@app.post('/api/reload')
def reload_models():
    try:
        ENGINE.reload()
        return {'status': 'reloaded'}
    except Exception as exc:
        raise HTTPException(500, 'Runtime refresh failed.') from exc


@app.get('/api/config')
def config():
    return CONFIG


@app.get('/api/info')
def info():
    return {
        'product': CONFIG['display_name'],
        'task': CONFIG['task_type'],
        'findings': FINDINGS,
        'quantum': CONFIG.get('quantum', {}),
        'classical': CONFIG.get('classical', {}),
        'cnn': {'name': CONFIG.get('cnn', 'DenseNet-121'), 'feature_dimension': CONFIG.get('cnn_feature_dimension', 1024)},
        'limits': {'max_upload_mb': MAX_UPLOAD_MB},
        'metrics': _read_json(ARTIFACTS_DIR / 'metrics_summary.json', {}),
    }


@app.get('/api/models')
def models_inventory():
    return ENGINE.model_inventory()


@app.get('/api/metrics')
def metrics():
    return _read_json(ARTIFACTS_DIR / 'metrics_summary.json', {})


@app.get('/api/quantum/circuit')
def quantum_circuit():
    return ENGINE.circuit_info()


@app.get('/api/history')
def history():
    return {
        'count': len(HISTORY),
        'items': [
            {
                'analysis_id': v['analysis_id'],
                'filename': v.get('filename', 'scan'),
                'top_finding': v['top_finding'],
                'timestamp': v.get('timestamp'),
                'total_seconds': v.get('server_seconds', v.get('timings', {}).get('total_seconds', 0)),
            }
            for v in reversed(HISTORY.values())
        ],
    }


@app.get('/api/history/{analysis_id}')
def history_item(analysis_id: str):
    item = HISTORY.get(analysis_id)
    if not item:
        raise HTTPException(404, 'Analysis not found.')
    return item


@app.delete('/api/history')
def history_clear():
    HISTORY.clear()
    return {'status': 'cleared'}


@app.get('/api/report/{analysis_id}')
def report(analysis_id: str):
    item = HISTORY.get(analysis_id)
    if not item:
        raise HTTPException(404, 'Analysis not found.')
    return {
        'product': CONFIG['display_name'],
        'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
        'analysis': item,
    }


@app.get('/api/assets/{name}')
def asset(name: str):
    allowed = {
        'quantum_kernel_heatmap.png': ARTIFACTS_DIR / 'quantum_kernel_heatmap.png',
        'gradcam_example.png': ARTIFACTS_DIR / 'gradcam_top_finding.png',
    }
    path = allowed.get(name)
    if path is None or not path.exists():
        raise HTTPException(404, 'Asset not found.')
    media = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return FileResponse(path, media_type=media)


@app.post('/api/analyze')
async def analyze(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(400, 'Please upload a PNG, JPEG, JPG, or WEBP image.')
    raw = await file.read()
    if not raw:
        raise HTTPException(400, 'The uploaded image is empty.')
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f'Image is larger than {MAX_UPLOAD_MB:g} MB.')
    try:
        image = Image.open(BytesIO(raw)).convert('RGB')
    except UnidentifiedImageError as exc:
        raise HTTPException(400, 'The selected file is not a readable image.') from exc
    except Exception as exc:
        raise HTTPException(400, 'The selected image could not be opened.') from exc

    # Refresh the runtime once before a request so assets copied immediately before launch are picked up.
    if ENGINE.net is None or ENGINE.classical is None:
        try:
            ENGINE.reload()
        except Exception:
            pass

    started = time.perf_counter()
    try:
        result = ENGINE.analyze(image, raw)
    except RuntimeError as exc:
        # User-facing message intentionally stays product-oriented; implementation details remain server-side.
        raise HTTPException(503, 'Q-RAD could not start the analysis engine.') from exc
    except Exception as exc:
        raise HTTPException(500, 'Q-RAD analysis failed. Please try the scan again.') from exc

    result['filename'] = file.filename or 'chest_xray'
    result['content_type'] = file.content_type
    result['timestamp'] = time.strftime('%Y-%m-%d %H:%M:%S')
    result['server_seconds'] = round(time.perf_counter() - started, 3)
    _save_history(result)
    return JSONResponse(result)
