@echo off
chcp 65001 >nul
title MySQL Database Backup Tool

echo ========================================
echo   MySQL Database Backup & Restore Tool
echo ========================================
echo.
echo Starting graphical interface...
echo.

REM Check if HTA file exists
if not exist "%~dp0db-backup-gui-cn.hta" (
    echo Error: db-backup-gui-cn.hta not found!
    echo Please ensure you are running this from the tools directory.
    pause
    exit /b 1
)

REM Launch HTA application
start "" "%~dp0db-backup-gui-cn.hta"

echo.
echo Tool launched successfully!
echo The window should appear shortly.
echo.
echo If it doesn't open, try right-clicking db-backup-gui-cn.hta
echo and select "Open with" -> "Microsoft HTML Application host"
echo.
