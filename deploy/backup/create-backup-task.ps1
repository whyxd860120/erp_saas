# 创建定时备份任务
# 以管理员身份运行

param(
    [string]$InstallPath = "C:\inventory-system",
    [string]$BackupTime = "02:00"  # 默认每天凌晨2点备份
)

Write-Host "=== 创建定时备份任务 ===" -ForegroundColor Green

# 任务名称
$TaskName = "ERP-Inventory-Backup"

# 检查任务是否已存在
$ExistingTask = schtasks /query /tn $TaskName 2>$null
if ($ExistingTask) {
    Write-Host "任务已存在，正在删除旧任务..." -ForegroundColor Yellow
    schtasks /delete /tn $TaskName /f | Out-Null
}

# 创建任务
$Action = "powershell.exe -ExecutionPolicy Bypass -File `"$InstallPath\deploy\backup\backup-database.ps1`" -InstallPath `"$InstallPath`""
$Schedule = "DAILY"
$Time = $BackupTime

Write-Host "创建任务: $TaskName" -ForegroundColor Yellow
Write-Host "执行时间: 每天 $Time" -ForegroundColor Yellow
Write-Host "执行命令: $Action" -ForegroundColor Gray

# 使用 schtasks 创建任务
schtasks /create /tn $TaskName /tr $Action /sc $Schedule /st $Time /ru SYSTEM /rl HIGHEST | Out-Null

# 验证任务创建
$Task = schtasks /query /tn $TaskName /fo LIST 2>$null
if ($Task) {
    Write-Host "`n任务创建成功!" -ForegroundColor Green
    Write-Host "`n任务详情:" -ForegroundColor Cyan
    $Task | Select-Object -First 10 | ForEach-Object { Write-Host $_ }
    
    Write-Host "`n手动运行备份测试:" -ForegroundColor Yellow
    Write-Host "schtasks /run /tn $TaskName" -ForegroundColor Cyan
    
    Write-Host "`n查看备份日志:" -ForegroundColor Yellow
    Write-Host "Get-Content $InstallPath\logs\backup.log -Tail 20" -ForegroundColor Cyan
} else {
    Write-Error "任务创建失败"
}

Write-Host "`n=== 完成 ===" -ForegroundColor Green
