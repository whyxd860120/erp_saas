@echo off
chcp 65001 >nul
echo ========================================
echo   安装移动端依赖
echo ========================================
echo.
cd /d "%~dp0frontend-mobile"
echo 正在安装依赖，请稍候...
call npm install
echo.
if %errorlevel% equ 0 (
    echo 依赖安装成功！
    echo.
    echo 快速开始:
    echo   1. 启动 H5 模式（浏览器调试）: npm run dev:h5
    echo   2. 启动微信小程序模式: npm run dev:mp-weixin
    echo   3. 启动 App 模式: npm run dev:app
    echo.
    echo 或双击运行 启动移动端.bat 选择启动模式
) else (
    echo 依赖安装失败，请检查网络连接后重试。
)
pause
