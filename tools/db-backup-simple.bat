@echo off
chcp 65001 >nul 2>&1
title Database Backup Tool

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~dp0db-backup-simple.ps1' -Verb RunAs"
    exit /b
)

REM Run PowerShell script with admin privileges
powershell -ExecutionPolicy Bypass -File "%~dp0db-backup-simple.ps1"

pause
