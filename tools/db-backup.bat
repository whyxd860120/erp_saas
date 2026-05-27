@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

title Database Backup Tool

:: Check admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell Start-Process '%~dpnx0' -Verb RunAs
    exit /b
)

cls
echo ========================================
echo   Database Backup ^& Restore Tool
echo ========================================
echo.

:: Database configuration - MODIFY THESE
set DB_USER=inventory_user
set DB_PASS=inventory_pass123
set DB_HOST=localhost
set DB_PORT=3306
set DB_NAME=inventory_saas

:: Find MySQL tools
set MYSQL_DUMP=
set MYSQL_CLIENT=

if exist "C:\mysql\bin\mysqldump.exe" (
    set MYSQL_DUMP=C:\mysql\bin\mysqldump.exe
    set MYSQL_CLIENT=C:\mysql\bin\mysql.exe
) else if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" (
    set MYSQL_DUMP=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe
    set MYSQL_CLIENT=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
) else if exist "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysqldump.exe" (
    set MYSQL_DUMP=C:\Program Files\MySQL\MySQL Server 5.7\bin\mysqldump.exe
    set MYSQL_CLIENT=C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe
)

if "%MYSQL_DUMP%"=="" (
    echo ERROR: Cannot find MySQL tools!
    echo Please install MySQL or modify the script to specify the correct path.
    pause
    exit /b 1
)

echo Database: %DB_NAME% @ %DB_HOST%:%DB_PORT%
echo.
echo Choose an action:
echo 1. Backup database
echo 2. Restore database
echo 3. Exit
echo.
set /p CHOICE="Enter choice (1-3): "

if "%CHOICE%"=="1" goto BACKUP
if "%CHOICE%"=="2" goto RESTORE
if "%CHOICE%"=="3" exit /b
echo Invalid choice!
pause
exit /b

:BACKUP
echo.
echo [1/2] Backing up database...
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=db-backup-%TIMESTAMP%.sql

set /p SAVE_PATH="Enter backup file path (or press Enter for default): "
if "%SAVE_PATH%"=="" set SAVE_PATH=%BACKUP_FILE%

set MYSQL_PWD=%DB_PASS%
"%MYSQL_DUMP%" -u %DB_USER% -h %DB_HOST% -P %DB_PORT% --single-transaction --routines --triggers --result-file="%SAVE_PATH%" %DB_NAME%

if errorlevel 0 (
    if exist "%SAVE_PATH%" (
        for %%A in ("%SAVE_PATH%") do set SIZE=%%~zA
        set /a SIZE_MB=!SIZE! / 1048576
        echo [2/2] SUCCESS! File: %SAVE_PATH% (!SIZE_MB! MB^)
    ) else (
        echo FAILED! File not created.
    )
) else (
    echo FAILED! Error code: %errorlevel%
)
pause
goto :EOF

:RESTORE
echo.
set /p RESTORE_FILE="Enter backup file path to restore: "
if "%RESTORE_FILE%"=="" (
    echo ERROR: No file specified!
    pause
    goto :EOF
)

if not exist "%RESTORE_FILE%" (
    echo ERROR: File not found: %RESTORE_FILE%
    pause
    goto :EOF
)

echo.
echo WARNING: This will overwrite all data in database '%DB_NAME%'!
set /p CONFIRM="Are you sure? Type 'yes' to continue: "
if /i not "%CONFIRM%"=="yes" (
    echo Cancelled.
    pause
    goto :EOF
)

echo.
echo [1/2] Restoring database...
set MYSQL_PWD=%DB_PASS%
"%MYSQL_CLIENT%" -u %DB_USER% -h %DB_HOST% -P %DB_PORT% %DB_NAME% < "%RESTORE_FILE%"

if errorlevel 0 (
    echo [2/2] SUCCESS! Database restored.
) else (
    echo FAILED! Error code: %errorlevel%
)
pause
goto :EOF
