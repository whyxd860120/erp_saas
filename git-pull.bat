@echo off
chcp 65001 >nul
echo ========================================
echo 数企管家 - Git拉取最新代码
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 正在检查git状态...
git status
echo.

echo [2/3] 正在拉取最新代码...
git pull origin main
echo.

echo [3/3] 拉取完成！
echo.

echo ========================================
echo 拉取完成！
echo ========================================
echo.
pause
