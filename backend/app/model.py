from __future__ import annotations

import base64
import hashlib
import io
import json
import math
import time
import warnings
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import models, transforms

try:
    import dill
except Exception:
    dill = None

from .config import ARTIFACTS_DIR, FINDINGS, IMAGE_SIZE, MODELS_DIR, QSVC_DIR

warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

PREPROCESS = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.Grayscale(num_output_channels=3),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN.tolist(), std=IMAGENET_STD.tolist()),
])


def _strip_module_prefix(state: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(state, dict):
        raise TypeError('Checkpoint does not contain a state dictionary.')
    if any(str(k).startswith('module.') for k in state):
        return {str(k).replace('module.', '', 1): v for k, v in state.items()}
    return state


def _load_checkpoint(path: Path, device: torch.device) -> dict[str, Any]:
    try:
        state = torch.load(path, map_location=device, weights_only=False)
    except TypeError:
        state = torch.load(path, map_location=device)
    if isinstance(state, dict):
        for key in ('state_dict', 'model_state_dict', 'model'):
            candidate = state.get(key)
            if isinstance(candidate, dict):
                state = candidate
                break
    return _strip_module_prefix(state)


def _sigmoid_score(margin: float) -> float:
    margin = float(np.clip(margin, -20.0, 20.0))
    return float(100.0 / (1.0 + math.exp(-margin)))


def _score_items(decision: np.ndarray, predicted: np.ndarray, names: list[str]) -> list[dict[str, Any]]:
    decision = np.asarray(decision)
    predicted = np.asarray(predicted)
    if decision.ndim == 1:
        decision = decision.reshape(1, -1)
    if predicted.ndim == 1:
        predicted = predicted.reshape(1, -1)
    if decision.shape[-1] != len(names):
        # Some sklearn variants transpose this result.
        if decision.shape[0] == len(names) and decision.shape[-1] == 1:
            decision = decision.reshape(1, -1)
        else:
            raise RuntimeError(f'Classifier returned {decision.shape} outputs; expected {len(names)} labels.')
    values = []
    for i, name in enumerate(names):
        values.append({
            'name': name,
            'score': round(_sigmoid_score(float(decision[0, i])), 2),
            'raw_margin': round(float(decision[0, i]), 6),
            'predicted': bool(predicted[0, i]),
            'available': True,
        })
    return values


class QRADModel:
    """Production-style local inference engine for the supplied Q-RAD artifacts."""

    def __init__(self) -> None:
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.net: nn.Module | None = None
        self.classical: Any | None = None
        self.quantum_preprocessor: Any | None = None
        self.qsvc_models: dict[str, Any] = {}
        self.classical_path: Path | None = None
        self.checkpoint_path: Path | None = None
        self.quantum_preprocessor_path: Path | None = None
        self.quantum_load_errors: dict[str, str] = {}
        self.metrics = self._load_json('metrics_summary.json', {})
        self.last_reload = None
        self.reload()

    def _load_json(self, name: str, default: Any) -> Any:
        path = ARTIFACTS_DIR / name
        if not path.exists():
            return default
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            return default

    @staticmethod
    def _find_first(candidates: list[Path]) -> Path | None:
        return next((p for p in candidates if p.exists() and p.is_file()), None)

    def _load_densenet(self) -> None:
        candidates = [
            MODELS_DIR / 'best_densenet121.pth',
            MODELS_DIR / 'best_densenet121.pt',
            MODELS_DIR / 'densenet121.pth',
            ARTIFACTS_DIR / 'best_densenet121.pth',
        ]
        path = self._find_first(candidates)
        if path is None:
            return
        state = _load_checkpoint(path, self.device)
        classifier_weight = state.get('classifier.weight')
        output_dim = int(classifier_weight.shape[0]) if hasattr(classifier_weight, 'shape') else len(FINDINGS)
        if output_dim != len(FINDINGS):
            raise RuntimeError(f'DenseNet checkpoint output size is {output_dim}; expected {len(FINDINGS)}.')
        model = models.densenet121(weights=None)
        model.classifier = nn.Linear(model.classifier.in_features, len(FINDINGS))
        model.load_state_dict(state, strict=True)
        model.to(self.device).eval()
        self.net = model
        self.checkpoint_path = path

    def _load_classical(self) -> None:
        path = self._find_first([
            MODELS_DIR / 'classical_ovr_svm.joblib',
            MODELS_DIR / 'classical_svm.joblib',
            ARTIFACTS_DIR / 'classical_ovr_svm.joblib',
        ])
        if path is not None:
            self.classical = joblib.load(path)
            self.classical_path = path

    def _load_quantum(self) -> None:
        self.quantum_preprocessor = None
        self.quantum_preprocessor_path = None
        for path in [MODELS_DIR / 'quantum_preprocessor.joblib', ARTIFACTS_DIR / 'quantum_preprocessor.joblib']:
            if path.exists():
                self.quantum_preprocessor = joblib.load(path)
                self.quantum_preprocessor_path = path
                break

        self.qsvc_models = {}
        self.quantum_load_errors = {}
        if not QSVC_DIR.exists():
            return
        for idx, finding in enumerate(FINDINGS):
            candidates = [
                QSVC_DIR / f'qsvc_{idx:02d}_{finding}.dill',
                QSVC_DIR / f'qsvc_{idx:02d}_{finding}.joblib',
                QSVC_DIR / f'{finding}.dill',
                QSVC_DIR / f'{finding}.joblib',
            ]
            path = self._find_first(candidates)
            if path is None:
                continue
            try:
                if path.suffix.lower() == '.dill':
                    if dill is None:
                        raise RuntimeError('Unable to load serialized quantum model.')
                    with path.open('rb') as fh:
                        model = dill.load(fh)
                else:
                    model = joblib.load(path)
                self.qsvc_models[finding] = model
            except Exception as exc:
                self.quantum_load_errors[finding] = f'{type(exc).__name__}: {exc}'

    def reload(self) -> None:
        self.net = None
        self.classical = None
        self.quantum_preprocessor = None
        self.qsvc_models = {}
        self.classical_path = None
        self.checkpoint_path = None
        self.quantum_preprocessor_path = None
        self.quantum_load_errors = {}
        self._load_densenet()
        self._load_classical()
        self._load_quantum()
        self.last_reload = time.strftime('%Y-%m-%d %H:%M:%S')

    @property
    def readiness(self) -> dict[str, Any]:
        missing = []
        if self.net is None:
            missing.append('cnn')
        if self.classical is None:
            missing.append('classical')
        if self.quantum_preprocessor is None:
            missing.append('quantum_preprocessor')
        missing_q = [f for f in FINDINGS if f not in self.qsvc_models]
        return {
            'ready_for_classical': bool(self.net is not None and self.classical is not None),
            'ready_for_quantum': bool(self.net is not None and self.quantum_preprocessor is not None and not missing_q),
            'loaded_quantum_models': len(self.qsvc_models),
            'expected_quantum_models': len(FINDINGS),
            'missing_files': missing,
            'missing_quantum_models': missing_q,
            'quantum_load_errors': self.quantum_load_errors,
            'device': str(self.device),
            'last_reload': self.last_reload,
        }

    def model_inventory(self) -> dict[str, Any]:
        return {
            'cnn': {'loaded': self.net is not None, 'input_size': IMAGE_SIZE, 'feature_dimension': 1024},
            'classical': {'loaded': self.classical is not None, 'type': 'One-vs-Rest Linear SVM'},
            'quantum_preprocessor': {'loaded': self.quantum_preprocessor is not None},
            'qsvc': [{'name': f, 'loaded': f in self.qsvc_models} for f in FINDINGS],
        }

    def _forward_features(self, tensor: torch.Tensor, with_grad: bool = False):
        if self.net is None:
            raise RuntimeError('Inference engine is not ready.')
        x = tensor.to(self.device)
        if with_grad:
            self.net.zero_grad(set_to_none=True)
            fmap = F.relu(self.net.features(x), inplace=False)
            fmap.retain_grad()
            pooled = F.adaptive_avg_pool2d(fmap, 1).flatten(1)
            logits = self.net.classifier(pooled)
            return fmap, pooled, logits
        with torch.no_grad():
            fmap = F.relu(self.net.features(x), inplace=False)
            pooled = F.adaptive_avg_pool2d(fmap, 1).flatten(1)
            logits = self.net.classifier(pooled)
            return fmap, pooled, logits

    def _classical(self, features: np.ndarray) -> tuple[list[dict[str, Any]], float]:
        if self.classical is None:
            raise RuntimeError('Inference engine is not ready.')
        t0 = time.perf_counter()
        decision = self.classical.decision_function(features)
        predicted = self.classical.predict(features)
        items = _score_items(decision, predicted, FINDINGS)
        return sorted(items, key=lambda x: x['score'], reverse=True), time.perf_counter() - t0

    def _quantum(self, features: np.ndarray) -> tuple[list[dict[str, Any]], dict[str, Any], float]:
        t0 = time.perf_counter()
        if self.quantum_preprocessor is None or len(self.qsvc_models) != len(FINDINGS):
            return [], {'status': 'unavailable', 'input_dimension': None, 'input_values': []}, 0.0
        qx = np.asarray(self.quantum_preprocessor.transform(features), dtype=np.float64)
        items = []
        for finding in FINDINGS:
            model = self.qsvc_models[finding]
            pred_arr = np.asarray(model.predict(qx)).reshape(-1)
            pred = bool(pred_arr[0])
            if hasattr(model, 'decision_function'):
                margin = float(np.asarray(model.decision_function(qx)).reshape(-1)[0])
            else:
                # QSVC normally exposes decision_function; retain a deterministic fallback.
                margin = 1.0 if pred else -1.0
            items.append({
                'name': finding,
                'score': round(_sigmoid_score(margin), 2),
                'raw_margin': round(margin, 6),
                'predicted': pred,
                'available': True,
            })
        return sorted(items, key=lambda x: x['score'], reverse=True), {
            'status': 'ready',
            'input_dimension': int(qx.shape[-1]),
            'input_values': [round(float(v), 5) for v in qx.reshape(-1)],
        }, time.perf_counter() - t0

    def _gradcam(self, tensor: torch.Tensor, class_index: int, label: str) -> str:
        fmap, _, logits = self._forward_features(tensor, with_grad=True)
        logits[0, class_index].backward()
        grads = fmap.grad[0]
        activations = fmap.detach()[0]
        weights = grads.mean(dim=(1, 2), keepdim=True)
        cam = torch.relu((weights * activations).sum(dim=0))
        cam = cam / (cam.max() + 1e-8)
        cam = F.interpolate(cam[None, None], size=(IMAGE_SIZE, IMAGE_SIZE), mode='bilinear', align_corners=False)[0, 0]
        cam_np = cam.detach().cpu().numpy()
        raw = tensor[0].detach().cpu().numpy().transpose(1, 2, 0)
        raw = np.clip(raw * IMAGENET_STD + IMAGENET_MEAN, 0, 1)

        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(5.5, 5.5), dpi=150)
        ax.imshow(raw, cmap='gray')
        ax.imshow(cam_np, cmap='jet', alpha=0.42, vmin=0, vmax=1)
        ax.axis('off')
        ax.set_title(f'Attention view · {label}', fontsize=11, pad=10)
        buf = io.BytesIO()
        fig.tight_layout(pad=0.2)
        fig.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
        plt.close(fig)
        return base64.b64encode(buf.getvalue()).decode('ascii')

    def analyze(self, image: Image.Image, original_bytes: bytes) -> dict[str, Any]:
        if self.net is None or self.classical is None:
            raise RuntimeError('The inference engine is unavailable.')

        tensor = PREPROCESS(image).unsqueeze(0)
        started = time.perf_counter()

        feature_t0 = time.perf_counter()
        _, pooled, logits = self._forward_features(tensor, with_grad=False)
        features = pooled.detach().cpu().numpy().astype(np.float32)
        cnn_probs = torch.sigmoid(logits)[0].detach().cpu().numpy()
        feature_seconds = time.perf_counter() - feature_t0

        cnn_reference = [
            {'name': FINDINGS[i], 'score': round(float(cnn_probs[i] * 100.0), 2), 'predicted': bool(cnn_probs[i] >= 0.5)}
            for i in range(len(FINDINGS))
        ]
        cnn_reference.sort(key=lambda x: x['score'], reverse=True)
        cam_idx = int(np.argmax(cnn_probs))

        classical, classical_seconds = self._classical(features)
        quantum, quantum_meta, quantum_seconds = self._quantum(features)

        cam_started = time.perf_counter()
        gradcam = self._gradcam(tensor, cam_idx, FINDINGS[cam_idx])
        gradcam_seconds = time.perf_counter() - cam_started

        classical_positive = [x['name'] for x in classical if x.get('predicted')]
        quantum_positive = [x['name'] for x in quantum if x.get('predicted') is True]
        agreed = sorted(set(classical_positive).intersection(quantum_positive))

        image_hash = hashlib.sha256(original_bytes).hexdigest()[:16]
        top = classical[0] if classical else cnn_reference[0]
        image_base64 = base64.b64encode(original_bytes).decode('ascii')
        return {
            'analysis_id': image_hash,
            'status': 'complete',
            'top_finding': top['name'],
            'cnn_reference': cnn_reference,
            'classical': classical,
            'quantum': quantum,
            'quantum_meta': quantum_meta,
            'gradcam_base64': gradcam,
            'image_base64': image_base64,
            'feature_dimension': int(features.shape[-1]),
            'quantum_input_dimension': quantum_meta.get('input_dimension'),
            'comparison': {
                'classical_positive_findings': classical_positive,
                'quantum_positive_findings': quantum_positive,
                'agreed_findings': agreed,
                'agreement_count': len(agreed),
            },
            'timings': {
                'feature_extraction_seconds': round(feature_seconds, 3),
                'classical_seconds': round(classical_seconds, 3),
                'quantum_seconds': round(quantum_seconds, 3),
                'gradcam_seconds': round(gradcam_seconds, 3),
                'total_seconds': round(time.perf_counter() - started, 3),
            },
        }

    def circuit_info(self) -> dict[str, Any]:
        cfg_path = ARTIFACTS_DIR / 'qrad_config.json'
        cfg = self._load_json('qrad_config.json', {}) or {}
        q = cfg.get('quantum', {})
        out = {
            'qubits': q.get('qubits', 4),
            'reps': q.get('reps', 2),
            'feature_map': q.get('feature_map', 'ZZ Feature Map'),
            'kernel': q.get('kernel', 'Fidelity Quantum Kernel'),
            'classifier': q.get('classifier', 'QSVC'),
            'depth': 19,
            'operations': [],
            'text': '',
        }
        try:
            from qiskit.circuit.library import zz_feature_map
            qc = zz_feature_map(feature_dimension=out['qubits'], reps=out['reps'], entanglement='linear')
            out['depth'] = int(qc.depth())
            out['operations'] = [{'gate': str(inst.operation.name), 'qubits': [int(q) for q in inst.qubits]} for inst in qc.data]
            out['text'] = str(qc.draw(output='text', fold=-1))
        except Exception:
            pass
        return out
