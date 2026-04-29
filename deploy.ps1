# Stop script on first error
$ErrorActionPreference = "Stop"

echo "--- Starting Deployment ---"

# 1. Handle NestJS Backend
echo "Deploying NestJS..."
cd backend
npm install
npm run build
# Start or Restart with PM2
pm2 restart nest-backend-api --update-env || pm2 start dist/main.js --name nest-backend-api

# 2. Handle Angular Frontend
echo "Deploying Angular..."
cd ../frontend
npm install
npm run build --configuration=production

# Note: For Angular, you simply point your IIS site to the 
# folder: C:\actions-runner\_work\your-repo\your-repo\frontend\dist\your-app-name\browser
echo "--- Deployment Complete ---"