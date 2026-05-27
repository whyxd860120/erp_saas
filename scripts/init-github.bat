@echo off
chcp 65001 > nul
echo ============================================
echo   Link to GitHub Remote Repository
echo ============================================
echo.
set /p repo_url="Enter GitHub repository URL (e.g., https://github.com/your-username/inventory-system.git): "

if "%repo_url%"=="" (
    echo [ERROR] Repository URL cannot be empty!
    pause
    exit /b 1
)

echo.
echo Linking to remote repository...
git remote add origin %repo_url%
git branch -M main

echo.
echo Pushing code to GitHub...
git push -u origin main

echo.
echo ============================================
if %errorlevel% equ 0 (
    echo   Push successful!
    echo ============================================
    echo.
    echo Repository URL: %repo_url%
    echo.
    echo Common Git commands:
    echo   git add .              # Add all changes
    echo   git commit -m "message"  # Commit changes
    echo   git push              # Push to GitHub
    echo   git pull              # Pull latest code
) else (
    echo   Push failed! Please check your repository URL
    echo ============================================
)
echo.
pause
