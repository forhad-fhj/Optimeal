@echo off
echo Starting OptiMeal Setup...

echo.
echo Starting Database...
docker-compose up -d

echo.
echo Waiting for DB...
timeout /t 10

echo.
echo Initializing Backend...
cd api
if not exist venv_prod (
    python -m venv venv_prod
    call venv_prod\Scripts\activate
    pip install -r requirements.txt
)
call venv_prod\Scripts\activate
python init_db.py

echo.
echo Starting Backend Server...
start "OptiMeal API" python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo Setting up Frontend...
cd ../web
if not exist node_modules (
    call npm install
)

echo.
echo Starting Frontend...
start "OptiMeal Web" npm run dev

echo.
echo OptiMeal is running!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8000/docs
pause
