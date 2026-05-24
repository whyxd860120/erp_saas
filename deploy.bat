@echo off
chcp 65001 >nul
echo ========================================
echo   ERP2026 进销存管理系统 - 部署脚本
echo ========================================
echo.

REM 检查Node.js
echo [1/5] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到Node.js，请先安装Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js 已安装
node --version
echo.

REM 检查npm
echo [2/5] 检查npm环境...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm不可用
    pause
    exit /b 1
)
echo ✅ npm 已安装
npm --version
echo.

REM 进入后端目录
echo [3/5] 进入后端目录...
cd /d "%~dp0backend"
if errorlevel 1 (
    echo ❌ 后端目录不存在
    pause
    exit /b 1
)
echo ✅ 后端目录确认
echo.

REM 安装后端依赖
echo [4/5] 安装后端依赖...
call npm install
if errorlevel 1 (
    echo ❌ 后端依赖安装失败
    pause
    exit /b 1
)
echo ✅ 后端依赖安装完成
echo.

REM 应用数据库迁移
echo [5/5] 应用数据库迁移...
call npx prisma generate
if errorlevel 1 (
    echo ❌ Prisma客户端生成失败
    pause
    exit /b 1
)
echo ✅ Prisma客户端生成完成
echo.

REM 提示启动服务
echo ========================================
echo   部署准备完成！
echo ========================================
echo.
echo 下一步操作：
echo.
echo 1. 确保MySQL服务已启动
echo    - 在服务管理器中启动MySQL服务
echo    - 或运行: net start mysql
echo.
echo 2. 确保Redis服务已启动
echo    - 使用Docker: docker run -d -p 6379:6379 redis:7-alpine
echo.
echo 3. 配置环境变量
echo    - 编辑 backend\.env 文件
echo    - 设置 DATABASE_URL 和 REDIS_URL
echo.
echo 4. 启动服务
echo    - 后端: cd backend ^&^& npm run dev
echo    - 前端: cd frontend ^&^& npm run dev
echo.
echo 详细部署指南请查看: docs\DEPLOYMENT_GUIDE.md
echo.
pause