@echo off
chcp 65001 >nul
title ERP 后端修复工具

echo ========================================
echo   正在启动 ERP 后端修复工具...
echo ========================================
echo.

REM Check if HTA file exists
if not exist "%~dp0ERP后端修复工具.hta" (
    echo 错误: 找不到 ERP后端修复工具.hta 文件
    echo 请确保在正确的目录下运行此脚本
    pause
    exit /b 1
)

REM Launch HTA application with admin privileges
echo 正在打开图形界面...
echo.

start "" "%~dp0ERP后端修复工具.hta"

echo.
echo ✓ 工具已成功启动！
echo.
echo 提示:
echo   - 如果窗口未出现，请检查是否被安全软件阻止
echo   - 建议右键点击 HTA 文件选择"以管理员身份运行"
echo   - 详细说明请查看: ERP后端修复工具-使用说明.md
echo.
pause
