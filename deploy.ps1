Write-Host "User: $env:USERNAME"
Write-Host "UserProfile: $env:USERPROFILE"
whoami

# Ensure npm global bin is in PATH (runner service may not inherit Administrator's user PATH)
$npmGlobal = "C:\Users\Administrator\AppData\Roaming\npm"
if ($env:PATH -notlike "*$npmGlobal*") {
    $env:PATH = "$npmGlobal;$env:PATH"
    Write-Host "Added $npmGlobal to PATH"
}

$pm2 = "$npmGlobal\pm2.cmd"
if (-not (Test-Path $pm2)) {
    throw "pm2.cmd not found at $pm2 — run: npm install -g pm2 as Administrator on the EC2 server"
}

# 1. Handle NestJS Backend
echo "Deploying NestJS..."
Set-Location "$PSScriptRoot\backend"
npm install
npm run build

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
