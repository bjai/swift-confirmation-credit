Write-Host "User: $env:USERNAME"
Write-Host "UserProfile: $env:USERPROFILE"
whoami
# 1. Handle NestJS Backend
echo "Deploying NestJS..."
Set-Location "$PSScriptRoot\backend"
npm install
npm run build

# Use pm2.cmd to avoid PowerShell execution policy blocking pm2.ps1
$pm2 = "C:\Users\Administrator\AppData\Roaming\npm\pm2.cmd"

# Check if the process is already running
$processExists = & $pm2 list 2>&1 | Select-String "nest-backend-api"

if ($processExists) {
    echo "Restarting existing process..."
    & $pm2 restart nest-backend-api --update-env
} else {
    echo "Starting new process..."
    & $pm2 start dist/main.js --name nest-backend-api
}

# 2. Handle Angular Frontend
echo "Deploying Angular..."
Set-Location "$PSScriptRoot\frontend"
npm install
npm run build
