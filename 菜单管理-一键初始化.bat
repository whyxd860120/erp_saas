@echo off
chcp 65001 >nul
echo ========================================
echo 菜单管理 - 一键初始化
echo ========================================
echo.
echo 正在初始化菜单数据...
echo.

cd /d "%~dp0"

node scripts/init-menu-data.js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ 初始化成功！
    echo ========================================
    echo.
    echo 请在浏览器中刷新菜单管理页面
    echo 访问路径：/menus
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ 初始化失败
    echo ========================================
    echo.
    echo 请检查：
    echo 1. 后端服务器是否正在运行
    echo 2. 数据库连接是否正常
    echo.
)

pause
