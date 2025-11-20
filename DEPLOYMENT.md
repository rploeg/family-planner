# Windows Server Deployment Setup

## Prerequisites

### 1. Windows Server Setup
- OpenSSH Server enabled ✅
- Node.js LTS installed (https://nodejs.org/)
- Git for Windows installed (https://git-scm.com/download/win)
- PM2 for process management

### 2. Install Node.js on Windows Server
```powershell
# Download and install Node.js LTS from nodejs.org
# Or use chocolatey:
choco install nodejs-lts
```

### 3. Install PM2 (Process Manager)
```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

### 4. Install Git
```powershell
choco install git
```

## Server Directory Setup

### Create deployment directories on Windows Server:
```powershell
# Open PowerShell as Administrator
mkdir C:\family-planner
mkdir C:\family-planner\backend
mkdir C:\family-planner\frontend
```

### Clone repository on Windows Server:
```powershell
cd C:\family-planner
git clone https://github.com/rploeg/family-planner.git repo
```

## GitHub Secrets Configuration

You need to add these secrets to your GitHub repository:

1. Go to your GitHub repository: `https://github.com/rploeg/family-planner`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

### Required Secrets:

- **WINDOWS_SERVER_HOST**: Your Windows server IP or hostname (e.g., `192.168.1.100`)
- **WINDOWS_SERVER_USER**: Windows username for SSH login (e.g., `Administrator`)
- **SSH_PRIVATE_KEY**: Your SSH private key (see below)

### Generate SSH Key Pair

On your Mac, generate an SSH key pair:
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/windows_deploy_key
```

This creates:
- `~/.ssh/windows_deploy_key` (private key) → Add to GitHub Secret
- `~/.ssh/windows_deploy_key.pub` (public key) → Add to Windows Server

### Add Public Key to Windows Server

Copy the public key to your Windows Server:
```bash
# From your Mac:
cat ~/.ssh/windows_deploy_key.pub | ssh Administrator@YOUR_WINDOWS_IP "powershell -Command \"Add-Content -Path 'C:\ProgramData\ssh\administrators_authorized_keys' -Value '\$input'; icacls 'C:\ProgramData\ssh\administrators_authorized_keys' /inheritance:r; icacls 'C:\ProgramData\ssh\administrators_authorized_keys' /grant SYSTEM:F; icacls 'C:\ProgramData\ssh\administrators_authorized_keys' /grant BUILTIN\Administrators:F\""
```

Or manually:
1. Copy content of `~/.ssh/windows_deploy_key.pub`
2. SSH into Windows: `ssh Administrator@YOUR_WINDOWS_IP`
3. Create/edit: `C:\ProgramData\ssh\administrators_authorized_keys`
4. Paste the public key
5. Set permissions:
```powershell
icacls "C:\ProgramData\ssh\administrators_authorized_keys" /inheritance:r
icacls "C:\ProgramData\ssh\administrators_authorized_keys" /grant SYSTEM:F
icacls "C:\ProgramData\ssh\administrators_authorized_keys" /grant BUILTIN\Administrators:F
```

## Backend Configuration on Windows Server

### 1. Copy .env file to server
```bash
# From your Mac, copy the backend .env to Windows
scp family-planner-backend/.env Administrator@YOUR_WINDOWS_IP:C:/family-planner/backend/
```

### 2. Initialize backend on Windows
SSH into Windows and run:
```powershell
cd C:\family-planner\repo\family-planner-backend
npm install
```

### 3. Start backend with PM2
```powershell
cd C:\family-planner\repo\family-planner-backend
pm2 start server.js --name family-planner-backend
pm2 save
```

## Frontend Configuration

The frontend will be built by GitHub Actions and deployed automatically.

### Serve with PM2
```powershell
pm2 serve C:\family-planner\frontend\build 3000 --name family-planner-frontend --spa
pm2 save
```

## Firewall Configuration

Open ports on Windows Firewall:
```powershell
# Backend API port
New-NetFirewallRule -DisplayName "Family Planner Backend" -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow

# Frontend port
New-NetFirewallRule -DisplayName "Family Planner Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

## Verify Deployment

After pushing to GitHub, the workflow will:
1. ✅ Deploy backend code to Windows Server
2. ✅ Install npm dependencies
3. ✅ Restart backend service with PM2
4. ✅ Build frontend on GitHub Actions
5. ✅ Deploy built frontend to Windows Server
6. ✅ Restart frontend service with PM2

Check status on Windows Server:
```powershell
pm2 list
pm2 logs family-planner-backend
pm2 logs family-planner-frontend
```

## Access Your App

- **Frontend**: `http://YOUR_WINDOWS_IP:3000`
- **Backend API**: `http://YOUR_WINDOWS_IP:3002/health`

## Troubleshooting

### Check PM2 status:
```powershell
pm2 status
pm2 logs --lines 100
```

### Manually restart services:
```powershell
pm2 restart family-planner-backend
pm2 restart family-planner-frontend
```

### Check Windows firewall:
```powershell
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Family Planner*"}
```

### Test SSH connection from Mac:
```bash
ssh -i ~/.ssh/windows_deploy_key Administrator@YOUR_WINDOWS_IP
```

## Alternative: IIS Deployment (Optional)

If you prefer IIS instead of PM2 for the frontend:

1. Install IIS on Windows Server
2. Install IIS Node module: https://github.com/Azure/iisnode
3. Configure IIS site pointing to `C:\family-planner\frontend\build`
4. Set up reverse proxy for backend API

## Automatic Deployment

Once configured, simply push to GitHub:
```bash
git add .
git commit -m "Update app"
git push origin master
```

GitHub Actions will automatically deploy to your Windows Server!
