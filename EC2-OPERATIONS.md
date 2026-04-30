# EC2 Server Operations Guide

## Server Details
- **OS**: Windows Server 2025
- **EC2 Instance**: ec2amaz-hk6tbln
- **User**: Administrator
- **Runner**: GitHub Actions self-hosted (`C:\actions-runner`)

---

## Backend (NestJS)

The backend runs as a **Windows Scheduled Task** named `nest-backend-api`.
It starts automatically on server boot.

### Start
```powershell
Start-ScheduledTask "nest-backend-api"
```

### Stop
```powershell
Stop-ScheduledTask "nest-backend-api"
```

### Restart
```powershell
Stop-ScheduledTask "nest-backend-api"
Start-Sleep -Seconds 2
Start-ScheduledTask "nest-backend-api"
```

### Check Status
```powershell
(Get-ScheduledTask "nest-backend-api").State
# Expected: Running
```

### Test API
```powershell
Invoke-WebRequest http://localhost:3000/api/mt910/messages -UseBasicParsing
```

### View Logs (run manually to see console output)
```powershell
cd "C:\actions-runner\_work\swift-confirmation-credit\swift-confirmation-credit\backend"
node dist/main.js
```

---

## Frontend (Angular)

The Angular app is built and served via **IIS**.

### Build output location
```
C:\actions-runner\_work\swift-confirmation-credit\swift-confirmation-credit\frontend\dist\apps\mt910-app\browser
```

### Point IIS to the build output
```powershell
Import-Module WebAdministration
Set-ItemProperty "IIS:\Sites\Default Web Site" -Name physicalPath `
  -Value "C:\actions-runner\_work\swift-confirmation-credit\swift-confirmation-credit\frontend\dist\apps\mt910-app\browser"
```

---

## File Processing Folders

MT910 input/output folders on the server:

| Purpose   | Path                        |
|-----------|-----------------------------|
| Input     | `C:\config\mt`              |
| Processed | `C:\config\mt\processed`    |
| Rejected  | `C:\config\mt\rejected`     |

### Create folders (one-time setup)
```powershell
New-Item -ItemType Directory -Force "C:\config\mt"
New-Item -ItemType Directory -Force "C:\config\mt\processed"
New-Item -ItemType Directory -Force "C:\config\mt\rejected"
```

---

## Environment Config (.env)

Location on server:
```
C:\actions-runner\_work\swift-confirmation-credit\swift-confirmation-credit\backend\.env
```

> ⚠️ This file is NOT in git (excluded by `.gitignore`).
> After a fresh clone or runner reset, recreate it manually.

### Recreate .env
```powershell
@"
PORT=3000
DB_HOST=database-1.ca1g6eaey1j8.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=MondayCredi&8853$
DB_NAME=postgres
INPUT_FOLDER=C:\config\mt
PROCESSED_FOLDER=C:\config\mt\processed
REJECTED_FOLDER=C:\config\mt\rejected
"@ | Set-Content "C:\actions-runner\_work\swift-confirmation-credit\swift-confirmation-credit\backend\.env"
```

---

## GitHub Actions Runner

The CI/CD runner runs as a Windows service under `NT AUTHORITY\SYSTEM`.

### Check runner service status
```powershell
Get-Service "actions.runner.*"
```

### Restart runner service
```powershell
Restart-Service "actions.runner.bjai-swift-confirmation-credit.EC2AMAZ-HK6TBLN"
```

### Reconfigure runner (if broken)
1. Get a new token from: GitHub repo → Settings → Actions → Runners → New self-hosted runner
2. Run on EC2:
```cmd
cd C:\actions-runner
config.cmd remove --token OLD_TOKEN
config.cmd --url https://github.com/bjai/swift-confirmation-credit --token NEW_TOKEN --name EC2AMAZ-HK6TBLN --runasservice --windowslogonaccount "LocalSystem" --unattended
```

---

## Deployment

Deployment is **automatic** on every push to the `main` branch via GitHub Actions.

To trigger manually:
```powershell
# On your local machine
git commit --allow-empty -m "trigger deploy"
git push
```

### What deploy.ps1 does
1. `npm install && npm run build` in `/backend`
2. Restarts the `nest-backend-api` scheduled task
3. `npm install && npm run build` in `/frontend`

---

## AWS Security Group

Ensure these inbound rules are open:

| Port | Protocol | Source    | Purpose        |
|------|----------|-----------|----------------|
| 80   | TCP      | 0.0.0.0/0 | Frontend (IIS) |
| 3000 | TCP      | 0.0.0.0/0 | Backend API (optional if proxied via IIS) |
| 3389 | TCP      | Your IP   | RDP access     |
