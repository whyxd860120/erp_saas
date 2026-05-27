# ERP 系统更新部署指南

## 方案一：简单更新（推荐）

### 本机操作

1. **双击运行更新脚本**
   ```
   E:\project\ERP2026\inventory-system\deploy\update\simple-update.bat
   ```

2. **脚本会自动完成：**
   - ✅ 构建后端代码
   - ✅ 构建前端代码
   - ✅ 打包更新文件
   - ✅ 上传到服务器

3. **在服务器上执行更新**
   ```powershell
   # 登录服务器，运行：
   C:\inventory-system\deploy\update\update-server.ps1 -AutoRestart
   ```

---

## 方案二：PowerShell 更新（高级）

### 本机操作

```powershell
# 进入项目目录
cd E:\project\ERP2026\inventory-system

# 运行部署脚本
.\deploy\update\deploy-to-server.ps1 `
    -ServerIP "192.168.1.100" `
    -ServerPath "C:\inventory-system" `
    -RestartService
```

### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-ServerIP` | 服务器IP地址 | 192.168.1.100 |
| `-ServerPath` | 服务器安装路径 | C:\inventory-system |
| `-IncludeNodeModules` | 包含依赖（首次部署） | false |
| `-RestartService` | 自动重启服务 | false |

---

## 方案三：手动更新

### 1. 本机构建

```powershell
cd E:\project\ERP2026\inventory-system

# 构建后端
npm run build

# 构建前端
cd frontend
npm run build
cd ..
```

### 2. 打包文件

将以下文件打包成 `update.zip`：
```
update.zip
├── dist/                    # 后端编译代码
├── frontend/dist/           # 前端编译代码
└── prisma/migrations/       # 数据库迁移（如有变更）
```

### 3. 上传到服务器

复制 `update.zip` 到服务器的：
```
C:\inventory-system\updates\
```

### 4. 服务器执行更新

```powershell
# 方式1：自动更新（推荐）
C:\inventory-system\deploy\update\update-server.ps1 -AutoRestart

# 方式2：手动步骤
cd C:\inventory-system

# 停止服务
pm2 stop inventory-api

# 备份当前版本
xcopy dist backup\dist-%date:~0,4%%date:~5,2%%date:~8,2% /E /I /Y

# 解压更新包
Expand-Archive -Path updates\update.zip -DestinationPath . -Force

# 执行数据库迁移
npx prisma migrate deploy

# 重启服务
pm2 start inventory-api
```

---

## 定时备份设置

### 1. 创建备份任务

```powershell
# 在服务器上以管理员运行
C:\inventory-system\deploy\backup\create-backup-task.ps1
```

### 2. 验证备份任务

```powershell
# 查看任务
schtasks /query /tn "ERP-Inventory-Backup"

# 手动运行测试
schtasks /run /tn "ERP-Inventory-Backup"

# 查看备份日志
Get-Content C:\inventory-system\logs\backup.log -Tail 20
```

### 3. 备份文件位置

```
C:\inventory-system\backup\
├── db-20240115_020000.sql      # 数据库备份
├── uploads-20240115_020000/    # 上传文件备份
└── versions/                   # 版本备份
    ├── update-20240114.zip
    └── dist-20240114/
```

---

## 更新流程图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   本机开发   │ ──▶ │   构建打包   │ ──▶ │  上传服务器  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   完成更新   │ ◀── │   重启服务   │ ◀── │  执行更新   │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 常见问题

### Q1: 更新后服务无法启动

```powershell
# 查看错误日志
pm2 logs inventory-api

# 回滚到上一版本
cd C:\inventory-system\backup\versions
copy dist-xxx C:\inventory-system\dist /E /Y
pm2 restart inventory-api
```

### Q2: 数据库迁移失败

```powershell
# 查看迁移状态
npx prisma migrate status

# 重置迁移（谨慎操作）
npx prisma migrate reset

# 或者手动修复
npx prisma migrate resolve --applied xxx
```

### Q3: 上传文件到服务器失败

**检查清单：**
- [ ] 服务器防火墙是否允许 SMB (445端口)
- [ ] 是否启用了文件共享
- [ ] 是否有写入权限

**替代方案：**
```powershell
# 使用 SCP (如果安装了 OpenSSH)
scp update.zip Administrator@192.168.1.100:C:/inventory-system/updates/

# 或者手动复制到共享文件夹
```

### Q4: 如何只更新前端

修改 `simple-update.bat`，注释掉后端构建：
```batch
rem echo  - 构建后端...
rem npm run build

echo  - 构建前端...
cd frontend
npm run build
```

---

## 安全建议

1. **更新前备份**
   - 数据库自动每日备份
   - 更新前手动备份当前版本

2. **测试环境**
   - 先在测试服务器验证
   - 确认无误后再更新生产环境

3. **回滚准备**
   - 保留最近3个版本
   - 记录更新日志

4. **更新时段**
   - 选择业务低峰期
   - 提前通知用户

---

## 文件清单

```
deploy/
├── backup/
│   ├── backup-database.ps1      # 备份脚本
│   └── create-backup-task.ps1   # 创建定时任务
├── update/
│   ├── update-server.ps1        # 服务器端更新
│   ├── deploy-to-server.ps1     # 本机部署脚本
│   └── simple-update.bat        # 简单更新批处理
└── README-Update.md             # 本文档
```
