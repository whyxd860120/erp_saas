# Windows Server 2012 R2 部署脚本
# 以管理员身份运行 PowerShell

param(
    [string]$InstallPath = "C:\inventory-system",
    [string]$DbPassword = "",
    [string]$RedisPassword = "",
    [string]$JwtSecret = ""
)

# 检查管理员权限
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "请以管理员身份运行此脚本"
    exit 1
}

Write-Host "=== ERP 进销存系统部署脚本 ===" -ForegroundColor Green

# 1. 安装依赖软件
Write-Host "`n[1/8] 检查并安装依赖..." -ForegroundColor Yellow

# 检查 Node.js
$nodeVersion = node -v 2>$null
if (-not $nodeVersion) {
    Write-Host "正在下载 Node.js..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v18.20.4/node-v18.20.4-x64.msi" -OutFile "$env:TEMP\node.msi"
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", "$env:TEMP\node.msi", "/quiet", "/norestart" -Wait
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Host "Node.js 安装完成" -ForegroundColor Green
} else {
    Write-Host "Node.js 已安装: $nodeVersion" -ForegroundColor Green
}

# 2. 创建目录结构
Write-Host "`n[2/8] 创建目录结构..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null
New-Item -ItemType Directory -Force -Path "$InstallPath\uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "$InstallPath\logs" | Out-Null
New-Item -ItemType Directory -Force -Path "$InstallPath\backup" | Out-Null
Write-Host "目录创建完成" -ForegroundColor Green

# 3. 生成随机密码
Write-Host "`n[3/8] 生成安全密钥..." -ForegroundColor Yellow
if (-not $DbPassword) { $DbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object { [char]$_ }) }
if (-not $RedisPassword) { $RedisPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object { [char]$_ }) }
if (-not $JwtSecret) { $JwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ }) }

# 保存密码到文件
$passwordFile = "$InstallPath\credentials.txt"
@"
数据库密码: $DbPassword
Redis密码: $RedisPassword
JWT密钥: $JwtSecret
生成时间: $(Get-Date)
"@ | Out-File -FilePath $passwordFile -Encoding UTF8
Write-Host "密码已保存到: $passwordFile" -ForegroundColor Yellow

# 4. 创建环境配置文件
Write-Host "`n[4/8] 创建环境配置文件..." -ForegroundColor Yellow
$envContent = @"
NODE_ENV=production
PORT=3000
DATABASE_URL="mysql://inventory_user:$DbPassword@localhost:3306/inventory_saas"
JWT_SECRET=$JwtSecret
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$RedisPassword
UPLOAD_DIR=$InstallPath\uploads
MAX_FILE_SIZE=10485760
LOG_LEVEL=warn
LOG_DIR=$InstallPath\logs
CORS_ORIGIN=http://localhost
DEFAULT_TRIAL_DAYS=30
DEFAULT_PLAN=free
"@
$envContent | Out-File -FilePath "$InstallPath\.env" -Encoding UTF8
Write-Host "环境配置已创建" -ForegroundColor Green

# 5. 创建 PM2 配置文件
Write-Host "`n[5/8] 创建 PM2 配置文件..." -ForegroundColor Yellow
$pm2Config = @"
module.exports = {
  apps: [{
    name: 'inventory-api',
    script: '$InstallPath\\dist\\index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    log_file: '$InstallPath\\logs\\app.log',
    error_file: '$InstallPath\\logs\\error.log',
    max_memory_restart: '1G',
    restart_delay: 3000,
    max_restarts: 5
  }]
};
"@
$pm2Config | Out-File -FilePath "$InstallPath\ecosystem.config.js" -Encoding UTF8
Write-Host "PM2 配置已创建" -ForegroundColor Green

# 6. 创建 Nginx 配置
Write-Host "`n[6/8] 创建 Nginx 配置文件..." -ForegroundColor Yellow
$nginxConfig = @"
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;
    client_max_body_size 10m;

    # 前端服务
    server {
        listen       80;
        server_name  localhost;

        location / {
            root   $InstallPath\frontend\dist;
            index  index.html index.htm;
            try_files `$uri `$uri/ /index.html;
        }

        # API 代理
        location /api/ {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade `$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_cache_bypass `$http_upgrade;
            proxy_read_timeout 300s;
        }

        # 上传文件
        location /uploads/ {
            alias $InstallPath\uploads\;
        }

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
"@
$nginxConfig | Out-File -FilePath "$InstallPath\nginx.conf" -Encoding UTF8
Write-Host "Nginx 配置已创建" -ForegroundColor Green

# 7. 创建启动脚本
Write-Host "`n[7/8] 创建启动脚本..." -ForegroundColor Yellow

# 启动脚本
$startScript = @"
@echo off
echo Starting ERP System...
cd $InstallPath
pm2 start ecosystem.config.js
echo API started on port 3000
echo.
echo Access the application at: http://localhost
echo.
pause
"@
$startScript | Out-File -FilePath "$InstallPath\start.bat" -Encoding ASCII

# 停止脚本
$stopScript = @"
@echo off
echo Stopping ERP System...
cd $InstallPath
pm2 stop inventory-api
echo System stopped
pause
"@
$stopScript | Out-File -FilePath "$InstallPath\stop.bat" -Encoding ASCII

# 备份脚本
$backupScript = @"
@echo off
set BACKUP_DIR=$InstallPath\backup
set DATE=%date:~0,4%%date:~5,2%%date:~8,2%
echo Creating backup...
mysqldump -u inventory_user -p$DbPassword inventory_saas > "%BACKUP_DIR%\db-%DATE%.sql"
xcopy "$InstallPath\uploads" "%BACKUP_DIR%\uploads-%DATE%\" /E /I /Y
echo Backup completed: %BACKUP_DIR%\db-%DATE%.sql
"@
$backupScript | Out-File -FilePath "$InstallPath\backup.bat" -Encoding ASCII

Write-Host "脚本创建完成" -ForegroundColor Green

# 8. 配置防火墙
Write-Host "`n[8/8] 配置防火墙规则..." -ForegroundColor Yellow
netsh advfirewall firewall add rule name="ERP-HTTP" dir=in action=allow protocol=tcp localport=80 | Out-Null
netsh advfirewall firewall add rule name="ERP-API" dir=in action=allow protocol=tcp localport=3000 | Out-Null
Write-Host "防火墙规则已添加" -ForegroundColor Green

Write-Host "`n=== 部署准备完成 ===" -ForegroundColor Green
Write-Host "`n下一步操作:" -ForegroundColor Yellow
Write-Host "1. 安装 MySQL 8.0 并创建数据库" -ForegroundColor Cyan
Write-Host "2. 安装 Redis 并设置密码" -ForegroundColor Cyan
Write-Host "3. 安装 Nginx" -ForegroundColor Cyan
Write-Host "4. 复制项目文件到 $InstallPath" -ForegroundColor Cyan
Write-Host "5. 运行 'npm ci' 和 'npm run build'" -ForegroundColor Cyan
Write-Host "6. 运行 '$InstallPath\start.bat' 启动系统" -ForegroundColor Cyan
Write-Host "`n重要文件:" -ForegroundColor Yellow
Write-Host "- 密码文件: $passwordFile" -ForegroundColor Cyan
Write-Host "- 环境配置: $InstallPath\.env" -ForegroundColor Cyan
Write-Host "- 启动脚本: $InstallPath\start.bat" -ForegroundColor Cyan
