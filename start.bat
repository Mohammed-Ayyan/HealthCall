@echo off
setlocal
echo =======================================================
echo   CareOps AI - One-Click Full-Stack System Launcher
echo =======================================================
echo.

echo [1/4] Checking and Installing Node Dependencies...
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend && call npm install && cd ..
)

echo.
echo [2/4] Checking and Setting up AI Engine Python Environment...
cd ai-engine
if not exist ".venv" (
    echo Creating Python virtual environment in ai-engine\.venv...
    python -m venv .venv
)
call .venv\Scripts\activate.bat
echo Verifying Python packages...
pip install -r requirements.txt
cd ..

echo.
echo [3/4] Ensuring Database Demo Profiles are Initialized...
cd backend
call node scripts/seedDatabase.js
cd ..

echo.
echo [4/4] Starting CareOps AI Stack in Parallel:
echo   - Web Frontend: http://localhost:3000
echo   - Backend API:  http://localhost:5000
echo   - AI Engine:    http://127.0.0.1:8000
echo.
echo Press Ctrl+C at any time to stop all services.
echo =======================================================

call npx -y concurrently -n "BACKEND,AI-ENGINE,FRONTEND" -c "cyan,magenta,green" "node backend/server.js" "ai-engine\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir ai-engine" "npm run dev"
