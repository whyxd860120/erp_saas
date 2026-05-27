@echo off
chcp 65001 >nul
title ERP System - Backend Service Fix & Test
color 0A

echo.
echo ========================================
echo   ERP Inventory System - Backend Fix
echo ========================================
echo.
echo This script will:
echo   1. Check environment configuration
echo   2. Fix database password mismatch
echo   3. Verify MySQL connection
echo   4. Start backend service
echo   5. Test API endpoint
echo.
echo Press any key to continue...
pause >nul
echo.

REM Set working directory
cd /d "%~dp0"

echo [Step 1] Checking current configuration...
echo ----------------------------------------

REM Check if .env file exists
if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please ensure you are running this from the project root directory.
    pause
    exit /b 1
)

echo Current DATABASE_URL in .env:
findstr "DATABASE_URL=" .env
echo.

echo [Step 2] Fixing database password mismatch...
echo ----------------------------------------

REM Create a backup of .env file
copy .env .env.backup >nul
echo Created backup: .env.backup

REM Fix the DATABASE_URL password to match DB_PASSWORD
REM Read DB_PASSWORD value
for /f "tokens=2 delims==" %%a in ('findstr "^DB_PASSWORD=" .env') do set DB_PASS=%%a

echo Detected DB_PASSWORD: %DB_PASS%

REM Use PowerShell to fix the DATABASE_URL
powershell -Command "$content = Get-Content '.env' -Encoding UTF8; $newContent = @(); foreach ($line in $content) { if ($line -match '^DATABASE_URL=') { $newContent += 'DATABASE_URL=\"mysql://root:%DB_PASS%@localhost:3306/erpnext_db?charset=utf8mb4\"'; } else { $newContent += $line; } }; $newContent | Set-Content '.env' -Encoding UTF8"

echo Updated DATABASE_URL with correct password
echo.

echo [Step 3] Verifying MySQL connection...
echo ----------------------------------------

REM Test MySQL connection
set MYSQL_PWD=%DB_PASS%
"C:\tools\mysql\current\bin\mysql.exe" -u root -h localhost -P 3306 -e "SELECT 'MySQL Connection OK' AS status;" erpnext_db >nul 2>&1

if %errorlevel% equ 0 (
    echo SUCCESS: MySQL connection verified
) else (
    echo WARNING: MySQL connection test failed
    echo Possible reasons:
    echo   1. MySQL service is not running
    echo   2. Database 'erpnext_db' does not exist
    echo   3. Password is incorrect
    echo.
    echo Please check MySQL service and try again.
    pause
    exit /b 1
)

echo.
echo [Step 4] Checking Node.js and dependencies...
echo ----------------------------------------

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo Node.js version:
node --version

if not exist "node_modules" (
    echo.
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo Dependencies installed successfully
) else (
    echo Dependencies already installed
)

echo.
echo [Step 5] Starting backend service...
echo ----------------------------------------
echo.
echo IMPORTANT: The backend will start in the background.
echo Check the output below for any errors.
echo.
echo To stop the server, press Ctrl+C in the server window.
echo.
echo Starting server in 3 seconds...
timeout /t 3 >nul

REM Start the backend server
start "ERP Backend Server" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo [Step 6] Waiting for server to start...
echo ----------------------------------------

REM Wait for server to initialize
echo Waiting 10 seconds for server to start...
timeout /t 10 >nul

echo.
echo [Step 7] Testing API endpoint...
echo ----------------------------------------

REM Test the search-tenants endpoint
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/auth/search-tenants?username=test' -Method GET -UseBasicParsing -TimeoutSec 5; Write-Host 'API Test Result:'; Write-Host 'Status Code:' $response.StatusCode; Write-Host 'Response:' $response.Content } catch { Write-Host 'API Test Failed:' $_.Exception.Message; Write-Host 'This may be normal if no matching tenants exist.' }"

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Check if the backend server window opened
echo   2. Look for 'Server running on http://localhost:3000' message
echo   3. Refresh your browser to test the frontend
echo   4. If you see errors, check the server window for details
echo.
echo Configuration changes:
echo   - Fixed DATABASE_URL password in .env
echo   - Backup saved as .env.backup
echo.
echo Troubleshooting:
echo   - If MySQL connection fails: Check MySQL service
echo   - If server won't start: Check error messages in server window
echo   - If API returns 502: Wait a few more seconds and refresh browser
echo.
echo Press any key to exit...
pause >nul
