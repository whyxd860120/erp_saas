# MySQL Backup Tool - Final Verification Script
# Run this script to verify all components are working correctly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MySQL Backup Tool - Final Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$SuccessCount = 0

# Test 1: MySQL Service
Write-Host "[1] Checking MySQL Service..." -ForegroundColor Yellow
try {
    $mysqlService = Get-Service MySQL -ErrorAction Stop
    if ($mysqlService.Status -eq "Running") {
        Write-Host "    ✓ MySQL service is running" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "    ✗ MySQL service is not running (Status: $($mysqlService.Status))" -ForegroundColor Red
        $ErrorCount++
    }
} catch {
    Write-Host "    ✗ MySQL service not found" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 2: MySQL Tools
Write-Host "[2] Checking MySQL Tools..." -ForegroundColor Yellow
$mysqlPath = "C:\tools\mysql\current\bin"
$mysqldumpPath = Join-Path $mysqlPath "mysqldump.exe"
$mysqlClientPath = Join-Path $mysqlPath "mysql.exe"

if (Test-Path $mysqldumpPath) {
    Write-Host "    ✓ mysqldump.exe found at: $mysqlPath" -ForegroundColor Green
    $SuccessCount++
} else {
    Write-Host "    ✗ mysqldump.exe not found" -ForegroundColor Red
    $ErrorCount++
}

if (Test-Path $mysqlClientPath) {
    Write-Host "    ✓ mysql.exe found at: $mysqlPath" -ForegroundColor Green
    $SuccessCount++
} else {
    Write-Host "    ✗ mysql.exe not found" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 3: Configuration File
Write-Host "[3] Checking Configuration File..." -ForegroundColor Yellow
$configFile = Join-Path $PSScriptRoot "db-config.ini"
if (Test-Path $configFile) {
    Write-Host "    ✓ db-config.ini exists" -ForegroundColor Green
    
    # Read and display config
    $config = Get-Content $configFile -Encoding UTF8 | Select-String "^(host|port|database|user)=" 
    Write-Host "    Current configuration:" -ForegroundColor Gray
    foreach ($line in $config) {
        Write-Host "      $line" -ForegroundColor DarkGray
    }
    $SuccessCount++
} else {
    Write-Host "    ✗ db-config.ini not found" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 4: HTA Tool
Write-Host "[4] Checking HTA Tool..." -ForegroundColor Yellow
$htaFile = Join-Path $PSScriptRoot "db-backup-gui-cn.hta"
if (Test-Path $htaFile) {
    $fileSize = (Get-Item $htaFile).Length / 1KB
    Write-Host "    ✓ db-backup-gui-cn.hta exists ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
    $SuccessCount++
} else {
    Write-Host "    ✗ db-backup-gui-cn.hta not found" -ForegroundColor Red
    $ErrorCount++
}

Write-Host ""

# Test 5: Database Connection & Backup Test
Write-Host "[5] Testing Database Connection & Backup..." -ForegroundColor Yellow

# Read database config
$dbConfig = @{}
Get-Content $configFile -Encoding UTF8 | Where-Object { $_ -match "^(\w+)=(.+)$" } | ForEach-Object {
    $matches = [regex]::Match($_, "^(\w+)=(.+)$")
    if ($matches.Success) {
        $dbConfig[$matches.Groups[1].Value] = $matches.Groups[2].Value
    }
}

if ($dbConfig.Count -gt 0) {
    $env:MYSQL_PWD = $dbConfig['password']
    
    # Test connection
    try {
        $testResult = & $mysqlClientPath -u $dbConfig['user'] -h $dbConfig['host'] -P $dbConfig['port'] -e "SELECT 1 AS test;" $dbConfig['database'] 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ Database connection successful" -ForegroundColor Green
            
            # Perform backup test
            $testBackupFile = Join-Path $PSScriptRoot "verify-test-backup.sql"
            Write-Host "    Performing backup test..." -ForegroundColor Gray
            
            $backupStart = Get-Date
            & $mysqldumpPath -u $dbConfig['user'] -h $dbConfig['host'] -P $dbConfig['port'] `
                --single-transaction `
                --set-gtid-purged=OFF `
                --default-character-set=utf8mb4 `
                --result-file=$testBackupFile `
                $dbConfig['database'] 2>&1 | Out-Null
            
            $backupEnd = Get-Date
            $backupTime = ($backupEnd - $backupStart).TotalSeconds
            
            if ($LASTEXITCODE -eq 0 -and (Test-Path $testBackupFile)) {
                $fileSize = (Get-Item $testBackupFile).Length / 1KB
                Write-Host "    ✓ Backup test successful ($([math]::Round($fileSize, 2)) KB, $([math]::Round($backupTime, 2))s)" -ForegroundColor Green
                
                # Clean up test file
                Remove-Item $testBackupFile -ErrorAction SilentlyContinue
                
                $SuccessCount += 2
            } else {
                Write-Host "    ✗ Backup test failed (Exit code: $LASTEXITCODE)" -ForegroundColor Red
                $ErrorCount++
            }
        } else {
            Write-Host "    ✗ Database connection failed (Exit code: $LASTEXITCODE)" -ForegroundColor Red
            $ErrorCount++
        }
    } catch {
        Write-Host "    ✗ Connection test error: $_" -ForegroundColor Red
        $ErrorCount++
    }
} else {
    Write-Host "    ⚠ Skipping database test (no valid configuration)" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verification Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Successful tests: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed tests:     $ErrorCount" -ForegroundColor $(if ($ErrorCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "  ✓ All tests passed! The tool is ready to use." -ForegroundColor Green
    Write-Host ""
    Write-Host "  To start the tool:" -ForegroundColor Cyan
    Write-Host "    Double-click: 启动备份工具.bat" -ForegroundColor White
    Write-Host "    Or run: db-backup-gui-cn.hta" -ForegroundColor White
} else {
    Write-Host "  ✗ Some tests failed. Please check the errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Common solutions:" -ForegroundColor Yellow
    Write-Host "    1. Ensure MySQL service is running" -ForegroundColor White
    Write-Host "    2. Verify database credentials in db-config.ini" -ForegroundColor White
    Write-Host "    3. Check that MySQL tools are installed" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
