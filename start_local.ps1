# PulseSync - Full Local Dev Startup Script
# Run from: c:\Van\atypicsl
# Usage: .\start_local.ps1

$ErrorActionPreference = "Stop"
$RootDir   = $PSScriptRoot
$MongoPath = "C:\Program Files\MongoDB\Server\8.0\bin"
$MongoData = Join-Path $RootDir "mongodb-data"
$MongoPort = 27018
$MongoRS   = "rs0"

Write-Host "=== PulseSync Local Dev Setup ===" -ForegroundColor Cyan

# Add MongoDB to PATH for this session
$env:PATH = "$MongoPath;$env:PATH"

# Ensure MongoDB data directory exists
if (-not (Test-Path $MongoData)) {
    New-Item -ItemType Directory -Path $MongoData | Out-Null
    Write-Host "Created mongodb-data directory." -ForegroundColor Yellow
}

# Check if MongoDB is already running
$mongoRunning = Get-Process mongod -ErrorAction SilentlyContinue
if ($mongoRunning) {
    Write-Host "[MongoDB]  Already running (PID $($mongoRunning.Id))" -ForegroundColor Green
} else {
    Write-Host "[MongoDB]  Starting on port $MongoPort with replica set $MongoRS ..." -ForegroundColor Yellow
    Start-Process -FilePath "$MongoPath\mongod.exe" `
        -ArgumentList "--replSet $MongoRS --port $MongoPort --dbpath `"$MongoData`" --bind_ip_all" `
        -WindowStyle Minimized
    Write-Host "[MongoDB]  Waiting for startup..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # Initiate replica set if not already done
    Write-Host "[MongoDB]  Initiating replica set..." -ForegroundColor Yellow
    & "$MongoPath\mongosh.exe" --port $MongoPort --quiet --eval "try { rs.initiate({_id:'$MongoRS',members:[{_id:0,host:'127.0.0.1:$MongoPort'}]}) } catch(e) { print('RS already done: ' + e.message) }" 2>$null
    Start-Sleep -Seconds 3
    Write-Host "[MongoDB]  Ready!" -ForegroundColor Green
}

# Set backend environment variables
$env:MONGO_URI = "mongodb://127.0.0.1:${MongoPort}/?replicaSet=${MongoRS}&directConnection=true"
$env:REDIS_URI = "redis://localhost:6379/0"
$env:DB_NAME   = "push_architecture_db"

Write-Host "[ENV]  MONGO_URI = $env:MONGO_URI" -ForegroundColor DarkGray
Write-Host "[ENV]  DB_NAME   = $env:DB_NAME" -ForegroundColor DarkGray

# Start Backend in a new PowerShell window
Write-Host "[Backend]  Starting FastAPI on http://localhost:8000 ..." -ForegroundColor Yellow
$backendCmd = "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; cd '$RootDir'; .\venv\Scripts\Activate.ps1; `$env:MONGO_URI='mongodb://127.0.0.1:${MongoPort}/?replicaSet=${MongoRS}&directConnection=true'; `$env:REDIS_URI='redis://localhost:6379/0'; `$env:DB_NAME='push_architecture_db'; Write-Host 'Starting uvicorn...' -ForegroundColor Cyan; python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCmd

Start-Sleep -Seconds 3

# Start Frontend in a new PowerShell window
Write-Host "[Frontend] Starting Vite dev server on http://localhost:5173 ..." -ForegroundColor Yellow
$frontendCmd = "cd '$RootDir\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "=== All services started! ===" -ForegroundColor Green
Write-Host "  Frontend  ->  http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend   ->  http://localhost:8000" -ForegroundColor Green
Write-Host "  MongoDB   ->  localhost:27018 (replica set: rs0)" -ForegroundColor Green
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "  Admin:    admin@example.com / admin123" -ForegroundColor Cyan
Write-Host "  Customer: alice@example.com / alice123" -ForegroundColor Cyan
Write-Host "  Customer: bob@example.com   / bob123" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop: close the opened windows + run: Stop-Process -Name mongod" -ForegroundColor DarkGray
