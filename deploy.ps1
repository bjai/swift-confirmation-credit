Write-Host "User: $env:USERNAME"
Write-Host "UserProfile: $env:USERPROFILE"
whoami

# PM2 requires HOMEPATH/HOME - Network Service has no user profile so set it explicitly
if (-not $env:HOMEPATH) { $env:HOMEPATH = "C:\Users\Administrator" }
if (-not $env:HOME)     { $env:HOME     = "C:\Users\Administrator" }
if (-not $env:USERPROFILE) { $env:USERPROFILE = "C:\Users\Administrator" }

# Use system-level npm global path (accessible by all users including Network Service)
$pm2 = "C:\Program Files\nodejs\pm2.cmd"
if (-not (Test-Path $pm2)) {
    # Fallback: Administrator roaming npm
    $pm2 = "C:\Users\Administrator\AppData\Roaming\npm\pm2.cmd"
}
Write-Host "Using pm2 at: $pm2"

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
