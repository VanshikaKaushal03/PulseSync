# Native Startup Script for Hybrid CDC App

# 1. Setup paths and directories
$MongoBin = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
if (-not (Test-Path $MongoBin)) {
    $MongoBin = "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
}
if (-not (Test-Path $MongoBin)) {
    $MongoBin = "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
}

$DbPath = "c:\Van\atypicsl\mongodb-data"
if (-not (Test-Path $DbPath)) {
    New-Item -ItemType Directory -Path $DbPath | Out-Null
}

# Clean stale lock files (prevents MongoDB startup errors)
$LockFile = Join-Path $DbPath "mongod.lock"
if (Test-Path $LockFile) {
    Write-Host "Removing stale mongod.lock..." -ForegroundColor Yellow
    Remove-Item $LockFile -Force
}

# 2. Start MongoDB Replica Set
Write-Host "Starting local MongoDB Replica Set on port 27018..." -ForegroundColor Green
if (Test-Path $MongoBin) {
    Start-Process $MongoBin -ArgumentList "--port", "27018", "--dbpath", $DbPath, "--replSet", "rs0", "--bind_ip", "127.0.0.1"
} else {
    Write-Host "Error: Could not find mongod.exe. Please run MongoDB manually on port 27018." -ForegroundColor Red
}

# Wait for MongoDB to start
Write-Host "Waiting 5 seconds for MongoDB to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 3. Initiate Replica Set
Write-Host "Verifying MongoDB Replica Set status..." -ForegroundColor Green
& .\venv\Scripts\python.exe backend\initiate_rs.py

# 4. Start FastAPI Backend in a separate window
Write-Host "Starting FastAPI Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\Van\atypicsl; Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned; .\venv\Scripts\Activate.ps1; uvicorn backend.main:app --reload --port 8000"

# 5. Start React Frontend
Write-Host "Starting React Frontend on http://localhost:5173/..." -ForegroundColor Green
cd frontend
npm run dev
