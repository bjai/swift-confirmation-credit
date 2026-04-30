Write-Host "User: $env:USERNAME"
Write-Host "UserProfile: $env:USERPROFILE"
whoami

# 1. Handle NestJS Backend
echo "Deploying NestJS..."
Set-Location "$PSScriptRoot\backend"
npm install
npm run build

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
