@echo off
title Frontend Dev Server Restart Tool

echo.
echo ========================================
echo  Restarting Frontend Server...
echo ========================================
echo.

cd /d "%~dp0"

REM Kill existing Node processes
taskkill /F /IM node.exe 2>nul

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo Starting frontend dev server...
echo ========================================
echo.

cd frontend
npm run dev

pause
