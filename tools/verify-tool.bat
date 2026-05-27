@echo off
chcp 65001 >nul
echo ========================================
echo MySQL 备份还原工具 - 最终验证
echo ========================================
echo.

cd /d "%~dp0"

echo [1] 检查 MySQL 服务...
sc query MySQL | findstr "RUNNING" >nul
if %errorlevel% equ 0 (
    echo     ✓ MySQL 服务正在运行
) else (
    echo     ✗ MySQL 服务未运行
    echo     请先启动 MySQL 服务
    pause
    exit /b 1
)

echo.
echo [2] 检查 MySQL 工具...
if exist "C:\tools\mysql\current\bin\mysqldump.exe" (
    echo     ✓ mysqldump.exe 存在
) else (
    echo     ✗ mysqldump.exe 不存在
    pause
    exit /b 1
)

if exist "C:\tools\mysql\current\bin\mysql.exe" (
    echo     ✓ mysql.exe 存在
) else (
    echo     ✗ mysql.exe 不存在
    pause
    exit /b 1
)

echo.
echo [3] 检查配置文件...
if exist "db-config.ini" (
    echo     ✓ db-config.ini 存在
) else (
    echo     ✗ db-config.ini 不存在
    pause
    exit /b 1
)

echo.
echo [4] 检查 HTA 工具...
if exist "db-backup-gui-cn.hta" (
    echo     ✓ db-backup-gui-cn.hta 存在
) else (
    echo     ✗ db-backup-gui-cn.hta 不存在
    pause
    exit /b 1
)

echo.
echo [5] 测试数据库连接...
set MYSQL_PWD=Esoft123@456
"C:\tools\mysql\current\bin\mysql.exe" -u root -h localhost -P 3306 -e "SELECT 1;" erpnext_db >nul 2>&1
if %errorlevel% equ 0 (
    echo     ✓ 数据库连接正常
) else (
    echo     ✗ 数据库连接失败
    echo     请检查配置是否正确
    pause
    exit /b 1
)

echo.
echo [6] 执行快速备份测试...
set BACKUP_FILE=%~dp0verify-backup.sql
"C:\tools\mysql\current\bin\mysqldump.exe" -u root -h localhost -P 3306 --single-transaction --set-gtid-purged=OFF --default-character-set=utf8mb4 --result-file="%BACKUP_FILE%" erpnext_db >nul 2>&1

if %errorlevel% equ 0 (
    if exist "%BACKUP_FILE%" (
        for %%A in ("%BACKUP_FILE%") do set SIZE=%%~zA
        set /a SIZE_KB=%SIZE%/1024
        echo     ✓ 备份成功 (文件大小: %SIZE_KB% KB)
        
        REM 清理测试文件
        del "%BACKUP_FILE%" >nul 2>&1
    ) else (
        echo     ✗ 备份文件未生成
        pause
        exit /b 1
    )
) else (
    echo     ✗ 备份失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✓ 所有验证通过！
echo ========================================
echo.
echo 工具已准备就绪，可以安全使用。
echo.
echo 使用方法:
echo   1. 双击 db-backup-gui-cn.hta 启动图形界面
echo   2. 或运行 db-backup-restore.ps1 使用 PowerShell 版本
echo.
echo 详细说明请查看: README-使用说明.md
echo.
pause
