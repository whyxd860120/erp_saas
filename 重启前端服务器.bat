@echo off
chcp 65001 >nul
title 前端开发服务器重启工具

echo.
echo ========================================
echo    🔄 前端服务器重启中...
echo ========================================
echo.

cd /d "%~dp0"

REM 检查是否已经有npm进程在运行
echo 检查前端服务状态...
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo 发现运行中的Node.js进程，正在停止...
    taskkill /F /IM node.exe 2>nul
    timeout /t 2 /nobreak >nul
    echo ✅ 已停止旧进程
) else (
    echo 没有发现运行中的Node.js进程
)

echo.
echo 正在启动前端开发服务器...
echo ========================================
echo.

cd frontend
npm run dev

pause
