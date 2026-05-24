@echo off
chcp 65001 >nul
echo ========================================
echo   Vue图标修复工具
echo ========================================
echo.

cd /d "%~dp0frontend"

echo 检查已知图标问题...
echo.

echo [1/2] 检查 IntegrationView.vue 中的 Bug 图标...
findstr /C:"Bug," src\views\IntegrationView.vue >nul
if errorlevel 1 (
    echo ✅ IntegrationView.vue 中的 Bug 图标已修复
) else (
    echo ❌ IntegrationView.vue 中仍有 Bug 图标导入
)

echo.
echo [2/2] 启动开发服务器测试...
echo.
echo 按 Ctrl+C 可以停止服务器
echo.

call npm run dev

pause