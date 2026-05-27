# 数企管家部署工具 - 安全安装脚本 (PowerShell)
# 支持强制清理和重试安装

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  数企管家部署工具 - 安全安装脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 设置错误处理
$ErrorActionPreference = "Continue"

# 1. 检查Node.js
Write-Host "[1/5] 检查Node.js环境..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误：未检测到Node.js，请先安装Node.js" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
}
Write-Host ""

# 2. 配置镜像源
Write-Host "[2/5] 配置npm镜像源..." -ForegroundColor Yellow
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/
Write-Host "✅ 镜像源配置完成" -ForegroundColor Green
Write-Host ""

# 3. 强制清理旧文件
Write-Host "[3/5] 强制清理旧文件..." -ForegroundColor Yellow

# 尝试删除node_modules
if (Test-Path "node_modules") {
    Write-Host "⚠️  正在删除node_modules..." -ForegroundColor Yellow
    try {
        # 先尝试正常删除
        Remove-Item -Recurse -Force "node_modules" -ErrorAction Stop
        Write-Host "✅ node_modules已删除" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  正常删除失败，尝试使用rimraf..." -ForegroundColor Yellow
        try {
            # 尝试安装rimraf并删除
            npx rimraf node_modules
            Write-Host "✅ node_modules已通过rimraf删除" -ForegroundColor Green
        } catch {
            Write-Host "❌ 无法自动删除node_modules" -ForegroundColor Red
            Write-Host ""
            Write-Host "请手动执行以下操作之一：" -ForegroundColor Yellow
            Write-Host "1. 重启电脑后重新运行此脚本"
            Write-Host "2. 使用管理员身份运行此脚本"
            Write-Host "3. 手动删除node_modules文件夹"
            Write-Host ""
            Read-Host "按回车键退出"
            exit 1
        }
    }
}

# 删除package-lock.json
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
    Write-Host "✅ package-lock.json已删除" -ForegroundColor Green
}
Write-Host ""

# 4. 安装依赖
Write-Host "[4/5] 安装依赖包..." -ForegroundColor Yellow
Write-Host "⏳ 正在npm install，请耐心等待..." -ForegroundColor Cyan

$installSuccess = $false
$maxRetries = 3
$retryCount = 0

while (-not $installSuccess -and $retryCount -lt $maxRetries) {
    try {
        npm install
        if ($LASTEXITCODE -eq 0) {
            $installSuccess = $true
            Write-Host "✅ 依赖安装成功！" -ForegroundColor Green
        } else {
            throw "npm install exited with code $LASTEXITCODE"
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "⚠️  安装失败，正在重试 ($retryCount/$maxRetries)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
    }
}

if (-not $installSuccess) {
    Write-Host ""
    Write-Host "❌ npm install失败！" -ForegroundColor Red
    Write-Host ""
    Write-Host "常见问题解决：" -ForegroundColor Yellow
    Write-Host "1. 检查网络连接"
    Write-Host "2. 以管理员身份运行PowerShell"
    Write-Host "3. 尝试手动执行：npm install --legacy-peer-deps"
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}
Write-Host ""

# 5. 完成
Write-Host "[5/5] 验证安装..." -ForegroundColor Yellow
if (Test-Path "node_modules\.bin\electron.cmd") {
    Write-Host "✅ Electron安装成功" -ForegroundColor Green
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  🎉 安装完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "运行命令：" -ForegroundColor Cyan
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Read-Host "按回车键退出"
