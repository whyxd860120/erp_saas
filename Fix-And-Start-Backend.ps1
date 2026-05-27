# ERP Inventory System - Backend Service Fix & Test Script
# Run this script on the remote server to fix and start the backend service

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ERP Inventory System - Backend Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot

# Step 1: Check environment
Write-Host "[Step 1] Checking environment..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ Project root: $ProjectRoot" -ForegroundColor Green

# Step 2: Backup and fix configuration
Write-Host ""
Write-Host "[Step 2] Fixing database configuration..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$envFile = Join-Path $ProjectRoot ".env"
$backupFile = Join-Path $ProjectRoot ".env.backup"

# Create backup
Copy-Item $envFile $backupFile -Force
Write-Host "✓ Created backup: .env.backup" -ForegroundColor Green

# Read current configuration
$content = Get-Content $envFile -Encoding UTF8
$dbPasswordLine = $content | Where-Object { $_ -match "^DB_PASSWORD=" }
$databaseUrlLine = $content | Where-Object { $_ -match "^DATABASE_URL=" }

if ($dbPasswordLine) {
    $dbPassword = ($dbPasswordLine -split "=")[1]
    Write-Host "Current DB_PASSWORD: $dbPassword" -ForegroundColor Cyan
    
    # Fix DATABASE_URL to use correct password
    $newDatabaseUrl = "DATABASE_URL=`"mysql://root:${dbPassword}@localhost:3306/erpnext_db?charset=utf8mb4`""
    
    $newContent = @()
    foreach ($line in $content) {
        if ($line -match "^DATABASE_URL=") {
            $newContent += $newDatabaseUrl
            Write-Host "✓ Updated DATABASE_URL with correct password" -ForegroundColor Green
        } else {
            $newContent += $line
        }
    }
    
    $newContent | Set-Content $envFile -Encoding UTF8
    Write-Host "✓ Configuration fixed successfully" -ForegroundColor Green
} else {
    Write-Host "WARNING: DB_PASSWORD not found in .env" -ForegroundColor Yellow
}

# Step 3: Verify MySQL connection
Write-Host ""
Write-Host "[Step 3] Verifying MySQL connection..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$mysqlPath = "C:\tools\mysql\current\bin\mysql.exe"
if (-not (Test-Path $mysqlPath)) {
    Write-Host "ERROR: MySQL not found at $mysqlPath" -ForegroundColor Red
    Write-Host "Please install MySQL or update the path in this script." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ MySQL found: $mysqlPath" -ForegroundColor Green

# Test connection
$env:MYSQL_PWD = $dbPassword
try {
    $testResult = & $mysqlPath -u root -h localhost -P 3306 -e "SELECT 'Connection OK' AS status;" erpnext_db 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ MySQL connection successful" -ForegroundColor Green
    } else {
        Write-Host "✗ MySQL connection failed" -ForegroundColor Red
        Write-Host "Error: $testResult" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible reasons:" -ForegroundColor Yellow
        Write-Host "  1. MySQL service is not running" -ForegroundColor White
        Write-Host "  2. Database 'erpnext_db' does not exist" -ForegroundColor White
        Write-Host "  3. Password is incorrect" -ForegroundColor White
        Write-Host ""
        Write-Host "To check MySQL service:" -ForegroundColor Cyan
        Write-Host "  Get-Service MySQL" -ForegroundColor Gray
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "✗ MySQL connection test error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 4: Check Node.js and dependencies
Write-Host ""
Write-Host "[Step 4] Checking Node.js and dependencies..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js >= 18.0.0" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if node_modules exists
$nodeModules = Join-Path $ProjectRoot "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    Set-Location $ProjectRoot
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

# Step 5: Start backend service
Write-Host ""
Write-Host "[Step 5] Starting backend service..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANT: A new window will open for the backend server." -ForegroundColor Cyan
Write-Host "Keep that window open - it shows server logs and errors." -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting server in 3 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Start the backend server in a new window
$serverScript = @"
cd "$ProjectRoot"
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverScript -WindowStyle Normal

Write-Host "✓ Backend server starting in new window..." -ForegroundColor Green

# Step 6: Wait and test API
Write-Host ""
Write-Host "[Step 6] Waiting for server to initialize..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

Write-Host "Waiting 15 seconds for server to start..." -ForegroundColor Gray
for ($i = 15; $i -gt 0; $i--) {
    Write-Host "`r  $i seconds remaining..." -NoNewline
    Start-Sleep -Seconds 1
}
Write-Host ""

Write-Host ""
Write-Host "[Step 7] Testing API endpoint..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/search-tenants?username=test" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "✓ API Test Successful!" -ForegroundColor Green
    Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host "  Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "⚠ API Test Result:" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  This may be normal if:" -ForegroundColor Gray
    Write-Host "    - Server is still starting up (wait a few more seconds)" -ForegroundColor Gray
    Write-Host "    - No matching tenants exist (this is OK)" -ForegroundColor Gray
    Write-Host "    - Server encountered an error (check server window)" -ForegroundColor Gray
}

# Final summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check the backend server window for startup messages" -ForegroundColor White
Write-Host "  2. Look for: 'Server running on http://localhost:3000'" -ForegroundColor White
Write-Host "  3. Refresh your browser to test the frontend" -ForegroundColor White
Write-Host "  4. If you see errors, check the server window for details" -ForegroundColor White
Write-Host ""
Write-Host "Configuration Changes:" -ForegroundColor Yellow
Write-Host "  ✓ Fixed DATABASE_URL password in .env" -ForegroundColor Green
Write-Host "  ✓ Backup saved as .env.backup" -ForegroundColor Green
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "  • If MySQL connection fails: Check MySQL service (Get-Service MySQL)" -ForegroundColor White
Write-Host "  • If server won't start: Check error messages in server window" -ForegroundColor White
Write-Host "  • If API returns 502: Wait 10 more seconds and refresh browser" -ForegroundColor White
Write-Host "  • To stop server: Close the server window or press Ctrl+C in it" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
