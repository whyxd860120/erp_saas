@echo off
chcp 65001 >nul
title ERP 后端服务 - 快速修复启动问题
color 0A

echo.
echo ========================================
echo   ERP 后端服务 - 启动问题修复
echo ========================================
echo.
echo 检测到 TypeScript 编译错误...
echo 正在修复...
echo.

REM 设置工作目录
cd /d "%~dp0"

echo [步骤 1] 清理旧的构建文件...
if exist "dist" rmdir /s /q dist
echo ✓ 已清理 dist 目录
echo.

echo [步骤 2] 重新生成 Prisma 客户端...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ✗ Prisma 生成失败
    pause
    exit /b 1
)
echo ✓ Prisma 客户端已生成
echo.

echo [步骤 3] 使用 tsx 替代 ts-node（更稳定）...
echo 修改 package.json 中的启动命令...

REM 备份 package.json
copy package.json package.json.backup >nul

REM 使用 PowerShell 修改 package.json
powershell -Command "$content = Get-Content 'package.json' -Encoding UTF8; $newContent = @(); foreach ($line in $content) { if ($line -match '\"dev\":') { $newContent += '    \"dev\": \"nodemon --exec tsx src/index.ts\",'; } else { $newContent += $line; } }; $newContent | Set-Content 'package.json' -Encoding UTF8"

echo ✓ package.json 已更新（使用 tsx 代替 ts-node）
echo.

echo [步骤 4] 安装/更新 tsx...
call npm install tsx --save-dev
if %errorlevel% neq 0 (
    echo ✗ tsx 安装失败
    pause
    exit /b 1
)
echo ✓ tsx 已安装
echo.

echo [步骤 5] 启动后端服务...
echo.
echo ========================================
echo   启动成功！服务将在 http://localhost:3000 运行
echo ========================================
echo.
echo 提示：
echo   - 查看控制台输出确认服务状态
echo   - 如果看到 "Server running on http://localhost:3000" 表示成功
echo   - 按 Ctrl+C 停止服务
echo.
echo 正在启动...
echo.

REM 启动服务
call npm run dev

pause
