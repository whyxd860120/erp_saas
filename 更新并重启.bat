@echo off
chcp 65001 >nul
title 数企管家 - 更新并重启

echo ========================================
echo 数企管家 - 更新并重启
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 正在拉取最新代码...
git pull origin main
if errorlevel 1 (
    echo.
    echo ❌ Git拉取失败！
    echo.
    pause
    exit /b 1
)
echo.
echo ✅ 代码拉取成功！
echo.

echo [2/5] 检查是否有需要重启的服务...
echo.
echo ========================================
echo ⚠️  请手动关闭正在运行的后端和前端窗口
echo 按任意键继续...
echo ========================================
pause >nul

echo.
echo [3/5] 准备启动后端...
echo.
start "数企管家 - 后端" cmd /k "npm run dev"

echo.
echo ⏰ 等待3秒让后端先启动...
timeout /t 3 /nobreak >nul

echo.
echo [4/5] 准备启动前端...
echo.
start "数企管家 - 前端" cmd /k "cd frontend && npm run dev"

echo.
echo [5/5] 完成！
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
