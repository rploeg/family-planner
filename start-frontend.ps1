# Family Planner - Startup Script for Frontend
# This script is designed to be run at Windows startup via Task Scheduler

Write-Host "Starting Family Planner Frontend..." -ForegroundColor Cyan

# Navigate to frontend directory
Set-Location C:\repo\family-planner\family-planner

# Check if build folder exists
if (-not (Test-Path "build")) {
    Write-Host "Error: Build folder not found. Run 'npm run build' first." -ForegroundColor Red
    exit 1
}

# Start the frontend server
Write-Host "Starting serve on port 3000..." -ForegroundColor Green
serve -s build -l 3000
