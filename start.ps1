# Start Docker Compose (MongoDB and Redis)
Write-Host "Starting Docker containers..." -ForegroundColor Green
docker compose up -d

# Check if docker failed
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker compose failed. Please ensure Docker Desktop is running and your terminal has been restarted since installing." -ForegroundColor Red
    exit 1
}

# Start FastAPI Backend in background
Write-Host "Starting FastAPI Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\Van\atypicsl; .\venv\Scripts\Activate.ps1; uvicorn backend.main:app --reload --port 8000"

# Wait 10 seconds for MongoDB Replica Set to elect a primary
Write-Host "Waiting 10s for replica set to stabilize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Seed DB (Optional)
Write-Host "Seeding database..." -ForegroundColor Green
.\venv\Scripts\python.exe backend\seed.py

# Start React Frontend
Write-Host "Starting React Frontend..." -ForegroundColor Green
cd frontend
npm run dev
