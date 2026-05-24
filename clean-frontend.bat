@echo off
chcp 65001 >nul
echo ========================================
echo   清理前端缓存并重启
echo ========================================
echo.

cd /d "%~dp0frontend"

echo [1/3] 停止开发服务器...
taskkill /F /IM node.exe 2>nul

echo [2/3] 清理缓存...
if exist node_modules (
    echo 正在删除 node_modules...
    rmdir /s /q node_modules
)

if exist dist (
    echo 正在删除 dist 目录...
    rmdir /s /q dist
)

if exist .vite (
    echo 正在删除 .vite 缓存目录...
    rmdir /s /q .vite
)

if exist package-lock.json (
    echo 正在删除 package-lock.json...
    del package-lock.json
)

echo [3/3] 重新安装依赖...
call npm install

echo ========================================
echo   缓存清理完成！
echo ========================================
echo.
echo 现在可以启动前端服务：
echo cd frontend
echo npm run dev
echo.
pause