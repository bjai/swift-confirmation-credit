Write-Host "User: $env:USERNAME"
Write-Host "UserProfile: $env:USERPROFILE"
whoami

$workDir  = $PSScriptRoot
$iisPath  = "$workDir\frontend\dist\apps\mt910-app\browser"

# ── 1. Kill old NestJS process on port 3000 ────────────────────────────────
Write-Host "Stopping any process on port 3000..."
$oldPid = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess
if ($oldPid) {
    Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
    Write-Host "Killed PID $oldPid"
    Start-Sleep -Seconds 2
}

# ── 2. Build and deploy NestJS Backend ────────────────────────────────────
Write-Host "Deploying NestJS..."
Set-Location "$workDir\backend"
npm install
npm run build

# Restore .env from permanent server location (not in git)
$envSource = "C:\config\swift\.env"
$envDest   = "$workDir\backend\.env"
if (Test-Path $envSource) {
    Copy-Item $envSource $envDest -Force
    Write-Host ".env restored from $envSource"
} else {
    Write-Warning ".env not found at $envSource - backend may fail to start!"
}

# Restart NestJS via Scheduled Task
Write-Host "Restarting nest-backend-api..."
Stop-ScheduledTask "nest-backend-api" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Start-ScheduledTask "nest-backend-api"
Write-Host "Task state: $((Get-ScheduledTask 'nest-backend-api').State)"

# ── 3. Build Angular Frontend ─────────────────────────────────────────────
Write-Host "Deploying Angular..."
Set-Location "$workDir\frontend"
npm install
npm run build

# ── 4. Write web.config with IIS URL Rewrite + ARR proxy rules ────────────
Write-Host "Writing web.config to $iisPath..."
$webConfig = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3000/api/{R:1}" />
        </rule>
        <rule name="Angular SPA" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
'@

if (!(Test-Path $iisPath)) {
    New-Item -ItemType Directory -Path $iisPath -Force | Out-Null
}
$webConfig | Set-Content "$iisPath\web.config" -Encoding UTF8
Write-Host "web.config written."

# ── 5. Enable ARR proxy at machine level ──────────────────────────────────
Import-Module WebAdministration -ErrorAction SilentlyContinue
try {
    Set-WebConfigurationProperty `
        -PSPath "MACHINE/WEBROOT/APPHOST" `
        -Filter "system.webServer/proxy" `
        -Name "enabled" -Value $true
    Write-Host "ARR proxy enabled."
} catch {
    Write-Warning "Could not enable ARR proxy: $_"
}

# Ensure IIS site physical path points to the browser subfolder
try {
    $site = Get-Website | Where-Object { $_.Name -eq "Default Web Site" }
    if ($site -and $site.physicalPath -ne $iisPath) {
        Set-ItemProperty "IIS:\Sites\Default Web Site" -Name physicalPath -Value $iisPath
        Write-Host "IIS physical path updated to: $iisPath"
    }
} catch {
    Write-Warning "Could not update IIS physical path: $_"
}

# ── 6. Restart IIS ────────────────────────────────────────────────────────
Write-Host "Restarting IIS..."
iisreset /restart /noforce
Write-Host "IIS restarted."

# ── 7. Verify backend is responding ───────────────────────────────────────
Start-Sleep -Seconds 5
try {
    $r = Invoke-WebRequest http://localhost:3000/api/mt910/messages -UseBasicParsing -TimeoutSec 10
    Write-Host "Backend health check OK: HTTP $($r.StatusCode)"
} catch {
    Write-Warning "Backend health check failed: $_"
}

Write-Host "--- Deployment Complete ---"
