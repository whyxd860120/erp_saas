
@echo off
chcp 65001 &gt;nul
title 数企管家 - 后端服务

echo ========================================
echo 数企管家 - 后端服务
echo ========================================
echo.

cd /d "%~dp0"

echo 正在启动后端服务...
echo.

npm run dev

echo.
echo 后端服务已停止！
pause
