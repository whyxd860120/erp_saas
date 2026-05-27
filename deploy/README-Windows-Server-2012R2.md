# Windows Server 2012 R2 部署指南

## ⚠️ 重要提示

Windows Server 2012 R2 已于 2023年10月停止扩展支持，建议尽快升级到 Windows Server 2019/2022。

## 快速部署步骤

### 1. 准备工作

```powershell
# 以管理员身份运行 PowerShell
# 设置执行策略
Set-ExecutionPolicy RemoteSigned -Force

# 进入部署目录
cd E:\project\ERP2026\inventory-system\deploy
```

### 2. 运行自动部署脚本

```powershell
.\install-windows.ps1 -InstallPath "C:\inventory-system"
```

脚本会自动：
- ✅ 检查并安装 Node.js 18.x
- ✅ 创建目录结构
- ✅ 生成安全密钥
- ✅ 创建所有配置文件
- ✅ 配置防火墙规则

### 3. 手动安装数据库和缓存

#### MySQL 8.0

1. 下载安装程序
   - https://dev.mysql.com/downloads/mysql/
   - 选择 "Windows (x86, 64-bit), ZIP Archive"

2. 安装步骤
   ```powershell
   # 解压到 C:\mysql
   # 创建配置文件 C:\mysql\my.ini
   ```

3. 配置文件 `C:\mysql\my.ini`
   ```ini
   [mysqld]
   basedir=C:/mysql
   datadir=C:/mysql/data
   port=3306
   character-set-server=utf8mb4
   default-storage-engine=InnoDB
   max_connections=200
   
   [client]
   port=3306
   default-character-set=utf8mb4
   ```

4. 初始化并启动
   ```powershell
   # 初始化数据库
   C:\mysql\bin\mysqld --initialize-insecure --console
   
   # 安装服务
   C:\mysql\bin\mysqld --install MySQL
   
   # 启动服务
   net start MySQL
   
   # 设置 root 密码
   C:\mysql\bin\mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '你的密码';"
   
   # 创建应用用户（使用脚本生成的密码）
   C:\mysql\bin\mysql -u root -p -e "
   CREATE DATABASE inventory_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'inventory_user'@'localhost' IDENTIFIED BY '脚本生成的密码';
   GRANT ALL PRIVILEGES ON inventory_saas.* TO 'inventory_user'@'localhost';
   FLUSH PRIVILEGES;
   "
   ```

#### Redis（Windows 版）

1. 下载安装包
   - https://github.com/microsoftarchive/redis/releases
   - 下载 `Redis-x64-3.0.504.msi`

2. 安装并配置
   ```powershell
   # 安装 MSI 包
   # 编辑配置文件
   notepad "C:\Program Files\Redis\redis.windows.conf"
   ```

3. 添加密码（找到并修改）
   ```conf
   requirepass 脚本生成的Redis密码
   ```

4. 重启服务
   ```powershell
   net stop Redis
   net start Redis
   ```

#### Nginx

1. 下载
   - http://nginx.org/en/download.html
   - 下载 Stable version 的 Windows 版本

2. 解压到 `C:\nginx`

3. 复制配置文件
   ```powershell
   copy "C:\inventory-system\nginx.conf" "C:\nginx\conf\nginx.conf"
   ```

4. 启动 Nginx
   ```powershell
   cd C:\nginx
   start nginx
   ```

### 4. 部署应用程序

```powershell
# 复制项目文件到服务器
# 假设项目文件在 C:\inventory-system

cd C:\inventory-system

# 安装后端依赖
npm ci --production

# 数据库迁移
npx prisma migrate deploy
npx prisma generate

# 构建后端
npm run build

# 构建前端
cd frontend
npm ci
npm run build
cd ..

# 安装 PM2
npm install -g pm2
npm install -g pm2-windows-service
```

### 5. 启动系统

```powershell
# 方式1：使用启动脚本
C:\inventory-system\start.bat

# 方式2：手动启动
cd C:\inventory-system
pm2 start ecosystem.config.js
pm2 save
pm2-startup install
```

### 6. 设置开机自启

```powershell
# PM2 开机自启
pm2-startup install

# Nginx 开机自启
# 创建计划任务
schtasks /create /tn "Start Nginx" /tr "C:\nginx\nginx.exe" /sc onstart /ru SYSTEM
```

### 7. 验证部署

```powershell
# 检查所有服务
Get-Process | Where-Object { $_.ProcessName -match "nginx|node|redis|mysqld" }

# 测试 API
curl http://localhost:3000/api/health

# 测试前端
curl http://localhost
```

## 日常维护

### 启动/停止

```powershell
# 启动
C:\inventory-system\start.bat

# 停止
C:\inventory-system\stop.bat

# 重启 API
pm2 restart inventory-api
```

### 备份

```powershell
# 运行备份脚本
C:\inventory-system\backup.bat

# 或手动备份
# 数据库
mysqldump -u inventory_user -p inventory_saas > C:\inventory-system\backup\db-$(Get-Date -Format 'yyyyMMdd').sql

# 上传文件
xcopy C:\inventory-system\uploads C:\inventory-system\backup\uploads-$(Get-Date -Format 'yyyyMMdd')\ /E /I /Y
```

### 查看日志

```powershell
# 应用日志
pm2 logs inventory-api

# 错误日志
Get-Content C:\inventory-system\logs\error.log -Tail 50

# Nginx 日志
Get-Content C:\nginx\logs\error.log -Tail 50
```

## 故障排查

### 问题1：Node.js 安装失败
```powershell
# 手动下载安装
# https://nodejs.org/dist/v18.20.4/node-v18.20.4-x64.msi
```

### 问题2：MySQL 无法启动
```powershell
# 检查端口占用
netstat -ano | findstr 3306

# 查看错误日志
Get-Content C:\mysql\data\*.err -Tail 20
```

### 问题3：API 无法访问
```powershell
# 检查防火墙
netsh advfirewall firewall show rule name=all | findstr "ERP"

# 检查端口监听
netstat -ano | findstr 3000

# 查看 PM2 状态
pm2 status
pm2 logs
```

### 问题4：前端白屏
```powershell
# 检查前端文件是否存在
Get-ChildItem C:\inventory-system\frontend\dist

# 检查 Nginx 配置
C:\nginx\nginx.exe -t
```

## 安全加固建议

1. **修改默认密码**
   - MySQL root 密码
   - Redis 密码
   - 应用管理员密码

2. **配置防火墙**
   - 只允许 80/443 端口对外
   - 3306/6379/3000 仅限本地访问

3. **定期备份**
   - 设置计划任务每日备份
   - 备份文件异地存储

4. **监控告警**
   - 磁盘空间监控
   - 服务状态监控
   - 错误日志监控

## 升级路径

建议尽快升级到 Windows Server 2019/2022，迁移步骤：

1. 在新服务器安装系统
2. 备份数据（数据库 + 上传文件）
3. 在新服务器部署应用
4. 恢复数据
5. 切换 DNS 或 IP
6. 验证无误后下线旧服务器
