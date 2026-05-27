# Simple Database Backup Tool
# Save this file with UTF-8 encoding (without BOM)

param(
    [string]$Action = "",
    [string]$File = ""
)

# Database configuration - MODIFY THESE VALUES
$dbUser = "inventory_user"
$dbPass = "inventory_pass123"
$dbHost = "localhost"
$dbPort = "3306"
$dbName = "inventory_saas"

# Find MySQL tools
$mysqlPaths = @(
    "C:\mysql\bin",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin",
    "C:\Program Files\MySQL\MySQL Server 5.7\bin"
)

$mysqldump = $null
$mysql = $null

foreach ($path in $mysqlPaths) {
    if (Test-Path "$path\mysqldump.exe") {
        $mysqldump = "$path\mysqldump.exe"
        $mysql = "$path\mysql.exe"
        break
    }
}

if (-not $mysqldump) {
    Write-Host "ERROR: Cannot find MySQL tools!" -ForegroundColor Red
    Write-Host "Please install MySQL or specify the correct path." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Database Backup & Restore Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database: $dbName @ $dbHost:$dbPort" -ForegroundColor Green
Write-Host ""

if ($Action -eq "backup") {
    # Backup mode
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = if ($File) { $File } else { "db-backup-$timestamp.sql" }
    
    Write-Host "[1/2] Backing up database..." -ForegroundColor Yellow
    $env:MYSQL_PWD = $dbPass
    
    & $mysqldump -u $dbUser -h $dbHost -P $dbPort --single-transaction --routines --triggers --result-file="$backupFile" $dbName
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $backupFile)) {
        $size = (Get-Item $backupFile).Length / 1MB
        Write-Host "[2/2] SUCCESS! File: $backupFile ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "FAILED! Exit code: $LASTEXITCODE" -ForegroundColor Red
    }
}
elseif ($Action -eq "restore") {
    # Restore mode
    if (-not $File) {
        Write-Host "ERROR: Please specify backup file with -File parameter" -ForegroundColor Red
        pause
        exit 1
    }
    
    if (-not (Test-Path $File)) {
        Write-Host "ERROR: File not found: $File" -ForegroundColor Red
        pause
        exit 1
    }
    
    Write-Host "WARNING: This will overwrite all data in database '$dbName'!" -ForegroundColor Yellow
    Write-Host "Are you sure? (yes/no)" -ForegroundColor Yellow
    $confirm = Read-Host
    
    if ($confirm -ne "yes") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        pause
        exit 0
    }
    
    Write-Host "[1/2] Restoring database..." -ForegroundColor Yellow
    $env:MYSQL_PWD = $dbPass
    
    & $mysql -u $dbUser -h $dbHost -P $dbPort $dbName < $File
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[2/2] SUCCESS! Database restored." -ForegroundColor Green
    } else {
        Write-Host "FAILED! Exit code: $LASTEXITCODE" -ForegroundColor Red
    }
}
else {
    # Interactive menu
    Write-Host "Choose an action:" -ForegroundColor White
    Write-Host "1. Backup database" -ForegroundColor Cyan
    Write-Host "2. Restore database" -ForegroundColor Cyan
    Write-Host "3. Exit" -ForegroundColor Cyan
    Write-Host ""
    
    $choice = Read-Host "Enter choice (1-3)"
    
    switch ($choice) {
        "1" {
            $savePath = Read-Host "Enter backup file path (or press Enter for default)"
            if ($savePath) {
                & $PSCommandPath -Action backup -File $savePath
            } else {
                & $PSCommandPath -Action backup
            }
        }
        "2" {
            $filePath = Read-Host "Enter backup file path to restore"
            & $PSCommandPath -Action restore -File $filePath
        }
        "3" {
            exit 0
        }
        default {
            Write-Host "Invalid choice!" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
