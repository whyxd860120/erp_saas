# 🚀 远程服务器后端修复 - 完整工具包

## 📦 可用脚本清单

### 1️⃣ **Fix-And-Start-Backend.ps1** ⭐ 推荐
**功能**: 自动化修复和启动后端服务  
**使用场景**: 首次部署或配置错误时

```powershell
# 以管理员身份运行 PowerShell
cd e:\project\ERP2026\inventory-system
.\Fix-And-Start-Backend.ps1
```

**自动执行**:
- ✅ 备份配置文件
- ✅ 修复数据库密码不一致问题
- ✅ 验证 MySQL 连接
- ✅ 检查 Node.js 环境
- ✅ 安装依赖（如需要）
- ✅ 启动后端服务
- ✅ 测试 API 接口
- ✅ 显示详细报告

---

### 2️⃣ **fix-and-start-backend.bat**
**功能**: 批处理版本的修复脚本  
**使用场景**: 不熟悉 PowerShell 的用户

```batch
# 双击运行或在命令行执行
fix-and-start-backend.bat
```

---

### 3️⃣ **Check-Backend-Health.ps1**
**功能**: 快速健康检查  
**使用场景**: 验证修复是否成功，或日常检查

```powershell
.\Check-Backend-Health.ps1
```

**检查项目**:
- ✅ .env 配置正确性
- ✅ MySQL 服务状态
- ✅ MySQL 连接测试
- ✅ Node.js 可用性
- ✅ 后端服务响应

---

### 4️⃣ **REMOTE-SERVER-FIX.md**
**功能**: 详细的使用文档  
**内容**: 
- 问题诊断
- 手动修复步骤
- 常见问题解答
- 故障排除指南

---

## 🎯 快速开始（3 步搞定）

### 步骤 1: 上传文件到服务器
通过远程桌面或 FTP 上传以下文件到 `e:\project\ERP2026\inventory-system`:
- `Fix-And-Start-Backend.ps1`
- `Check-Backend-Health.ps1`
- `.env` (已修复的版本)

### 步骤 2: 执行修复脚本
```powershell
# 右键点击 PowerShell → "以管理员身份运行"
cd e:\project\ERP2026\inventory-system
.\Fix-And-Start-Backend.ps1
```

### 步骤 3: 验证结果
```powershell
.\Check-Backend-Health.ps1
```

如果所有检查都通过（绿色 ✓），说明修复成功！

---

## 🔍 问题诊断流程

```
前端显示 502 错误
    ↓
检查后端是否运行
    ↓
├─ 未运行 → 运行 Fix-And-Start-Backend.ps1
│
├─ 正在运行但返回 502
│   ├─ 检查 .env 配置 → Check-Backend-Health.ps1
│   ├─ 修复配置 → Fix-And-Start-Backend.ps1
│   └─ 重启服务
│
└─ 正常运行
    └─ 检查防火墙/代理设置
```

---

## 📋 修复前后对比

### ❌ 修复前
```env
DB_PASSWORD=Esoft123@456
DATABASE_URL="mysql://root:erpnext123@localhost:3306/erpnext_db?charset=utf8mb4"
```
**问题**: 密码不一致 → 后端无法连接数据库 → 502 错误

### ✅ 修复后
```env
DB_PASSWORD=Esoft123@456
DATABASE_URL="mysql://root:Esoft123@456@localhost:3306/erpnext_db?charset=utf8mb4"
```
**结果**: 密码一致 → 后端正常启动 → API 正常工作

---

## 🛠️ 常用命令速查

### 检查服务状态
```powershell
# MySQL 服务
Get-Service MySQL

# 后端端口
netstat -ano | findstr ":3000"

# Node.js 进程
Get-Process node
```

### 启动/停止服务
```powershell
# 启动 MySQL
Start-Service MySQL

# 停止 MySQL
Stop-Service MySQL

# 启动后端
npm run dev

# 停止后端
# 在后端窗口按 Ctrl+C
```

### 测试连接
```powershell
# MySQL 连接测试
$env:MYSQL_PWD='Esoft123@456'
& "C:\tools\mysql\current\bin\mysql.exe" -u root -h localhost -P 3306 erpnext_db

# API 测试
Invoke-WebRequest http://localhost:3000/api/v1/auth/search-tenants?username=test
```

---

## ⚠️ 注意事项

1. **必须以管理员身份运行 PowerShell**
   - 右键点击 PowerShell
   - 选择"以管理员身份运行"

2. **确保在正确的目录执行**
   ```powershell
   cd e:\project\ERP2026\inventory-system
   ```

3. **保持后端窗口打开**
   - 后端在新窗口中运行
   - 关闭该窗口会停止服务
   - 窗口显示实时日志和错误信息

4. **首次启动需要等待**
   - 后端启动需要 10-15 秒
   - 看到 "Server running on http://localhost:3000" 才算成功

5. **防火墙设置**
   - 确保 3000 端口未被防火墙阻止
   - 如需远程访问，配置防火墙规则

---

## 📞 获取帮助

### 查看日志
后端窗口的输出是最重要的调试信息来源。

### 常见错误及解决

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| Access denied | 密码错误 | 检查 .env 中的密码 |
| EADDRINUSE | 端口被占用 | 终止占用进程或更改端口 |
| Cannot find module | 依赖缺失 | 运行 `npm install` |
| Connection refused | MySQL 未启动 | `Start-Service MySQL` |

### 联系支持
如果以上方法都无法解决问题，请提供：
1. 后端窗口的完整错误信息
2. `Check-Backend-Health.ps1` 的输出
3. `.env` 文件内容（隐藏密码）
4. 系统环境信息（Windows 版本、Node.js 版本等）

---

## ✅ 成功标志

修复成功后，您应该看到：

1. **后端窗口显示**:
   ```
   🚀 Server running on http://localhost:3000
   ✅ Database connected
   ✅ Redis connected
   ```

2. **健康检查全部通过**:
   ```
   ✓ All checks passed!
   The backend is working correctly.
   ```

3. **前端正常访问**:
   - 不再出现 502 错误
   - 可以正常登录
   - API 请求成功

---

**准备好开始了吗？**  
👉 立即运行: `.\Fix-And-Start-Backend.ps1`

---

*最后更新: 2026-05-27*  
*版本: 1.0*
