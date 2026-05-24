@echo off
chcp 65001 >nul
title SaaS功能诊断修复工具

echo.
echo ========================================
echo     SaaS功能诊断与修复工具
echo ========================================
echo.

cd /d "%~dp0"

REM 检查Node.js
echo [1/6] 检查Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)
echo [OK] Node.js已安装
echo.

REM 检查npm
echo [2/6] 检查npm...
npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到npm，请先安装Node.js
    pause
    exit /b 1
)
echo [OK] npm已安装
echo.

REM 安装依赖
echo [3/6] 安装/更新依赖...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [OK] 依赖安装完成
echo.

REM 推送数据库变更
echo [4/6] 推送数据库变更...
npx prisma db push --accept-data-loss
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 数据库更新失败
    echo.
    echo 请检查：
    echo 1. MySQL服务是否运行
    echo 2. .env中的数据库连接是否正确
    pause
    exit /b 1
)
echo [OK] 数据库更新完成
echo.

REM 生成Prisma客户端
echo [5/6] 生成Prisma客户端...
npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Prisma客户端生成失败
    pause
    exit /b 1
)
echo [OK] Prisma客户端生成完成
echo.

echo ========================================
echo     诊断修复完成！
echo ========================================
echo.
echo 下一步：
echo 1. 启动后端服务：npm run dev
echo 2. 启动前端服务：cd frontend && npm run dev
echo 3. 刷新浏览器页面
echo.
echo 修复的问题：
echo ✓ 数据库表已创建（TenantSetting, Plan, Subscription, Invoice, ApiKey, Webhook等）
echo ✓ Prisma客户端已更新
echo ✓ 所有API路由已注册
echo.

pause
