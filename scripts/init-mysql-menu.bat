@echo off
chcp 65001 >nul
echo ==============================================
echo 🚀 MySQL 菜单数据初始化
echo ==============================================
echo.

cd /d "%~dp0"

set MYSQL_HOST=localhost
set MYSQL_PORT=3306
set MYSQL_USER=root
set MYSQL_PASSWORD=123456
set MYSQL_DATABASE=erpnext_db

echo 正在连接数据库...
echo.

mysql -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASSWORD% %MYSQL_DATABASE% < scripts/init-menu-data.sql

if %errorlevel% equ 0 (
    echo.
    echo ==============================================
    echo ✅ SQL脚本执行成功！
    echo ==============================================
    echo.
    echo 菜单数据已初始化完成！
    echo.
    echo 💡 请：
    echo 1. 启动后端服务器
    echo 2. 访问 http://localhost:5173/menus
    echo 3. 刷新页面
    echo.
) else (
    echo.
    echo ==============================================
    echo ❌ SQL脚本执行失败
    echo ==============================================
    echo.
    echo 请检查：
    echo 1. MySQL服务是否正在运行
    echo 2. 数据库连接信息是否正确
    echo 3. MySQL CLI是否在PATH中
    echo.
)

pause
