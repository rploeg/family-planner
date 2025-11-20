# Quick Start: Deploy to Windows Server

## Step 1: Prepare Your Windows Server

### Install Prerequisites
1. **Node.js LTS**: Download from https://nodejs.org/
2. **Git for Windows**: Download from https://git-scm.com/download/win
3. **OpenSSH Server**: Already enabled ✅

### Run the Setup Script
1. Copy `setup-windows.ps1` to your Windows Server
2. Open PowerShell as Administrator
3. Run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   .\setup-windows.ps1
   ```

The script will:
- ✅ Install PM2 process manager
- ✅ Create directory structure
- ✅ Clone your repository
- ✅ Install dependencies
- ✅ Configure firewall
- ✅ Start services automatically

## Step 2: Configure GitHub Actions

### Generate SSH Keys on Your Mac
```bash
ssh-keygen -t rsa -b 4096 -C "github-deploy" -f ~/.ssh/windows_deploy_key
```

### Add Public Key to Windows Server
```bash
# Get your Windows server IP
WINDOWS_IP="192.168.1.XXX"  # Replace with your server IP

# Copy public key to Windows
cat ~/.ssh/windows_deploy_key.pub | ssh Administrator@$WINDOWS_IP "powershell -Command \"Add-Content -Path 'C:\ProgramData\ssh\administrators_authorized_keys' -Value '\$input'\""
```

### Set Permissions on Windows (SSH to server and run):
```powershell
icacls "C:\ProgramData\ssh\administrators_authorized_keys" /inheritance:r
icacls "C:\ProgramData\ssh\administrators_authorized_keys" /grant SYSTEM:F
icacls "C:\ProgramData\ssh\administrators_authorized_keys" /grant BUILTIN\Administrators:F
```

### Add Secrets to GitHub

1. Go to: https://github.com/rploeg/family-planner/settings/secrets/actions
2. Click "New repository secret" and add:

| Secret Name | Value |
|-------------|-------|
| `WINDOWS_SERVER_HOST` | Your Windows IP (e.g., `192.168.1.100`) |
| `WINDOWS_SERVER_USER` | Your Windows username (e.g., `Administrator`) |
| `SSH_PRIVATE_KEY` | Content of `~/.ssh/windows_deploy_key` file |

To get the private key content:
```bash
cat ~/.ssh/windows_deploy_key
# Copy everything including -----BEGIN and -----END lines
```

## Step 3: Deploy!

### Push to GitHub
```bash
cd /Users/remco/repo/pms-access-api
git add .
git commit -m "Add deployment workflow"
git push origin master
```

### Monitor Deployment
1. Go to: https://github.com/rploeg/family-planner/actions
2. Watch the deployment progress
3. Check for any errors

## Step 4: Access Your App

Once deployed:
- **Frontend**: `http://YOUR_WINDOWS_IP:3000`
- **Backend API**: `http://YOUR_WINDOWS_IP:3002/health`
- **From tablets**: Use the same URL

## Troubleshooting

### Check Services on Windows Server
```powershell
pm2 status
pm2 logs family-planner-backend
pm2 logs family-planner-frontend
```

### Test SSH Connection
```bash
ssh -i ~/.ssh/windows_deploy_key Administrator@YOUR_WINDOWS_IP
```

### Check Firewall
```powershell
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Family Planner*"}
```

### Restart Services
```powershell
pm2 restart all
```

## Network Access for Tablets

Make sure tablets can reach your Windows server:
1. Tablets and server on same network
2. Windows Firewall allows ports 3000 and 3002
3. Use server's local IP: `http://192.168.1.XXX:3000`

## Update CORS for Network Access

Update backend `.env` on Windows server:
```env
CORS_ORIGIN=http://192.168.1.XXX:3000
```

Or allow all (less secure):
```env
CORS_ORIGIN=*
```

Then restart:
```powershell
pm2 restart family-planner-backend
```

---

**That's it!** Every time you push to GitHub, your Windows server will automatically update! 🚀
