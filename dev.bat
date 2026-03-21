@echo off
echo Starting backend on http://localhost:8000
start "GABI Backend" cmd /k "cd /d d:\_AI\gabi_site && .venv\Scripts\python -m uvicorn api.index:app --reload --port 8000"

echo Starting frontend on http://localhost:5173
start "GABI Frontend" cmd /k "cd /d d:\_AI\gabi_site\site && npm run dev"

echo Both servers starting in separate windows.
