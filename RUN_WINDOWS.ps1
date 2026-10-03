$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
if(-not(Test-Path '.venv\Scripts\python.exe')){ py -m venv .venv }
& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r .\backend\requirements.txt
if(-not(Test-Path '.\frontend\node_modules')){ Set-Location .\frontend; npm install; Set-Location .. }
python .\scripts\verify_setup.py
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$PSScriptRoot\backend'; & '$PSScriptRoot\.venv\Scripts\python.exe' -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$PSScriptRoot\frontend'; npm run dev -- --host 127.0.0.1 --port 5173"
Start-Sleep -Seconds 5
Start-Process 'http://127.0.0.1:5173'
