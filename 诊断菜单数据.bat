@echo off
chcp 65001 >nul
echo ========================================
echo 菜单数据诊断工具
echo ========================================
echo.
echo 正在检查数据库...
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
node scripts/diagnose-menus.js

echo.
echo ========================================
echo 诊断完成
echo ========================================
pause
