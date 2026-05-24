# 租户用户数显示为0的问题修复

## 🐛 问题描述

用户注册了新租户（如"易元软件"），创建了默认管理员账号（如 399905822@qq.com），但用系统管理员登录查看租户时，用户数显示为0。

## 🔍 问题原因

**根本原因**: 后端租户列表查询API (`GET /api/v1/tenants`) 没有包含用户数量统计。

**具体问题**:
1. `getTenants` 函数查询租户列表时，没有包含 `_count.users` 统计
2. `getTenantById` 函数的 `_count` 查询中缺少用户统计
3. `getMyTenant` 函数的 `_count` 查询中也缺少用户统计

## ✅ 解决方案

### 1. 修复租户列表查询 (`getTenants`)

**文件**: `src/controllers/tenant.controller.ts`

**修改前**:
```typescript
const [tenants, total] = await Promise.all([
  prisma.tenant.findMany({
    where,
    skip,
    take: limitNum,
    orderBy: { createdAt: 'desc' },
  }),
  prisma.tenant.count({ where }),
]);
```

**修改后**:
```typescript
const [tenants, total] = await Promise.all([
  prisma.tenant.findMany({
    where,
    skip,
    take: limitNum,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  }),
  prisma.tenant.count({ where }),
]);
```

### 2. 修复租户详情查询 (`getTenantById`)

**文件**: `src/controllers/tenant.controller.ts`

**修改前**:
```typescript
_count: {
  select: {
    suppliers: true,
    customers: true,
    products: true,
    purchaseOrders: true,
    salesOrders: true,
  },
},
```

**修改后**:
```typescript
_count: {
  select: {
    users: true,              // 新增
    suppliers: true,
    customers: true,
    products: true,
    purchaseOrders: true,
    salesOrders: true,
  },
},
```

### 3. 修复当前租户查询 (`getMyTenant`)

**文件**: `src/controllers/tenant.controller.ts`

**修改前**:
```typescript
_count: {
  select: {
    suppliers: true,
    customers: true,
    products: true,
    purchaseOrders: true,
    salesOrders: true,
  },
},
```

**修改后**:
```typescript
_count: {
  select: {
    users: true,              // 新增
    suppliers: true,
    customers: true,
    products: true,
    purchaseOrders: true,
    salesOrders: true,
  },
},
```

## 🎯 前端显示（已正确配置）

**文件**: `frontend/src/views/TenantListView.vue`

前端已经正确处理用户数量显示：
```vue
<el-table-column prop="userCount" label="用户数" width="100" align="center">
  <template #default="{ row }">
    {{ row._count?.users || 0 }} / {{ row.quotaUsers || 5 }}
  </template>
</el-table-column>
```

显示格式：`当前用户数 / 配额用户数`（如：`1 / 5`）

## 🚀 应用修复

### 步骤1：重启后端服务
```bash
# 停止当前运行的服务 (Ctrl+C)
# 重新启动
npm run dev
```

### 步骤2：刷新前端页面
- 在浏览器中刷新租户管理页面
- 用户数应该正确显示

### 步骤3：验证修复
1. 用系统管理员登录
2. 进入 `SaaS配置` → `租户管理`
3. 查看"易元软件"租户的用户数
4. 应该显示为 `1 / 5`（1个用户，配额5个）

## 📊 测试验证

### 测试场景1：注册新租户
```bash
# 1. 注册新租户
注册信息：
- 公司名称：测试公司
- 租户标识：test-company  
- 管理员邮箱：test@test.com
- 管理员密码：test123

# 2. 用系统管理员登录
账号：admin@erp2026.com
密码：admin123

# 3. 查看租户列表
应该看到"测试公司"，用户数显示：1 / 5
```

### 测试场景2：查看已有租户
```bash
# 用系统管理员登录
账号：admin@erp2026.com
密码：admin123

# 查看"易元软件"租户
应该显示：1 / 5（因为只有默认管理员账号）
```

### 测试场景3：添加新用户
```bash
# 1. 进入用户管理，添加新用户
# 2. 重新查看租户列表
用户数应该增加（如：2 / 5）
```

## 🔍 验证数据库状态

### 使用Prisma Studio
```bash
npm run prisma:studio
```

### 检查租户和用户关联
```sql
-- 查看所有租户
SELECT id, name, slug, quota_users FROM tenants;

-- 查看特定租户的用户
SELECT id, name, email, role, tenant_id 
FROM users 
WHERE tenant_id = '易元软件的tenant_id';

-- 统计每个租户的用户数
SELECT 
  t.name as tenant_name,
  t.slug as tenant_slug,
  COUNT(u.id) as user_count,
  t.quota_users as user_quota
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
GROUP BY t.id, t.name, t.slug, t.quota_users;
```

### 验证API响应
```bash
# 获取租户列表（应该包含 _count.users）
curl -X GET http://localhost:3000/api/v1/tenants \
  -H "Authorization: Bearer YOUR_TOKEN"

# 预期响应包含：
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "xxx",
        "name": "易元软件",
        "_count": {
          "users": 1
        }
      }
    ]
  }
}
```

## 🎉 预期结果

修复后，租户列表应该正确显示用户数：

| 租户名称 | 租户标识 | 用户数 | 配额 |
|----------|----------|--------|------|
| 易元软件 | yi-yuan-ruan-jian | 1 / 5 | 5人 |
| 示例公司 | demo | 1 / 5 | 5人 |
| 测试公司 | test-company | 1 / 5 | 5人 |

每个租户至少有1个用户（注册时创建的管理员账号）。

## 🛠️ 故障排查

### 如果修复后仍然显示0

**检查1：数据库中是否有用户**
```bash
npm run prisma:studio
# 查看 users 表，确认是否有数据
```

**检查2：用户是否正确关联到租户**
```sql
SELECT u.*, t.name as tenant_name 
FROM users u 
LEFT JOIN tenants t ON u.tenant_id = t.id 
WHERE u.email = '399905822@qq.com';
```

**检查3：API响应是否正确**
```bash
# 查看浏览器控制台
# 查看Network标签的API响应
# 确认 _count.users 字段存在
```

**检查4：前端显示逻辑**
```javascript
// 检查 row._count?.users 是否正确获取
console.log('租户数据:', row);
console.log('用户数:', row._count?.users);
```

## 📝 相关文件

- `src/controllers/tenant.controller.ts` - 租户控制器（已修复）
- `frontend/src/views/TenantListView.vue` - 租户管理界面（已正确）
- `prisma/schema.prisma` - 数据库Schema

## 🎯 总结

- **问题**: 后端API缺少用户数量统计
- **修复**: 在3个查询函数中添加 `_count.users` 统计
- **前端**: 已经正确配置显示逻辑
- **验证**: 重启后端服务，刷新前端页面

修复后，所有租户的用户数都将正确显示！

---

**修复时间**: 2026-05-22  
**影响范围**: 租户管理模块  
**修复状态**: ✅ 已完成