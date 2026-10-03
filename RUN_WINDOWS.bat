@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo Q-RAD - Quantum Radiology
echo ==============================================

where py >nul 2>nul
if %errorlevel%==0 (set "PY=py") else (set "PY=python")
if not exist ".venv\Scripts\python.exe" (
  echo Creating local Python environment...
  %PY% -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt

if not exist "frontend\node_modules" (
  echo Installing web application packages...
  cd frontend
  npm install
  cd ..
)

python scripts\verify_setup.py
if errorlevel 1 pause & exit /b 1

start "Q-RAD API" cmd /k "cd /d %~dp0backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 3 /nobreak >nul
start "Q-RAD UI" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 127.0.0.1 --port 5173"
timeout /t 5 /nobreak >nul
start "" http://127.0.0.1:5173

echo.
echo Q-RAD is running.
echo UI : http://127.0.0.1:5173
echo API: http://127.0.0.1:8000/docs
endlocal
