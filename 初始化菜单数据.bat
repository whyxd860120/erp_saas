@echo off
chcp 65001 >nul
echo ========================================
echo 菜单数据初始化脚本
echo ========================================
echo.
echo 正在检查环境...
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo ❌ 错误：未找到 node_modules
    echo 请先运行: npm install
    pause
    exit /b 1
)

echo ✅ 环境检查完成
echo.
echo 正在初始化菜单数据...
echo.

node scripts/init-menu-data.js

echo.
echo ========================================
echo 脚本执行完成
echo ========================================
pause
