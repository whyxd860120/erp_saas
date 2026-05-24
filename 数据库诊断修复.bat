@echo off
chcp 65001 >nul
title 数据库诊断工具

echo.
echo ========================================
echo    数据库诊断与修复
echo ========================================
echo.

cd /d "%~dp0"

REM 检查Node.js
echo 检查Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)
echo [OK] Node.js已安装
echo.

REM 检查npm
echo 检查npm...
npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到npm，请先安装Node.js
    pause
    exit /b 1
)
echo [OK] npm已安装
echo.

REM 检查.env文件
echo 检查环境配置文件...
if not exist ".env" (
    echo [警告] .env文件不存在，正在创建...
    (
        echo DATABASE_URL="mysql://root:password@localhost:3306/inventory_system"
        echo REDIS_HOST="localhost"
        echo REDIS_PORT="6379"
        echo REDIS_PASSWORD=""
        echo JWT_SECRET="your-super-secret-key-change-in-production"
        echo CORS_ORIGIN="http://localhost:5173"
    ) > .env
    echo [完成] 请编辑.env文件，配置正确的数据库连接
    echo.
) else (
    echo [OK] .env文件存在
)
echo.

REM 运行Prisma检查
echo 检查Prisma...
npx prisma --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Prisma未安装，正在安装...
    npm install prisma @prisma/client --save-dev
    npx prisma init
)
echo [OK] Prisma已就绪
echo.

REM 运行Prisma验证
echo 验证数据库schema...
npx prisma validate
if %ERRORLEVEL% NEQ 0 (
    echo [错误] schema验证失败，请检查schema文件
    pause
    exit /b 1
)
echo [OK] schema验证通过
echo.

REM 推送数据库更改
echo.
echo ========================================
echo    正在推送数据库更改...
echo ========================================
echo.
npx prisma db push

if %ERRORLEVEL% NEQ 0 (
    echo [错误] 数据库更新失败
    echo.
    echo 请检查：
    echo 1. MySQL服务是否运行
    echo 2. .env中的数据库连接是否正确
    echo 3. 数据库用户是否有足够权限
    pause
    exit /b 1
)

echo.
echo ========================================
echo    数据库更新成功！
echo ========================================
echo.
echo 正在生成Prisma客户端...
npx prisma generate

if %ERRORLEVEL% EQU 0 (
    echo [OK] Prisma客户端生成成功
) else (
    echo [警告] Prisma客户端生成可能有问题
)

echo.
echo ========================================
echo    诊断完成！
echo ========================================
echo.
echo 下一步：
echo 1. 重启后端服务
echo 2. 刷新前端页面
echo.

pause
