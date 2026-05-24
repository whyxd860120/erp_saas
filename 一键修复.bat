@echo off
chcp 65001 >nul
title ERP系统 - 一键修复工具
echo.
echo ========================================
echo    🚀 ERP系统 - 一键自动修复
echo ========================================
echo.
echo [提示] 正在启动自动修复程序...
echo.

REM 切换到项目目录
cd /d "%~dp0"

REM 尝试运行自动修复脚本
node auto-fix.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [提示] 如果上面的方法不工作，让我尝试更直接的方式...
    echo.
    
    REM 尝试直接运行 prisma 命令
    echo 正在尝试直接同步数据库...
    call npx prisma generate
    call npx prisma db push
    
    echo.
    echo 完成！请重启后端服务。
)

echo.
echo ========================================
echo    ✅ 修复程序执行完毕
echo ========================================
echo.
echo 接下来请做以下操作：
echo   1. 停止正在运行的后端服务（按 Ctrl+C）
echo   2. 重新启动后端：npm run dev
echo   3. 刷新浏览器页面
echo.
echo 按任意键退出...
pause >nul
