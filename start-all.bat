@echo off
title NexDrop Fleet System Launcher
echo ========================================================
echo          Starting NexDrop Backend and Frontend
echo ========================================================

start "NexDrop Backend (FastAPI)" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

start "NexDrop Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are launching in dedicated windows!
echo - Frontend: http://localhost:3000/merchant/dashboard
echo - Backend:  http://127.0.0.1:8000/api/v1/docs
echo ========================================================
timeout /t 5

