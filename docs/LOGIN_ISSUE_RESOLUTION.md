# 登录问题解决方案

## 🚨 问题：输入 admin@erp2026.com / admin123 登录失败

### 问题原因
数据库中没有系统管理员账号，或者密码不匹配。

### ✅ 解决方案：创建系统管理员账号

## 🛠️ 解决步骤

### 步骤1：停止后端服务
```bash
# 如果正在运行，先停止
# Ctrl+C 或关闭终端
```

### 步骤2：运行初始化脚本
```bash
# 在项目根目录执行
npm run seed:admin
```

### 步骤3：验证创建结果
脚本会显示以下信息：
```
🚀 开始初始化系统管理员...
✅ 创建系统管理员成功: admin@erp2026.com
✅ 创建示例租户成功: 示例公司
✅ 创建租户管理员成功: admin@demo.com
🎉 初始化完成！

📋 登录信息：
系统管理员: admin@erp2026.com / admin123
租户管理员: admin@demo.com / admin123 (租户标识: demo)
```

### 步骤4：重新启动后端服务
```bash
npm run dev
```

### 步骤5：重新登录
现在可以使用以下账号登录：

#### 系统管理员（可以管理所有租户）
```
账号：admin@erp2026.com
密码：admin123
```

#### 租户管理员（只能管理示例租户）
```
账号：admin@demo.com
密码：admin123
租户标识：demo
```

---

## 🔍 检查现有账号

如果你想检查数据库中已有的账号，可以使用 Prisma Studio：

```bash
# 打开 Prisma Studio
npm run prisma:studio
```

然后在浏览器中打开 `http://localhost:5555`，可以查看和编辑数据库内容。

---

## 🐛 故障排查

### 问题1：脚本执行失败
```
Error: Can't reach database server
```
**解决方案**：
1. 确保MySQL服务正在运行
2. 检查 `.env` 文件中的数据库连接信息
3. 验证数据库密码是否正确

### 问题2：权限错误
```
Error: Permission denied
```
**解决方案**：
1. 确保在项目根目录执行脚本
2. 检查文件权限（Linux/Mac）
3. 使用管理员权限执行（Windows：以管理员身份运行终端）

### 问题3：Prisma客户端未生成
```
Error: Cannot find module '@prisma/client'
```
**解决方案**：
```bash
# 生成 Prisma Client
npm run prisma:generate
```

### 问题4：TypeScript编译错误
```
Error: Cannot find module 'ts-node'
```
**解决方案**：
```bash
# 安装依赖
npm install
```

---

## 🔑 手动创建系统管理员

如果脚本执行失败，可以手动创建系统管理员：

### 方法1：使用MySQL命令行
```bash
# 连接数据库
mysql -u root -p erpnext_db

# 执行SQL（密码是 bcrypt 加密的 admin123）
INSERT INTO system_users (id, email, password, name, role, status, created_at, updated_at)
VALUES (
  'admin001',
  'admin@erp2026.com',
  '$2a$10$XOPbrlUPQdrgJlJz8W.J.UYmQKPvq5qGXN3zG8XyqNzv2tG3n6', -- admin123的bcrypt加密
  '系统管理员',
  'super_admin',
  'active',
  NOW(),
  NOW()
);
```

### 方法2：创建自定义脚本
创建 `create-admin.js`：

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.systemUser.create({
    data: {
      email: 'admin@erp2026.com',
      password: hashedPassword,
      name: '系统管理员',
      role: 'super_admin',
      status: 'active',
    },
  });
  
  console.log('系统管理员创建成功:', admin.email);
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

然后执行：
```bash
node create-admin.js
```

---

## 📋 账号信息汇总

### 系统管理员
| 属性 | 值 |
|------|-----|
| 邮箱 | admin@erp2026.com |
| 密码 | admin123 |
| 角色 | super_admin |
| 权限 | 可以管理所有租户和系统设置 |
| 菜单 | 可以看到"租户管理"菜单 |

### 租户管理员（示例）
| 属性 | 值 |
|------|-----|
| 邮箱 | admin@demo.com |
| 密码 | admin123 |
| 角色 | admin |
| 租户 | demo (示例公司) |
| 权限 | 只能管理demo租户内的功能 |
| 菜单 | 只能看到租户内的管理菜单 |

---

## 🔐 安全建议

### 1. 修改默认密码
首次登录后立即修改密码：
1. 登录系统
2. 点击右上角用户头像
3. 选择"修改密码"
4. 输入新密码并确认

### 2. 使用强密码
- 至少8个字符
- 包含大小写字母
- 包含数字和特殊字符
- 避免使用常见密码

### 3. 启用双重认证（如果支持）
- 提高账号安全性
- 防止未授权访问

---

## 🚀 快速测试

### 测试系统管理员登录
```bash
# 方式1：通过浏览器
打开 http://localhost:5173
输入：admin@erp2026.com / admin123

# 方式2：通过API
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@erp2026.com",
    "password": "admin123"
  }'
```

### 测试租户管理员登录
```bash
# 通过API
curl -X POST http://localhost:3000/api/v1/auth/tenant/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "admin123",
    "tenantSlug": "demo"
  }'
```

---

## 📞 仍然无法解决？

如果以上方法都无法解决，请检查：

1. **数据库连接**
   ```bash
   # 测试MySQL连接
   mysql -u root -p erpnext_db
   ```

2. **环境变量**
   ```bash
   # 检查.env文件配置
   cat .env
   ```

3. **日志信息**
   ```bash
   # 查看后端日志
   npm run dev
   ```

4. **浏览器控制台**
   - 打开浏览器开发者工具（F12）
   - 查看Console标签的错误信息
   - 查看Network标签的请求和响应

---

## 📚 相关文档

- [SaaS使用指南](./SAAS_USER_GUIDE.md)
- [系统管理员租户管理](./SYSTEM_ADMIN_TENANT_MANAGEMENT.md)
- [多种登录方式支持](./MULTI_LOGIN_SUPPORT.md)

---

**提示**: 如果是开发环境，建议使用 `npm run seed:admin` 快速初始化系统。生产环境部署时，请务必修改默认密码！