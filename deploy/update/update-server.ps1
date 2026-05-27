# 服务器端更新脚本
# 用于接收本机推送的更新并部署

param(
    [string]$InstallPath = "C:\inventory-system",
    [string]$UpdateDir = "C:\inventory-system\updates",
    [switch]$AutoRestart
)

$LogFile = "$InstallPath\logs\update.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogEntry
    
    switch ($Level) {
        "ERROR" { Write-Host $Message -ForegroundColor Red }
        "WARN"  { Write-Host $Message -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $Message -ForegroundColor Green }
        default { Write-Host $Message }
    }
}

Write-Log "=== 开始更新 ==="

# 1. 检查更新包
$UpdatePackage = Get-ChildItem -Path $UpdateDir -Filter "update-*.zip" | Sort-Object CreationTime -Descending | Select-Object -First 1

if (-not $UpdatePackage) {
    Write-Log "没有找到更新包" "ERROR"
    exit 1
}

Write-Log "找到更新包: $($UpdatePackage.Name)"

# 2. 解压更新包
$TempDir = "$env:TEMP\inventory-update-$(Get-Date -Format 'yyyyMMddHHmmss')"
Write-Log "解压到临时目录: $TempDir"

try {
    Expand-Archive -Path $UpdatePackage.FullName -DestinationPath $TempDir -Force
} catch {
    Write-Log "解压失败: $_" "ERROR"
    exit 1
}

# 3. 备份当前版本（可选）
$BackupDir = "$InstallPath\backup\versions\$(Get-Date -Format 'yyyyMMddHHmmss')"
Write-Log "备份当前版本到: $BackupDir"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Copy-Item -Path "$InstallPath\dist" -Destination "$BackupDir\dist" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$InstallPath\frontend\dist" -Destination "$BackupDir\frontend-dist" -Recurse -Force -ErrorAction SilentlyContinue

# 4. 检查是否需要停止服务
$NeedRestart = $false
if (Test-Path "$TempDir\package.json") {
    # 后端代码更新
    Write-Log "检测到后端代码更新"
    $NeedRestart = $true
}

if ($NeedRestart -and $AutoRestart) {
    Write-Log "停止应用服务..."
    pm2 stop inventory-api 2>$null
}

# 5. 执行更新
Write-Log "执行文件更新..."

try {
    # 更新后端
    if (Test-Path "$TempDir\dist") {
        Remove-Item -Path "$InstallPath\dist" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -Path "$TempDir\dist" -Destination "$InstallPath\dist" -Recurse -Force
        Write-Log "后端代码更新完成" "SUCCESS"
    }
    
    # 更新前端
    if (Test-Path "$TempDir\frontend\dist") {
        Remove-Item -Path "$InstallPath\frontend\dist" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -Path "$TempDir\frontend\dist" -Destination "$InstallPath\frontend\dist" -Recurse -Force
        Write-Log "前端代码更新完成" "SUCCESS"
    }
    
    # 执行数据库迁移
    if (Test-Path "$TempDir\prisma\migrations") {
        Write-Log "执行数据库迁移..."
        Set-Location $InstallPath
        npx prisma migrate deploy 2>&1 | ForEach-Object { Write-Log $_ }
        Write-Log "数据库迁移完成" "SUCCESS"
    }
    
} catch {
    Write-Log "更新失败: $_" "ERROR"
    Write-Log "正在回滚..." "WARN"
    
    # 回滚
    if (Test-Path "$BackupDir\dist") {
        Remove-Item -Path "$InstallPath\dist" -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -Path "$BackupDir\dist" -Destination "$InstallPath\dist" -Recurse -Force
    }
    
    if ($AutoRestart) {
        pm2 start inventory-api
    }
    
    exit 1
}

# 6. 重启服务
if ($NeedRestart -and $AutoRestart) {
    Write-Log "重启应用服务..."
    pm2 restart inventory-api
    Start-Sleep -Seconds 5
    
    # 检查服务状态
    $Status = pm2 status inventory-api --no-color 2>$null
    if ($Status -match "online") {
        Write-Log "服务重启成功" "SUCCESS"
    } else {
        Write-Log "服务启动失败，请检查日志" "ERROR"
    }
}

# 7. 清理
Write-Log "清理临时文件..."
Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
Move-Item -Path $UpdatePackage.FullName -Destination "$InstallPath\backup\versions\$($UpdatePackage.Name)" -Force

Write-Log "=== 更新完成 ===" "SUCCESS"
Write-Log "更新包已归档到: $InstallPath\backup\versions\"

# 发送通知（可选）
# 可以在这里添加邮件、钉钉、企业微信等通知
