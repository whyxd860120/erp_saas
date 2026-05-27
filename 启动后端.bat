@echo off
chcp 65001 >nul
title 数企管家 - 后端

echo ========================================
echo 数企管家 - 后端启动
echo ========================================
echo.

cd /d "%~dp0"

echo 正在启动后端...
echo.
npm run dev
