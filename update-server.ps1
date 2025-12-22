# Family Planner - Server Update Script
# Run this script on the Windows Server to update to the latest code from GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Family Planner - Server Update" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to repository
Set-Location C:\repo\family-planner

# Pull latest code
Write-Host "[1/5] Pulling latest code from GitHub..." -ForegroundColor Yellow
git pull origin master

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to pull from GitHub. Check your git configuration." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Code updated successfully" -ForegroundColor Green
Write-Host ""

# Update backend dependencies
Write-Host "[2/5] Updating backend dependencies..." -ForegroundColor Yellow
Set-Location family-planner-backend
npm install --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Backend npm install had issues, but continuing..." -ForegroundColor Yellow
}

Write-Host "[OK] Backend dependencies updated" -ForegroundColor Green
Write-Host ""

# Restart backend
Write-Host "[3/5] Restarting backend service..." -ForegroundColor Yellow
pm2 restart family-planner-backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to restart backend with PM2" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Backend restarted successfully" -ForegroundColor Green
Write-Host ""

# Update frontend dependencies
Write-Host "[4/5] Updating frontend dependencies..." -ForegroundColor Yellow
Set-Location ..\family-planner
npm install --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Frontend npm install had issues, but continuing..." -ForegroundColor Yellow
}

Write-Host "[OK] Frontend dependencies updated" -ForegroundColor Green
Write-Host ""

# Rebuild frontend
Write-Host "[5/6] Building frontend..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Frontend build failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Frontend built successfully" -ForegroundColor Green
Write-Host ""

# Restart frontend serve
Write-Host "[6/6] Restarting frontend service..." -ForegroundColor Yellow
pm2 restart family-planner-frontend

if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Failed to restart frontend with PM2" -ForegroundColor Yellow
    Write-Host "You may need to manually restart the serve process" -ForegroundColor Yellow
}
else {
    Write-Host "[OK] Frontend restarted successfully" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Update Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend: Restarted automatically (PM2)" -ForegroundColor Green
Write-Host "Frontend: Rebuilt and restarted (PM2)" -ForegroundColor Green
Write-Host ""
Write-Host "If PM2 restart failed, manually restart frontend:" -ForegroundColor Yellow
Write-Host "  pm2 stop family-planner-frontend" -ForegroundColor White
Write-Host "  pm2 start serve --name family-planner-frontend -- -s build -l 3000" -ForegroundColor White
Write-Host ""
