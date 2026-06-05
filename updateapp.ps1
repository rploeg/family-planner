Write-Host "Updating Family Planner..." -ForegroundColor Cyan

# Pull latest code
Set-Location C:\repo\family-planner
Write-Host "Pulling latest code from GitHub..." -ForegroundColor Yellow
git pull origin master

# Update backend
Write-Host "Updating backend..." -ForegroundColor Yellow
Set-Location family-planner-backend
npm install --legacy-peer-deps
pm2 restart family-planner-backend

# Update frontend
Write-Host "Updating frontend..." -ForegroundColor Yellow
Set-Location ..\family-planner
npm install --legacy-peer-deps
npm run build

Write-Host "`nUpdate complete! Frontend will use new build on next request." -ForegroundColor Green
Write-Host "Backend restarted automatically." -ForegroundColor Green
