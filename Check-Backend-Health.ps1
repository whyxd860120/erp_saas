# Quick Health Check Script for ERP Backend
# Run this to verify the backend is working correctly after fix

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ERP Backend - Quick Health Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Test 1: Check .env configuration
Write-Host "[1] Checking .env configuration..." -ForegroundColor Yellow
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Encoding UTF8
    $dbPassLine = $content | Where-Object { $_ -match "^DB_PASSWORD=" }
    $dbUrlLine = $content | Where-Object { $_ -match "^DATABASE_URL=" }
    
    if ($dbPassLine -and $dbUrlLine) {
        $dbPass = ($dbPassLine -split "=")[1]
        $dbUrl = ($dbUrlLine -split "=")[1].Trim('"')
        
        # Check if password matches
        if ($dbUrl -match "root:([^@]+)@") {
            $urlPass = $matches[1]
            if ($urlPass -eq $dbPass) {
                Write-Host "    ✓ Password configuration is correct" -ForegroundColor Green
            } else {
                Write-Host "    ✗ Password mismatch detected!" -ForegroundColor Red
                Write-Host "      DB_PASSWORD: $dbPass" -ForegroundColor White
                Write-Host "      DATABASE_URL: ...$urlPass..." -ForegroundColor White
                $allPassed = $false
            }
        }
    } else {
        Write-Host "    ✗ Configuration incomplete" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "    ✗ .env file not found" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""

# Test 2: Check MySQL service
Write-Host "[2] Checking MySQL service..." -ForegroundColor Yellow
try {
    $mysqlService = Get-Service MySQL -ErrorAction Stop
    if ($mysqlService.Status -eq "Running") {
        Write-Host "    ✓ MySQL service is running" -ForegroundColor Green
    } else {
        Write-Host "    ✗ MySQL service status: $($mysqlService.Status)" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "    ✗ MySQL service not found" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""

# Test 3: Test MySQL connection
Write-Host "[3] Testing MySQL connection..." -ForegroundColor Yellow
$dbPass = ($dbPassLine -split "=")[1]
$env:MYSQL_PWD = $dbPass
try {
    $result = & "C:\tools\mysql\current\bin\mysql.exe" -u root -h localhost -P 3306 -e "SELECT 1 AS test;" erpnext_db 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ MySQL connection successful" -ForegroundColor Green
    } else {
        Write-Host "    ✗ MySQL connection failed" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "    ✗ Connection test error: $_" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""

# Test 4: Check Node.js
Write-Host "[4] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "    ✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "    ✗ Node.js not found" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""

# Test 5: Check backend server
Write-Host "[5] Checking backend server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/search-tenants?username=test" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 3 `
        -ErrorAction Stop
    
    Write-Host "    ✓ Backend server is responding" -ForegroundColor Green
    Write-Host "      Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Message -match "502") {
        Write-Host "    ✗ Backend returns 502 (server not ready or crashed)" -ForegroundColor Red
        $allPassed = $false
    } elseif ($_.Exception.Message -match "refused") {
        Write-Host "    ✗ Backend server is not running" -ForegroundColor Red
        Write-Host "      Please start the server: npm run dev" -ForegroundColor Yellow
        $allPassed = $false
    } else {
        Write-Host "    ⚠ Backend response: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ✓ All checks passed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The backend is working correctly." -ForegroundColor Green
    Write-Host "You can now use the frontend application." -ForegroundColor Green
} else {
    Write-Host "  ✗ Some checks failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please review the errors above and fix them." -ForegroundColor Red
    Write-Host "Run Fix-And-Start-Backend.ps1 to auto-fix issues." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
