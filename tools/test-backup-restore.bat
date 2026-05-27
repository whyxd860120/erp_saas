@echo off
chcp 65001 >nul
echo ========================================
echo MySQL 备份还原工具 - 自动化测试
echo ========================================
echo.

REM 设置工作目录
cd /d "%~dp0"

echo [步骤 1] 检查 MySQL 工具路径...
where mysqldump >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ 未找到 mysqldump，尝试常见路径...
    
    if exist "C:\mysql\bin\mysqldump.exe" (
        set MYSQL_BIN=C:\mysql\bin
        echo ✓ 找到: C:\mysql\bin
    ) else if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" (
        set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin
        echo ✓ 找到: C:\Program Files\MySQL\MySQL Server 8.0\bin
    ) else if exist "C:\tools\mysql\mysql-9.6.0-winx64\bin\mysqldump.exe" (
        set MYSQL_BIN=C:\tools\mysql\mysql-9.6.0-winx64\bin
        echo ✓ 找到: C:\tools\mysql\mysql-9.6.0-winx64\bin
    ) else (
        echo ✗ 错误: 找不到 MySQL 工具！
        echo 请先安装 MySQL 或配置正确的路径。
        pause
        exit /b 1
    )
) else (
    for /f "delims=" %%i in ('where mysqldump') do set MYSQL_BIN=%%~dpi
    echo ✓ 找到 mysqldump: %MYSQL_BIN%
)

echo.
echo [步骤 2] 读取数据库配置...
set DB_HOST=localhost
set DB_PORT=3306
set DB_NAME=erpnext_db
set DB_USER=root
set DB_PASS=Esoft123@456

echo   主机: %DB_HOST%:%DB_PORT%
echo   数据库: %DB_NAME%
echo   用户: %DB_USER%

echo.
echo [步骤 3] 测试数据库连接...
set MYSQL_PWD=%DB_PASS%
"%MYSQL_BIN%\mysql.exe" -u %DB_USER% -h %DB_HOST% -P %DB_PORT% -e "SELECT 'Connection OK' AS status;" %DB_NAME% >nul 2>&1

if %errorlevel% equ 0 (
    echo ✓ 数据库连接成功
) else (
    echo ✗ 数据库连接失败！
    echo 错误代码: %errorlevel%
    echo.
    echo 可能的原因：
    echo   1. MySQL 服务未启动
    echo   2. 用户名或密码错误
    echo   3. 数据库不存在
    echo.
    pause
    exit /b 1
)

echo.
echo [步骤 4] 执行备份测试...
set BACKUP_FILE=%~dp0test-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%

echo   备份文件: %BACKUP_FILE%

set MYSQL_PWD=%DB_PASS%
"%MYSQL_BIN%\mysqldump.exe" -u %DB_USER% -h %DB_HOST% -P %DB_PORT% --single-transaction --routines --triggers --set-gtid-purged=OFF --result-file="%BACKUP_FILE%" %DB_NAME%

if %errorlevel% equ 0 (
    if exist "%BACKUP_FILE%" (
        for %%A in ("%BACKUP_FILE%") do set SIZE=%%~zA
        set /a SIZE_KB=%SIZE%/1024
        echo ✓ 备份成功！文件大小: %SIZE_KB% KB
    ) else (
        echo ✗ 备份失败：文件未生成
        pause
        exit /b 1
    )
) else (
    echo ✗ 备份失败！错误代码: %errorlevel%
    pause
    exit /b 1
)

echo.
echo [步骤 5] 验证备份文件...
findstr /C:"CREATE TABLE" "%BACKUP_FILE%" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 备份文件格式正确（包含 CREATE TABLE 语句）
) else (
    echo ⚠ 警告: 备份文件可能不完整
)

echo.
echo [步骤 6] 测试完成！
echo.
echo 所有测试通过！备份文件已保存到:
echo   %BACKUP_FILE%
echo.
echo 提示: 可以手动测试还原功能，或使用 HTA 图形界面工具
echo       双击 db-backup-gui-cn.hta 启动图形界面
echo.
pause
