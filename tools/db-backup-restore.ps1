# Database Backup and Restore Tool - GUI Version
# Usage: Double-click the .bat file to run with admin privileges

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Read project configuration
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$EnvFile = Join-Path $ProjectRoot ".env"

# Parse database configuration
function Get-DbConfig {
    if (Test-Path $EnvFile) {
        $content = Get-Content $EnvFile
        $dbUrl = ($content | Select-String "DATABASE_URL=").ToString().Split('"')[1]
        
        if ($dbUrl -match "mysql://([^:]+):([^@]+)@([^:]+):(\d+)/(.*)") {
            return @{
                User = $matches[1]
                Password = $matches[2]
                Host = $matches[3]
                Port = $matches[4]
                Database = $matches[5]
            }
        }
    }
    
    # Default configuration
    return @{
        User = "inventory_user"
        Password = "inventory_pass123"
        Host = "localhost"
        Port = "3306"
        Database = "inventory_saas"
    }
}

$dbConfig = Get-DbConfig

# Find mysqldump and mysql commands
function Find-MySQLTools {
    $paths = @(
        "C:\mysql\bin",
        "C:\Program Files\MySQL\MySQL Server 8.0\bin",
        "C:\Program Files\MySQL\MySQL Server 5.7\bin",
        "C:\xampp\mysql\bin",
        "C:\wamp\bin\mysql\mysql8.0.27\bin"
    )
    
    foreach ($path in $paths) {
        if (Test-Path "$path\mysqldump.exe") {
            return @{
                Dump = "$path\mysqldump.exe"
                Client = "$path\mysql.exe"
            }
        }
    }
    
    # Try to find from PATH
    $dumpPath = (Get-Command mysqldump -ErrorAction SilentlyContinue).Source
    $clientPath = (Get-Command mysql -ErrorAction SilentlyContinue).Source
    
    if ($dumpPath -and $clientPath) {
        return @{
            Dump = $dumpPath
            Client = $clientPath
        }
    }
    
    return $null
}

$mysqlTools = Find-MySQLTools

# Create main window
$form = New-Object System.Windows.Forms.Form
$form.Text = "ERP Database Backup & Restore Tool"
$form.Size = New-Object System.Drawing.Size(700, 500)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

# Title label
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Database Backup & Restore Tool"
$titleLabel.Font = New-Object System.Drawing.Font("Microsoft YaHei", 16, [System.Drawing.FontStyle]::Bold)
$titleLabel.Location = New-Object System.Drawing.Point(20, 20)
$titleLabel.Size = New-Object System.Drawing.Size(650, 40)
$titleLabel.ForeColor = [System.Drawing.Color]::DarkBlue
$form.Controls.Add($titleLabel)

# Database info panel
$infoPanel = New-Object System.Windows.Forms.GroupBox
$infoPanel.Text = "Current Database Configuration"
$infoPanel.Location = New-Object System.Drawing.Point(20, 70)
$infoPanel.Size = New-Object System.Drawing.Size(640, 100)

$dbInfoText = @"
Host: $($dbConfig.Host):$($dbConfig.Port)
Database: $($dbConfig.Database)
User: $($dbConfig.User)
"@

if (-not $mysqlTools) {
    $dbInfoText += "`nWARNING: MySQL command-line tools not found. Please install MySQL Client first."
} else {
    $dbInfoText += "`nOK: MySQL tools are ready"
}

$infoLabel = New-Object System.Windows.Forms.Label
$infoLabel.Text = $dbInfoText
$infoLabel.Location = New-Object System.Drawing.Point(15, 25)
$infoLabel.Size = New-Object System.Drawing.Size(610, 60)
$infoLabel.Font = New-Object System.Drawing.Font("Consolas", 9)
$infoPanel.Controls.Add($infoLabel)
$form.Controls.Add($infoPanel)

# Log text box
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(20, 185)
$logBox.Size = New-Object System.Drawing.Size(640, 220)
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.ReadOnly = $true
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$logBox.BackColor = [System.Drawing.Color]::Black
$logBox.ForeColor = [System.Drawing.Color]::LightGreen
$form.Controls.Add($logBox)

# Log function
function Write-Log {
    param([string]$Message, [string]$Type = "INFO")
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    $logBox.AppendText("[$timestamp] [$Type] $Message`r`n")
    $logBox.SelectionStart = $logBox.Text.Length
    $logBox.ScrollToCaret()
}

# Backup button
$backupBtn = New-Object System.Windows.Forms.Button
$backupBtn.Text = "Backup Database"
$backupBtn.Location = New-Object System.Drawing.Point(20, 420)
$backupBtn.Size = New-Object System.Drawing.Size(150, 40)
$backupBtn.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10, [System.Drawing.FontStyle]::Bold)
$backupBtn.BackColor = [System.Drawing.Color]::LightGreen
$form.Controls.Add($backupBtn)

# Restore button
$restoreBtn = New-Object System.Windows.Forms.Button
$restoreBtn.Text = "Restore Database"
$restoreBtn.Location = New-Object System.Drawing.Point(190, 420)
$restoreBtn.Size = New-Object System.Drawing.Size(150, 40)
$restoreBtn.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10, [System.Drawing.FontStyle]::Bold)
$restoreBtn.BackColor = [System.Drawing.Color]::LightBlue
$form.Controls.Add($restoreBtn)

# Open backup directory button
$openDirBtn = New-Object System.Windows.Forms.Button
$openDirBtn.Text = "Open Backup Folder"
$openDirBtn.Location = New-Object System.Drawing.Point(360, 420)
$openDirBtn.Size = New-Object System.Drawing.Size(150, 40)
$openDirBtn.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10)
$form.Controls.Add($openDirBtn)

# Exit button
$exitBtn = New-Object System.Windows.Forms.Button
$exitBtn.Text = "Exit"
$exitBtn.Location = New-Object System.Drawing.Point(530, 420)
$exitBtn.Size = New-Object System.Drawing.Size(130, 40)
$exitBtn.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10)
$form.Controls.Add($exitBtn)

# Backup functionality
$backupBtn.Add_Click({
    if (-not $mysqlTools) {
        [System.Windows.Forms.MessageBox]::Show("MySQL command-line tools not found!`n`nPlease install MySQL Client or MySQL Server first.", "Error", "OK", "Error")
        return
    }
    
    $saveDialog = New-Object System.Windows.Forms.SaveFileDialog
    $saveDialog.Filter = "SQL Files (*.sql)|*.sql|All Files (*.*)|*.*"
    $saveDialog.FileName = "db-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
    $saveDialog.Title = "Choose backup file save location"
    
    if ($saveDialog.ShowDialog() -eq "OK") {
        $backupFile = $saveDialog.FileName
        Write-Log "Starting database backup..." "INFO"
        Write-Log "Target file: $backupFile" "INFO"
        
        try {
            $env:MYSQL_PWD = $dbConfig.Password
            $args = @(
                "-u", $dbConfig.User,
                "-h", $dbConfig.Host,
                "-P", $dbConfig.Port,
                "--single-transaction",
                "--routines",
                "--triggers",
                "--result-file=$backupFile",
                $dbConfig.Database
            )
            
            $process = Start-Process -FilePath $mysqlTools.Dump -ArgumentList $args -NoNewWindow -Wait -PassThru
            
            if ($process.ExitCode -eq 0 -and (Test-Path $backupFile)) {
                $fileSize = (Get-Item $backupFile).Length / 1MB
                Write-Log "SUCCESS: Backup completed! File size: $([math]::Round($fileSize, 2)) MB" "SUCCESS"
                [System.Windows.Forms.MessageBox]::Show("Database backup successful!`n`nFile location: $backupFile`nFile size: $([math]::Round($fileSize, 2)) MB", "Success", "OK", "Information")
            } else {
                Write-Log "ERROR: Backup failed, exit code: $($process.ExitCode)" "ERROR"
                [System.Windows.Forms.MessageBox]::Show("Backup failed! Please check the log for details.", "Error", "OK", "Error")
            }
        } catch {
            Write-Log "ERROR: Backup exception: $_" "ERROR"
            [System.Windows.Forms.MessageBox]::Show("Backup exception: $_", "Error", "OK", "Error")
        }
    }
})

# Restore functionality
$restoreBtn.Add_Click({
    if (-not $mysqlTools) {
        [System.Windows.Forms.MessageBox]::Show("MySQL command-line tools not found!`n`nPlease install MySQL Client or MySQL Server first.", "Error", "OK", "Error")
        return
    }
    
    $openDialog = New-Object System.Windows.Forms.OpenFileDialog
    $openDialog.Filter = "SQL Files (*.sql)|*.sql|All Files (*.*)|*.*"
    $openDialog.Title = "Select backup file to restore"
    
    if ($openDialog.ShowDialog() -eq "OK") {
        $restoreFile = $openDialog.FileName
        
        $confirm = [System.Windows.Forms.MessageBox]::Show(
            "WARNING: Restore operation will overwrite all data in the current database!`n`nAre you sure you want to continue?",
            "Confirm Restore",
            "YesNo",
            "Warning"
        )
        
        if ($confirm -eq "No") {
            Write-Log "User cancelled restore operation" "WARNING"
            return
        }
        
        Write-Log "Starting database restore..." "INFO"
        Write-Log "Source file: $restoreFile" "INFO"
        
        try {
            $env:MYSQL_PWD = $dbConfig.Password
            $args = @(
                "-u", $dbConfig.User,
                "-h", $dbConfig.Host,
                "-P", $dbConfig.Port,
                $dbConfig.Database,
                "-e", "source $restoreFile"
            )
            
            $process = Start-Process -FilePath $mysqlTools.Client -ArgumentList $args -NoNewWindow -Wait -PassThru
            
            if ($process.ExitCode -eq 0) {
                Write-Log "SUCCESS: Restore completed!" "SUCCESS"
                [System.Windows.Forms.MessageBox]::Show("Database restore successful!", "Success", "OK", "Information")
            } else {
                Write-Log "ERROR: Restore failed, exit code: $($process.ExitCode)" "ERROR"
                [System.Windows.Forms.MessageBox]::Show("Restore failed! Please check the log for details.", "Error", "OK", "Error")
            }
        } catch {
            Write-Log "ERROR: Restore exception: $_" "ERROR"
            [System.Windows.Forms.MessageBox]::Show("Restore exception: $_", "Error", "OK", "Error")
        }
    }
})

# Open backup directory
$openDirBtn.Add_Click({
    $backupDir = Join-Path $ProjectRoot "database\backups"
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    }
    Invoke-Item $backupDir
})

# Exit
$exitBtn.Add_Click({
    $form.Close()
})

# Show window
Write-Log "Tool started" "INFO"
Write-Log "Database: $($dbConfig.Database) @ $($dbConfig.Host):$($dbConfig.Port)" "INFO"
$form.ShowDialog() | Out-Null
