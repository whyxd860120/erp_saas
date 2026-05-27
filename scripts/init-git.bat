@echo off
chcp 65001 > nul
echo ============================================
echo   Git Repository Initialization Script
echo ============================================
echo.

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git not installed!
    echo Please install Git first: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [1/5] Initializing Git repository...
git init

echo.
echo [2/5] Adding all files...
git add .

echo.
echo [3/5] Creating initial commit...
git commit -m "Initial commit - ERP2026 Inventory System"

echo.
echo [4/5] Creating develop branch...
git checkout -b develop

echo.
echo [5/5] Switching back to main branch...
git checkout main

echo.
echo ============================================
echo   Git repository initialized successfully!
echo ============================================
echo.
echo Next steps:
echo 1. Login to GitHub and create a new repository
echo 2. Run these commands to link remote repository:
echo    git remote add origin https://github.com/your-username/inventory-system.git
echo    git branch -M main
echo    git push -u origin main
echo.
pause
