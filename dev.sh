#!/bin/bash
# Uruchamia backend (FastAPI) i frontend (Vite) równocześnie.
# Użycie: bash dev.sh

cd "$(dirname "$0")"

# Backend
echo ">>> Starting backend on http://localhost:8000"
.venv/Scripts/python -m uvicorn api.index:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
echo ">>> Starting frontend on http://localhost:5173"
cd site && npm run dev &
FRONTEND_PID=$!

# Ctrl+C zamyka oba procesy
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
echo ""
echo ">>> Both running. Press Ctrl+C to stop."
wait
