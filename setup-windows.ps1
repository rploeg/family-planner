# Family Planner - Windows Server Setup Script
# Run this script on your Windows Server as Administrator

Write-Host "=== Family Planner Windows Server Setup ===" -ForegroundColor Green

# 1. Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script as Administrator!" -ForegroundColor Red
    exit 1
}

# 2. Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js is installed: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "Node.js is not installed. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# 3. Check if Git is installed
try {
    $gitVersion = git --version
    Write-Host "Git is installed: $gitVersion" -ForegroundColor Green
}
catch {
    Write-Host "Git is not installed. Please install from https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

# 4. Install PM2 globally
Write-Host "`nInstalling PM2..." -ForegroundColor Yellow
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
Write-Host "PM2 installed" -ForegroundColor Green

# 5. Create directory structure
Write-Host "`nCreating directory structure..." -ForegroundColor Yellow
$baseDir = "C:\repo\family-planner"
New-Item -ItemType Directory -Force -Path $baseDir | Out-Null
Write-Host "Directory created at $baseDir" -ForegroundColor Green

# 6. Clone repository
Write-Host "`nCloning repository..." -ForegroundColor Yellow
$repoUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/rploeg/family-planner.git)"
if (Test-Path "$baseDir\.git") {
    Write-Host "Repository already exists, pulling latest..." -ForegroundColor Yellow
    Set-Location $baseDir
    git pull
}
else {
    Set-Location C:\repo
    git clone $repoUrl family-planner
}
Write-Host "Repository cloned/updated" -ForegroundColor Green

# 7. Setup Backend
Write-Host "`nSetting up backend..." -ForegroundColor Yellow
Set-Location "$baseDir\family-planner-backend"
npm install
Write-Host "Backend dependencies installed" -ForegroundColor Green

# 8. Copy .env file
Write-Host "`nPlease create/copy your .env file to: $baseDir\family-planner-backend\.env" -ForegroundColor Yellow
Write-Host "Required variables:" -ForegroundColor Yellow
Write-Host "  PORT=3002"
Write-Host "  DATABASE_PATH=./data/family-planner.db"
Write-Host "  CALDAV_SERVER_URL=https://caldav.icloud.com"
Write-Host "  CALDAV_USERNAME=your@icloud.com"
Write-Host "  CALDAV_PASSWORD=your-app-specific-password"
Write-Host "  CORS_ORIGIN=*"
$envReady = Read-Host "Press Enter when .env file is ready"

# 9. Configure Firewall
Write-Host "`nConfiguring Windows Firewall..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "Family Planner Backend" -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName "Family Planner Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Write-Host "Firewall rules added" -ForegroundColor Green
}
catch {
    Write-Host "Firewall rules may already exist" -ForegroundColor Yellow
}

# 10. Start services with PM2
Write-Host "`nStarting backend service..." -ForegroundColor Yellow
Set-Location "$baseDir\family-planner-backend"
pm2 start server.js --name family-planner-backend
pm2 save
Write-Host "Backend service started" -ForegroundColor Green

# 11. Build and deploy frontend
Write-Host "`nBuilding frontend..." -ForegroundColor Yellow
Set-Location "$baseDir\family-planner"
npm install

# Create production .env file
$serverIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*"} | Select-Object -First 1).IPAddress
$envContent = "REACT_APP_API_BASE_URL=http://${serverIP}:3002/api"
Set-Content -Path ".env.production.local" -Value $envContent
Write-Host "Frontend will use API at: http://${serverIP}:3002/api" -ForegroundColor Cyan

npm run build
Write-Host "Frontend built" -ForegroundColor Green

# 12. Start frontend with PM2
Write-Host "`nStarting frontend service..." -ForegroundColor Yellow
pm2 serve "$baseDir\family-planner\build" 3000 --name family-planner-frontend --spa
pm2 save
Write-Host "Frontend service started" -ForegroundColor Green

# 13. Display summary
Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "`nServices running:" -ForegroundColor Cyan
pm2 list

Write-Host "`nAccess your application:" -ForegroundColor Cyan
Write-Host "  Frontend: http://${serverIP}:3000" -ForegroundColor White
Write-Host "  Backend:  http://${serverIP}:3002/health" -ForegroundColor White

Write-Host "`nUseful commands:" -ForegroundColor Cyan
Write-Host "  pm2 status              - Check service status"
Write-Host "  pm2 logs                - View logs"
Write-Host "  pm2 restart all         - Restart all services"
Write-Host "  pm2 stop all            - Stop all services"

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Configure GitHub Actions secrets (see DEPLOYMENT.md)"
Write-Host "2. Push changes to GitHub to trigger automatic deployment"
Write-Host "3. Access the app from tablets using http://${serverIP}:3000"
