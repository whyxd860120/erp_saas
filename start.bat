@echo off
chcp 65001 >nul
echo ========================================
echo   启动ERP2026服务
echo ========================================
echo.

REM 进入后端目录
cd /d "%~dp0backend"

REM 启动后端服务
echo 启动后端服务...
start "ERP2026-Backend" cmd /k "npm run dev"

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 进入前端目录
cd /d "%~dp0frontend"

REM 启动前端服务
echo 启动前端服务...
start "ERP2026-Frontend" cmd /k "npm run dev"

echo ========================================
echo   服务启动完成！
echo ========================================
echo.
echo 后端地址: http://localhost:3000
echo 前端地址: http://localhost:5173
echo API文档: http://localhost:3000/api-docs
echo.
echo 按任意键关闭此窗口（服务将继续运行）...
pause >nul