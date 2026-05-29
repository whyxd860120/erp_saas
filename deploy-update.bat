@echo off
chcp 65001 >nul
echo ==========================================
echo 开始更新部署...
echo ==========================================

REM 1. 拉取最新代码
echo.
echo 1. 拉取最新代码...
git pull origin main
if %errorlevel% neq 0 (
    echo ❌ 代码拉取失败！
    pause
    exit /b 1
)
echo ✅ 代码拉取成功

REM 2. 安装依赖
echo.
echo 2. 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败！
    pause
    exit /b 1
)
echo ✅ 依赖安装成功

REM 3. 同步数据库结构
echo.
echo 3. 同步数据库结构...
call npx prisma db push
if %errorlevel% neq 0 (
    echo ❌ 数据库同步失败！
    pause
    exit /b 1
)
echo ✅ 数据库同步成功

REM 4. 生成 Prisma Client
echo.
echo 4. 生成 Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Prisma Client 生成失败！
    pause
    exit /b 1
)
echo ✅ Prisma Client 生成成功

REM 5. 构建项目
echo.
echo 5. 构建项目...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 项目构建失败！
    pause
    exit /b 1
)
echo ✅ 项目构建成功

echo.
echo ==========================================
echo 🎉 更新完成！请重启后端服务！
echo ==========================================
pause
