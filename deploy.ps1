Write-Host "User: $env:USERNAME"
Write-Host "UserProfile: $env:USERPROFILE"
whoami

# 1. Handle NestJS Backend
echo "Deploying NestJS..."
Set-Location "$PSScriptRoot\backend"
npm install
npm run build

# Restore .env from permanent server location (not in git)
$envSource = "C:\config\swift\.env"
$envDest   = "$PSScriptRoot\backend\.env"
if (Test-Path $envSource) {
    Copy-Item $envSource $envDest -Force
    Write-Host ".env restored from $envSource"
} else {
    Write-Warning ".env not found at $envSource - backend may fail to start!"
}

# Restart NestJS via Scheduled Task (works for any service account)
echo "Restarting nest-backend-api..."
Stop-ScheduledTask "nest-backend-api" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-ScheduledTask "nest-backend-api"
Write-Host "Task state: $((Get-ScheduledTask 'nest-backend-api').State)"

# 2. Handle Angular Frontend
echo "Deploying Angular..."
Set-Location "$PSScriptRoot\frontend"
npm install
npm run build

echo "--- Deployment Complete ---"
