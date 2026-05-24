@echo off
chcp 65001 >nul
echo ========================================
echo   ERP系统 - 数据库快速更新工具
echo ========================================
echo.
echo [1/3] 正在检查数据库连接...
echo.

REM 检查MySQL是否可用
where mysql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [警告] 未找到MySQL命令行工具
    echo.
    echo 请手动执行以下SQL脚本：
    echo   文件位置：%~dp0prisma\add_parent_id_field.sql
    echo.
    echo 或者使用数据库管理工具（Navicat/DBeaver等）执行该SQL文件
    echo.
) else (
    echo [提示] 找到MySQL命令行工具
    echo.
    echo 正在执行数据库更新...
    mysql -uroot -perpnext123 erpnext_db < "%~dp0prisma\add_parent_id_field.sql"
    if %ERRORLEVEL% EQU 0 (
        echo [成功] 数据库更新完成！
    ) else (
        echo [提示] SQL执行可能有问题，请手动检查
    )
    echo.
)

echo [2/3] 重新生成Prisma Client...
echo.
cd /d "%~dp0"
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [提示] Prisma生成可能有问题，请确保已安装依赖
)
echo.

echo [3/3] 完成！
echo.
echo ========================================
echo   接下来请按以下步骤操作：
echo ========================================
echo.
echo 1. 停止正在运行的后端服务（Ctrl+C）
echo 2. 重新启动后端：npm run dev
echo 3. 刷新浏览器页面
echo.
echo 按任意键退出...
pause >nul
