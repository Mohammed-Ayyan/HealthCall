#!/usr/bin/env bash
set -e

echo "======================================================="
echo "   CareOps AI - One-Command Full-Stack System Launcher"
echo "======================================================="
echo ""

echo "[1/4] Checking and Installing Node Dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
fi
if [ ! -d "backend/node_modules" ]; then
    (cd backend && npm install)
fi

echo ""
echo "[2/4] Setting up Python Environment for AI Engine..."
cd ai-engine
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt
cd ..

echo ""
echo "[3/4] Ensuring Database Demo Profiles are Initialized..."
(cd backend && node scripts/seedDatabase.js)

echo ""
echo "[4/4] Starting CareOps AI Stack in Parallel:"
echo "  - Web Frontend: http://localhost:3000"
echo "  - Backend API:  http://localhost:5000"
echo "  - AI Engine:    http://127.0.0.1:8000"
echo ""
echo "Press Ctrl+C at any time to stop all services."
echo "======================================================="

npx -y concurrently -n "BACKEND,AI-ENGINE,FRONTEND" -c "cyan,magenta,green" \
  "node backend/server.js" \
  "ai-engine/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir ai-engine" \
  "npm run dev"
