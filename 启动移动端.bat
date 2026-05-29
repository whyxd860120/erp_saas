@echo off
chcp 65001 >nul
echo ========================================
echo   ERP 进销存系统 - 移动端开发启动
echo ========================================
echo.
echo 请选择启动模式:
echo   1. H5 浏览器模式（开发调试）
echo   2. 微信小程序模式
echo   3. App 模式
echo   0. 退出
echo.
set /p choice="请输入选项 (0-3): "

if "%choice%"=="1" (
    echo.
    echo 启动 H5 模式...
    cd /d "%~dp0frontend-mobile"
    npm run dev:h5
) else if "%choice%"=="2" (
    echo.
    echo 启动微信小程序模式...
    cd /d "%~dp0frontend-mobile"
    npm run dev:mp-weixin
) else if "%choice%"=="3" (
    echo.
    echo 启动 App 模式...
    cd /d "%~dp0frontend-mobile"
    npm run dev:app
) else if "%choice%"=="0" (
    exit /b 0
) else (
    echo 无效选项，请重新运行
    pause
)
