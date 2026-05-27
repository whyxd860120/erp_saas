
@echo off
chcp 65001 &gt;nul
title 数企管家 - 前端服务

echo ========================================
echo 数企管家 - 前端服务
echo ========================================
echo.

cd /d "%~dp0\frontend"

echo 正在启动前端服务...
echo.

npm run dev

echo.
echo 前端服务已停止！
pause
