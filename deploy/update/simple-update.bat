@echo off
chcp 65001 >nul
echo ==========================================
echo    ERP 进销存系统 - 一键更新工具
echo ==========================================
echo.

set SERVER_IP=192.168.1.100
set SERVER_PATH=C:\inventory-system

echo 服务器: %SERVER_IP%
echo 目标路径: %SERVER_PATH%
echo.

echo [1/3] 正在构建项目...
cd /d E:\project\ERP2026\inventory-system

echo  - 构建后端...
npm run build
if errorlevel 1 (
    echo 后端构建失败！
    pause
    exit /b 1
)

echo  - 构建前端...
cd frontend
npm run build
if errorlevel 1 (
    echo 前端构建失败！
    pause
    exit /b 1
)
cd ..

echo.
echo [2/3] 准备部署包...
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set PKG_NAME=update-%TIMESTAMP%.zip
set TEMP_DIR=%TEMP%\inventory-deploy-%TIMESTAMP%

mkdir "%TEMP_DIR%\dist"
mkdir "%TEMP_DIR%\frontend\dist"

xcopy /E /I /Y "dist\*" "%TEMP_DIR%\dist\"
xcopy /E /I /Y "frontend\dist\*" "%TEMP_DIR%\frontend\dist\"

if exist "prisma\migrations" (
    mkdir "%TEMP_DIR%\prisma"
    xcopy /E /I /Y "prisma\migrations" "%TEMP_DIR%\prisma\migrations"
)

echo  - 打包: %PKG_NAME%
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%TEMP%\%PKG_NAME%' -Force"

echo.
echo [3/3] 上传到服务器...

rem 检查服务器连接
ping -n 1 %SERVER_IP% >nul
if errorlevel 1 (
    echo 无法连接到服务器 %SERVER_IP%
    echo 请检查网络连接
    pause
    exit /b 1
)

rem 复制到服务器
set REMOTE_PATH=\\%SERVER_IP%\C$\inventory-system\updates

if not exist "%REMOTE_PATH%" (
    echo 正在连接服务器共享...
    net use \\%SERVER_IP%\C$
)

if exist "%REMOTE_PATH%" (
    copy /Y "%TEMP%\%PKG_NAME%" "%REMOTE_PATH%\"
    echo 上传完成！
) else (
    echo 无法访问服务器共享
    echo 请手动复制文件: %TEMP%\%PKG_NAME%
    echo 到服务器: %SERVER_PATH%\updates\
    pause
    exit /b 1
)

rem 清理临时文件
rmdir /S /Q "%TEMP_DIR%"
del "%TEMP%\%PKG_NAME%"

echo.
echo ==========================================
echo    部署包已上传到服务器！
echo ==========================================
echo.
echo 请在服务器上运行更新脚本:
echo   %SERVER_PATH%\deploy\update\update-server.ps1
echo.
echo 或者使用以下命令远程执行:
echo   powershell -File deploy\update\deploy-to-server.ps1 -RestartService
echo.
pause
