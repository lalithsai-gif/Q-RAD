from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
required = {
    'fastapi':'fastapi', 'uvicorn':'uvicorn', 'Pillow':'PIL', 'numpy':'numpy', 'sklearn':'sklearn',
    'torch':'torch', 'torchvision':'torchvision', 'dill':'dill', 'qiskit':'qiskit',
}
print('Q-RAD runtime check')
print('=' * 54)
missing=[]
for label, mod in required.items():
    ok=importlib.util.find_spec(mod) is not None
    print(f'{label:14} : {"OK" if ok else "MISSING"}')
    if not ok: missing.append(label)
print('-' * 54)
print(f'Python          : {sys.version.split()[0]}')
print(f'Backend folder  : {ROOT / "backend"}')
print(f'Frontend folder : {ROOT / "frontend"}')
if missing:
    print('\nRuntime dependencies still need installation.')
    raise SystemExit(1)
print('\nRuntime dependencies: READY')
