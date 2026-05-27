@echo off
chcp 65001 >nul
title 数企管家 - 启动前后端

echo ========================================
echo 数企管家 - 启动前后端
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 正在启动后端...
echo.
start "数企管家 - 后端" cmd /k "npm run dev"

echo.
echo ⏰ 等待3秒让后端先启动...
timeout /t 3 /nobreak >nul

echo.
echo [2/2] 正在启动前端...
echo.
start "数企管家 - 前端" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo ✅ 启动完成！
echo.
echo 📱 前端地址: http://localhost:8088
echo 🔧 后端地址: http://localhost:3000
echo ========================================
echo.
echo 💡 提示：
echo    - 后端窗口请保持运行
echo    - 前端窗口请保持运行
echo    - 如需停止，直接关闭对应窗口即可
echo.
pause
