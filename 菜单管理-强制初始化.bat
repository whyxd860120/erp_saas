@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 菜单数据强制初始化
echo ========================================
echo.
echo ⚠️  此操作将删除所有现有菜单数据并重新创建
echo.
set /p confirm="确认继续？(Y/N): "
if /i not "%confirm%"=="Y" (
    echo 操作已取消
    pause
    exit /b
)

echo.
echo 正在初始化菜单数据...
echo.

cd /d "%~dp0"

node scripts/force-insert-menus.js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ 初始化成功！
    echo ========================================
    echo.
    echo 请在浏览器中访问菜单管理页面：
    echo http://localhost:5173/menus
    echo.
    echo 然后刷新页面（按F5）
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ 初始化失败
    echo ========================================
    echo.
)

pause
