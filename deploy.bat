@echo off
chcp 65001 >nul

:: ERP2026 进销存管理系统 - 部署脚本 (Windows)
:: 使用方式: deploy.bat [开发|生产]

setlocal enabledelayedexpansion

set "ENV=%~1"
if not defined ENV set ENV=生产

echo ==================================
echo   ERP2026 部署脚本
echo   环境: %ENV%
echo ==================================

:: 检查 Node.js
echo.
echo [INFO] 检查 Node.js 版本...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

:: 获取 Node.js 版本
for /f "tokens=2 delims=v." %%a in ('node --version') do (
    set "NODE_VERSION=%%a"
)
if !NODE_VERSION! lss 18 (
    echo [ERROR] Node.js 版本要求 >= 18，当前版本: !NODE_VERSION!
    pause
    exit /b 1
)
echo [INFO] Node.js 版本: OK

:: 前端构建
echo.
echo [INFO] 进入前端目录...
cd frontend

echo.
echo [INFO] 安装依赖...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] 安装依赖失败
    pause
    exit /b 1
)

echo.
echo [INFO] 构建前端项目...
if "%ENV%"=="开发" (
    npm run build:dev
) else (
    npm run build:prod
)
if %errorlevel% neq 0 (
    echo [ERROR] 构建失败
    pause
    exit /b 1
)

:: 部署到服务器（生产环境）
if not "%ENV%"=="生产" (
    echo.
    echo [INFO] 开发环境跳过服务器部署
    goto :end
)

echo.
echo [INFO] 部署到生产服务器...
echo [WARN] 请手动将 frontend\dist 目录部署到服务器
echo [WARN] 服务器路径: /var/www/erp2026

:end
echo.
echo ==================================
echo   部署流程完成！
echo ==================================
pause
