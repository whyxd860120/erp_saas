# 本机部署到服务器脚本
# 一键打包并部署到远程服务器

param(
    [string]$ServerIP = "192.168.1.100",  # 服务器IP
    [string]$ServerUser = "Administrator",  # 服务器用户名
    [string]$ServerPath = "C:\inventory-system",  # 服务器路径
    [switch]$IncludeNodeModules,  # 是否包含node_modules（首次部署需要）
    [switch]$RestartService  # 是否重启服务
)

$ProjectRoot = "E:\project\ERP2026\inventory-system"
$BuildDir = "$env:TEMP\inventory-deploy-$(Get-Date -Format 'yyyyMMddHHmmss')"
$PackageName = "update-$(Get-Date -Format 'yyyyMMddHHmmss').zip"
$PackagePath = "$env:TEMP\$PackageName"

Write-Host "=== 部署到远程服务器 ===" -ForegroundColor Green
Write-Host "服务器: $ServerIP" -ForegroundColor Cyan
Write-Host "目标路径: $ServerPath" -ForegroundColor Cyan

# 1. 构建项目
Write-Host "`n[1/5] 构建项目..." -ForegroundColor Yellow

Set-Location $ProjectRoot

# 构建后端
Write-Host "构建后端..." -ForegroundColor Gray
npm run build 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) {
    Write-Error "后端构建失败"
    exit 1
}

# 构建前端
Write-Host "构建前端..." -ForegroundColor Gray
Set-Location "$ProjectRoot\frontend"
npm run build 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) {
    Write-Error "前端构建失败"
    exit 1
}

Set-Location $ProjectRoot

# 2. 准备部署包
Write-Host "`n[2/5] 准备部署包..." -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

# 复制后端
Copy-Item -Path "$ProjectRoot\dist" -Destination "$BuildDir\dist" -Recurse -Force

# 复制前端
New-Item -ItemType Directory -Force -Path "$BuildDir\frontend" | Out-Null
Copy-Item -Path "$ProjectRoot\frontend\dist" -Destination "$BuildDir\frontend\dist" -Recurse -Force

# 复制Prisma迁移文件（如果有数据库变更）
if (Test-Path "$ProjectRoot\prisma\migrations") {
    New-Item -ItemType Directory -Force -Path "$BuildDir\prisma" | Out-Null
    Copy-Item -Path "$ProjectRoot\prisma\migrations" -Destination "$BuildDir\prisma\migrations" -Recurse -Force
}

# 可选：复制 node_modules
if ($IncludeNodeModules) {
    Write-Host "复制 node_modules（这可能需要一些时间）..." -ForegroundColor Yellow
    Copy-Item -Path "$ProjectRoot\node_modules" -Destination "$BuildDir\node_modules" -Recurse -Force
}

# 3. 打包
Write-Host "`n[3/5] 打包..." -ForegroundColor Yellow
Compress-Archive -Path "$BuildDir\*" -DestinationPath $PackagePath -Force
$PackageSize = (Get-Item $PackagePath).Length / 1MB
Write-Host "部署包已创建: $PackagePath ($([math]::Round($PackageSize, 2)) MB)" -ForegroundColor Green

# 4. 上传到服务器
Write-Host "`n[4/5] 上传到服务器..." -ForegroundColor Yellow

# 使用 SMB/CIFS 共享（推荐）
$RemotePath = "\\$ServerIP\C$\inventory-system\updates"

# 检查是否能连接
if (-not (Test-Path $RemotePath)) {
    Write-Host "尝试连接服务器共享..." -ForegroundColor Yellow
    # 尝试建立连接
    net use "\\$ServerIP\C$" 2>$null
}

if (Test-Path $RemotePath) {
    Copy-Item -Path $PackagePath -Destination "$RemotePath\$PackageName" -Force
    Write-Host "上传完成" -ForegroundColor Green
} else {
    Write-Error "无法连接到服务器共享，请确保:"
    Write-Host "1. 服务器开启了文件共享" -ForegroundColor Yellow
    Write-Host "2. 你有权限访问 $RemotePath" -ForegroundColor Yellow
    Write-Host "`n或者手动复制文件到服务器: $PackagePath" -ForegroundColor Cyan
    exit 1
}

# 5. 远程执行更新
Write-Host "`n[5/5] 远程执行更新..." -ForegroundColor Yellow

$UpdateScript = {
    param($ServerPath, $PackageName, $Restart)
    
    $UpdateScriptPath = "$ServerPath\deploy\update\update-server.ps1"
    
    if (Test-Path $UpdateScriptPath) {
        & $UpdateScriptPath -InstallPath $ServerPath -UpdateDir "$ServerPath\updates" -AutoRestart:$Restart
    } else {
        Write-Error "服务器更新脚本不存在: $UpdateScriptPath"
        Write-Host "请在服务器上运行更新脚本: .\deploy\update\update-server.ps1"
    }
}

if ($RestartService) {
    Write-Host "将在服务器上执行更新并重启服务..." -ForegroundColor Yellow
    Invoke-Command -ComputerName $ServerIP -ScriptBlock $UpdateScript -ArgumentList $ServerPath, $PackageName, $true -Credential (Get-Credential -UserName $ServerUser -Message "输入服务器密码")
} else {
    Write-Host "文件已上传，请在服务器上手动运行更新:" -ForegroundColor Cyan
    Write-Host "  $ServerPath\deploy\update\update-server.ps1" -ForegroundColor Yellow
}

# 清理
Remove-Item -Path $BuildDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $PackagePath -Force -ErrorAction SilentlyContinue

Write-Host "`n=== 部署完成 ===" -ForegroundColor Green

# 显示访问地址
Write-Host "`n应用地址:" -ForegroundColor Cyan
Write-Host "  本机: http://localhost" -ForegroundColor Yellow
Write-Host "  服务器: http://$ServerIP" -ForegroundColor Yellow
