# 数据库备份脚本
# 以管理员身份运行

param(
    [string]$InstallPath = "C:\inventory-system",
    [int]$KeepDays = 30  # 保留最近30天的备份
)

$BackupDir = "$InstallPath\backup"
$LogDir = "$InstallPath\logs"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$DbBackupFile = "$BackupDir\db-$Date.sql"
$UploadsBackupDir = "$BackupDir\uploads-$Date"

# 确保目录存在
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# 读取数据库密码
$envFile = Get-Content "$InstallPath\.env"
$DbUrl = ($envFile | Select-String "DATABASE_URL=").ToString().Split('"')[1]
# 解析 mysql://user:password@localhost:3306/dbname
if ($DbUrl -match "mysql://([^:]+):([^@]+)@([^:]+):(\d+)/(.*)") {
    $DbUser = $matches[1]
    $DbPass = $matches[2]
    $DbHost = $matches[3]
    $DbPort = $matches[4]
    $DbName = $matches[5]
}

Write-Host "=== 开始备份 ===" -ForegroundColor Green
Write-Host "备份时间: $(Get-Date)" -ForegroundColor Cyan

# 1. 备份数据库
Write-Host "`n[1/3] 备份数据库..." -ForegroundColor Yellow
try {
    $env:MYSQL_PWD = $DbPass
    & "C:\mysql\bin\mysqldump" -u $DbUser -h $DbHost -P $DbPort --single-transaction --routines --triggers $DbName | Out-File -FilePath $DbBackupFile -Encoding UTF8
    
    if (Test-Path $DbBackupFile) {
        $DbSize = (Get-Item $DbBackupFile).Length / 1MB
        Write-Host "数据库备份完成: $DbBackupFile ($([math]::Round($DbSize, 2)) MB)" -ForegroundColor Green
    }
} catch {
    Write-Error "数据库备份失败: $_"
    Add-Content -Path "$LogDir\backup-error.log" -Value "[$(Get-Date)] 数据库备份失败: $_"
    exit 1
}

# 2. 备份上传文件
Write-Host "`n[2/3] 备份上传文件..." -ForegroundColor Yellow
try {
    if (Test-Path "$InstallPath\uploads") {
        Copy-Item -Path "$InstallPath\uploads" -Destination $UploadsBackupDir -Recurse -Force
        $UploadsSize = (Get-ChildItem $UploadsBackupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "上传文件备份完成: $UploadsBackupDir ($([math]::Round($UploadsSize, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "上传目录不存在，跳过" -ForegroundColor Yellow
    }
} catch {
    Write-Error "上传文件备份失败: $_"
    Add-Content -Path "$LogDir\backup-error.log" -Value "[$(Get-Date)] 上传文件备份失败: $_"
}

# 3. 清理旧备份
Write-Host "`n[3/3] 清理旧备份 (保留 $KeepDays 天)..." -ForegroundColor Yellow
try {
    $CutoffDate = (Get-Date).AddDays(-$KeepDays)
    
    # 清理旧数据库备份
    Get-ChildItem -Path $BackupDir -Filter "db-*.sql" | Where-Object { $_.CreationTime -lt $CutoffDate } | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "删除旧备份: $($_.Name)" -ForegroundColor Gray
    }
    
    # 清理旧上传文件备份
    Get-ChildItem -Path $BackupDir -Filter "uploads-*" | Where-Object { $_.CreationTime -lt $CutoffDate } | ForEach-Object {
        Remove-Item $_.FullName -Recurse -Force
        Write-Host "删除旧备份: $($_.Name)" -ForegroundColor Gray
    }
    
    Write-Host "旧备份清理完成" -ForegroundColor Green
} catch {
    Write-Error "清理旧备份失败: $_"
}

# 4. 记录备份日志
$LogEntry = "[$(Get-Date)] 备份完成 - 数据库: $DbBackupFile"
Add-Content -Path "$LogDir\backup.log" -Value $LogEntry

Write-Host "`n=== 备份完成 ===" -ForegroundColor Green
Write-Host "备份文件位置: $BackupDir" -ForegroundColor Cyan

# 可选：发送邮件通知（需要配置SMTP）
# Send-MailMessage -To "admin@yourcompany.com" -From "backup@server.com" -Subject "备份完成" -Body "备份已完成: $DbBackupFile"
