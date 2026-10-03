from __future__ import annotations

import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = BASE_DIR / 'artifacts'
MODELS_DIR = BASE_DIR / 'models'
QSVC_DIR = MODELS_DIR / 'qsvc_models'
IMAGE_SIZE = 224
MAX_UPLOAD_MB = float(os.getenv('QRAD_MAX_UPLOAD_MB', '15'))
MAX_UPLOAD_BYTES = int(MAX_UPLOAD_MB * 1024 * 1024)

FALLBACK_FINDINGS = [
    'Atelectasis', 'Cardiomegaly', 'Consolidation', 'Edema', 'Effusion',
    'Emphysema', 'Fibrosis', 'Hernia', 'Infiltration', 'Mass', 'Nodule',
    'Pleural_Thickening', 'Pneumonia', 'Pneumothorax'
]

DEFAULT_CONFIG = {
    'product': 'Q-RAD',
    'display_name': 'Q-RAD — Quantum Radiology',
    'task_type': 'multi-label radiological finding prediction',
    'num_findings': 14,
    'findings': FALLBACK_FINDINGS,
    'image_size': IMAGE_SIZE,
    'cnn': 'DenseNet-121',
    'cnn_feature_dimension': 1024,
    'classical': {'type': 'One-vs-Rest Linear SVM', 'feature_dimension': 1024},
    'quantum': {
        'qubits': 4,
        'reps': 2,
        'feature_map': 'ZZ Feature Map',
        'kernel': 'Fidelity Quantum Kernel',
        'classifier': 'QSVC',
        'models': 14,
    },
}


def load_config() -> dict:
    path = ARTIFACTS_DIR / 'qrad_config.json'
    if not path.exists():
        return DEFAULT_CONFIG
    try:
        raw = json.loads(path.read_text(encoding='utf-8'))
        cfg = {**DEFAULT_CONFIG, **raw}
        cfg['classical'] = {**DEFAULT_CONFIG['classical'], **raw.get('classical', {})}
        cfg['quantum'] = {**DEFAULT_CONFIG['quantum'], **raw.get('quantum', {})}
        cfg['findings'] = list(raw.get('findings', FALLBACK_FINDINGS))
        return cfg
    except Exception:
        return DEFAULT_CONFIG


CONFIG = load_config()
FINDINGS = CONFIG['findings']
