# 1. Handle NestJS Backend
echo "Deploying NestJS..."
cd backend
npm install
npm run build

# PowerShell-friendly PM2 logic
$pm2Path = "C:\Users\Administrator\AppData\Roaming\npm\pm2.ps1"

# Check if the process is already running
$processExists = & $pm2Path list | Select-String "nest-backend-api"

if ($processExists) {
    echo "Restarting existing process..."
    & $pm2Path restart nest-backend-api --update-env
} else {
    echo "Starting new process..."
    & $pm2Path start dist/main.js --name nest-backend-api
}

# 2. Handle Angular Frontend
echo "Deploying Angular..."
cd ../frontend
npm install
npm run build --configuration=production
