@echo off
chcp 65001 >nul
echo ========================================
echo ERP 后端服务器启动器
echo ========================================
echo.

cd /d "%~dp0"

echo 检查环境...
echo.

REM 检查node是否可用
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到 Node.js
    echo.
    echo 请先安装 Node.js：
    echo 1. 访问 https://nodejs.org/
    echo 2. 下载并安装 LTS 版本
    echo 3. 安装时勾选 "Add to PATH"
    echo 4. 重新打开此窗口
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js 已找到
echo.

REM 检查npm是否可用
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到 npm
    echo.
    pause
    exit /b 1
)

echo ✅ npm 已找到
echo.

REM 检查依赖
if not exist "node_modules" (
    echo 📦 首次运行，正在安装依赖...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo 启动后端服务器...
echo ========================================
echo.
echo 服务器地址: http://localhost:3000
echo API文档: http://localhost:3000/api-docs
echo.
echo 按 Ctrl+C 停止服务器
echo.

npm run dev

pause
