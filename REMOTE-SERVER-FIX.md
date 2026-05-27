# 远程服务器后端修复指南

## 📋 问题描述
前端显示 **502 Bad Gateway** 错误，原因是后端服务未正常运行。

## 🔍 根本原因
`.env` 配置文件中的数据库密码不一致：
- `DB_PASSWORD=Esoft123@456`
- `DATABASE_URL` 中使用的是 `erpnext123` ❌

这导致后端无法连接数据库，启动失败。

---

## ✅ 解决方案（3 步完成）

### 方法一：使用 PowerShell 脚本（推荐）⭐

#### 步骤 1: 上传脚本到服务器
将以下文件上传到远程服务器的项目根目录：
- `Fix-And-Start-Backend.ps1`

#### 步骤 2: 以管理员身份运行 PowerShell
```powershell
# 右键点击 PowerShell，选择"以管理员身份运行"

# 进入项目目录
cd e:\project\ERP2026\inventory-system

# 执行修复脚本
.\Fix-And-Start-Backend.ps1
```

#### 步骤 3: 等待自动完成
脚本会自动：
1. ✅ 备份 `.env` 文件
2. ✅ 修复数据库密码配置
3. ✅ 测试 MySQL 连接
4. ✅ 检查 Node.js 环境
5. ✅ 安装依赖（如需要）
6. ✅ 启动后端服务
7. ✅ 测试 API 接口

---

### 方法二：使用批处理脚本

#### 步骤 1: 上传脚本到服务器
将以下文件上传到远程服务器的项目根目录：
- `fix-and-start-backend.bat`

#### 步骤 2: 双击运行
```
双击: fix-and-start-backend.bat
```

或者在命令行中运行：
```batch
cd e:\project\ERP2026\inventory-system
fix-and-start-backend.bat
```

---

## 🔧 手动修复步骤（如果脚本失败）

### 步骤 1: 修复 .env 文件

编辑 `.env` 文件，找到这一行：
```env
DATABASE_URL="mysql://root:erpnext123@localhost:3306/erpnext_db?charset=utf8mb4"
```

修改为：
```env
DATABASE_URL="mysql://root:Esoft123@456@localhost:3306/erpnext_db?charset=utf8mb4"
```

**确保密码与 `DB_PASSWORD` 字段一致！**

### 步骤 2: 重启后端服务

```bash
# 如果后端正在运行，按 Ctrl+C 停止它

# 重新启动
npm run dev
```

### 步骤 3: 验证服务启动

查看控制台输出，应该看到：
```
🚀 Server running on http://localhost:3000
✅ Database connected
✅ Redis connected
```

### 步骤 4: 刷新浏览器

后端启动成功后，刷新前端页面（F5），502 错误应该消失。

---

## 🧪 验证步骤

### 1. 检查后端是否运行
```powershell
# 检查 3000 端口
netstat -ano | findstr ":3000"

# 应该看到类似输出：
# TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
```

### 2. 测试 API 接口
```powershell
# 测试搜索租户接口
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/search-tenants?username=test" -Method GET
```

### 3. 检查数据库连接
```powershell
$env:MYSQL_PWD='Esoft123@456'
& "C:\tools\mysql\current\bin\mysql.exe" -u root -h localhost -P 3306 -e "SELECT 'OK' AS status;" erpnext_db
```

---

## ❓ 常见问题

### Q1: MySQL 连接失败？
**检查 MySQL 服务状态：**
```powershell
Get-Service MySQL
```

如果未运行，启动它：
```powershell
Start-Service MySQL
```

### Q2: 提示找不到 Node.js？
**安装 Node.js：**
1. 下载: https://nodejs.org/
2. 安装 LTS 版本（>= 18.0.0）
3. 重启命令行

### Q3: Redis 未安装？
Redis 是可选的。如果未安装，可以暂时注释掉相关代码，或安装 Redis for Windows。

### Q4: 端口 3000 被占用？
**查找占用进程：**
```powershell
netstat -ano | findstr ":3000"
```

**终止进程：**
```powershell
taskkill /F /PID <进程ID>
```

### Q5: 依赖安装失败？
**清理并重新安装：**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 预期结果

修复完成后：
- ✅ 后端服务正常运行在 `http://localhost:3000`
- ✅ 前端可以正常访问 API
- ✅ 登录功能正常工作
- ✅ 不再出现 502 错误

---

## 📞 技术支持

如果遇到问题，请提供：
1. 后端服务器窗口的错误信息截图
2. `.env` 文件内容（隐藏敏感信息）
3. MySQL 服务状态
4. Node.js 版本 (`node --version`)

---

**最后更新**: 2026-05-27  
**适用版本**: ERP Inventory System v1.0
