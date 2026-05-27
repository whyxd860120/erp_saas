@echo off
chcp 65001 >nul
title 数企管家 - 前端

echo ========================================
echo 数企管家 - 前端启动
echo ========================================
echo.

cd /d "%~dp0"
cd frontend

echo 正在启动前端...
echo.
npm run dev
