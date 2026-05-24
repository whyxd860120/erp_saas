# SaaS库存管理系统重构操作文档

## 📋 目录

1. [项目概述](#项目概述)
2. [重构内容概览](#重构内容概览)
3. [核心模块详解](#核心模块详解)
4. [数据库Schema优化](#数据库schema优化)
5. [API使用指南](#api使用指南)
6. [部署步骤](#部署步骤)
7. [最佳实践](#最佳实践)

---

## 项目概述

本项目是符合主流SaaS标准的库存管理系统，采用多租户架构，支持完整的业务流程（采购、销售、库存、财务管理）和SaaS特性（订阅计费、API访问、Webhook等）。

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **后端** | Node.js + TypeScript | 18+ |
| **框架** | Express.js | 4.18+ |
| **ORM** | Prisma | 5.x |
| **数据库** | MySQL | 8.0+ |
| **缓存** | Redis | 7.x |
| **前端** | Vue 3 + TypeScript | 3.4+ |
| **UI** | Element Plus | 2.4+ |
| **构建** | Vite | 5.x |

### 项目结构

```
inventory-system/
├── src/                          # 后端源代码
│   ├── app.ts                    # Express应用入口
│   ├── config/                   # 配置管理
│   ├── middlewares/              # 中间件层
│   │   ├── auth.middleware.ts    # JWT认证中间件
│   │   ├── tenant.middleware.ts  # 多租户隔离中间件
│   │   ├── saas.middleware.ts    # SaaS增强中间件（新增）
│   │   └── error.middleware.ts   # 错误处理中间件
│   ├── controllers/              # 业务控制器
│   ├── routes/                   # API路由定义
│   ├── services/                 # 服务层
│   │   └── event.service.ts      # 事件系统服务（新增）
│   └── utils/                    # 工具类
│       ├── rbac.ts               # RBAC权限系统（新增）
│       └── api-response.ts       # API响应标准化（新增）
├── frontend/                     # 前端Vue应用
│   └── src/
│       ├── router/               # 路由配置
│       ├── stores/               # Pinia状态管理
│       ├── api/                  # API服务
│       └── views/                # 页面组件
├── prisma/
│   ├── schema.prisma             # 原始Schema
│   └── schema.enhanced.prisma    # 优化Schema（新增）
└── docs/
    └── SAAS_REFACTORING.md      # 本文档
```

---

## 重构内容概览

### 1. 增强多租户隔离机制

**文件**: `src/middlewares/saas.middleware.ts`

**功能增强**:
- ✅ 功能开关检查中间件 (`checkFeatureFlag`)
- ✅ API密钥认证 (`authenticateApiKey`, `requireApiPermission`)
- ✅ 基于Redis的分布式速率限制 (`createRateLimiter`)
- ✅ 请求验证和安全头处理
- ✅ 请求ID追踪

**使用示例**:

```typescript
import { checkFeatureFlag, tenantRateLimit } from './middlewares/saas.middleware';

// 检查多仓库功能是否启用
router.get('/warehouses', 
  authenticate, 
  tenantIsolation, 
  checkFeatureFlag('multiWarehouse'), // SaaS中间件
  getWarehouses
);

// 应用租户级速率限制
router.use('/api/v1/*', tenantRateLimit);
```

### 2. RBAC权限系统

**文件**: `src/utils/rbac.ts`

**功能特性**:
- ✅ 预定义7种角色层级
- ✅ 60+细粒度权限定义
- ✅ 权限检查工具类
- ✅ 角色层级验证
- ✅ 中间件快捷方式

**角色层级**:

```
super_admin (超级管理员)
  ↑
tenant_admin (租户管理员)
  ↑
admin (管理员)
  ↑
manager (经理)
  ↑
staff (职员)
  ↑
viewer (查看者)
  ↑
guest (访客)
```

**使用示例**:

```typescript
import { RBAC, requirePermission, Permission } from './utils/rbac';

// 方式1: 使用中间件
router.post('/products',
  authenticate,
  tenantIsolation,
  requirePermission(Permission.PRODUCT_CREATE),
  createProduct
);

// 方式2: 使用工具类
if (!RBAC.hasPermission(user.role, Permission.PRODUCT_DELETE)) {
  throw new ForbiddenError('权限不足');
}

// 方式3: 检查多个权限（任意一个满足即可）
router.post('/orders',
  authenticate,
  requireAnyPermission([
    Permission.PURCHASE_CREATE,
    Permission.SALES_CREATE
  ]),
  createOrder
);
```

### 3. 标准化API响应格式

**文件**: `src/utils/api-response.ts`

**响应结构**:

```typescript
// 成功响应
{
  success: true,
  code: 'SUCCESS',
  message: '操作成功',
  data: {...},
  meta: {
    timestamp: '2026-05-22T10:00:00Z',
    requestId: 'req-1234567890-abc123',
    pagination: {
      page: 1,
      pageSize: 20,
      totalPages: 5,
      totalCount: 100,
      hasNextPage: true,
      hasPrevPage: false
    }
  }
}

// 错误响应
{
  success: false,
  code: 'E4000',
  message: '资源不存在',
  errors: [
    {
      field: 'productId',
      code: 'E4001',
      message: '物料ID无效',
      details: {...}
    }
  ],
  meta: {
    timestamp: '2026-05-22T10:00:00Z',
    requestId: 'req-1234567890-abc123'
  }
}
```

**使用示例**:

```typescript
import { ApiSuccess, ApiError, Pagination } from './utils/api-response';

// 成功响应
return res.status(200).json(ApiSuccess.create(
  { id: '123', name: '物料A' },
  '创建成功'
));

// 列表响应
const pagination = Pagination.createMeta(1, 20, 100);
return res.status(200).json(ApiSuccess.list(
  items,
  pagination,
  '查询成功'
));

// 错误响应
return res.status(404).json(ApiError.notFound('物料'));

// 验证错误
return res.status(422).json(ApiError.validation([
  { field: 'name', message: '名称不能为空' },
  { field: 'price', message: '价格必须大于0' }
]));
```

### 4. 事件系统与Webhook

**文件**: `src/services/event.service.ts`

**功能特性**:
- ✅ 事件发布/订阅机制
- ✅ Webhook自动触发
- ✅ 失败重试（指数退避）
- ✅ 事件签名验证
- ✅ 事件统计

**使用示例**:

```typescript
import { eventService, EventType } from './services/event.service';

// 发布事件
await eventService.emit(
  EventType.PURCHASE_ORDER_CONFIRMED,
  tenantId,
  { orderId: 'PO001', totalAmount: 10000 },
  { userId: currentUserId }
);

// 批量发布事件
await eventService.emitBatch([
  { eventType: EventType.USER_CREATED, tenantId, data: { userId: '123' } },
  { eventType: EventType.USER_LOGIN, tenantId, data: { userId: '123' } }
]);

// 订阅事件
const unsubscribe = eventService.subscribe(
  EventType.PRODUCT_CREATED,
  (payload) => {
    console.log('新物料创建:', payload.data);
  }
);

// 取消订阅
unsubscribe();

// 获取事件统计
const stats = await eventService.getEventStats(tenantId, 30);
console.log('总事件数:', stats.totalEvents);
console.log('Webhook成功率:', stats.webhookSuccessRate);
```

### 5. 数据库Schema优化

**文件**: `prisma/schema.enhanced.prisma`

**主要改进**:

1. **新增字段**:
   - 租户: `creditLimit`, `balance` (信用管理)
   - 用户: `mfaEnabled`, `mfaSecret` (双重认证)
   - 客户/供应商: `creditLimit`, `balance`, `salesPerson` (专属业务员)
   - 商品: `minStock`, `maxStock`, `safeStock` (库存预警)
   - 所有实体: `metadata` (JSON扩展字段)

2. **新增索引**:
   - 所有表添加 `tenantId` 索引
   - 状态字段索引 (如 `status`)
   - 业务索引 (如 `orderDate`, `customerId`)
   - 复合索引优化查询性能

3. **性能优化**:
   - 租户隔离查询自动使用索引
   - 分页查询优化
   - 外键关系级联删除配置

---

## 核心模块详解

### 1. SaaS中间件系统

#### 功能开关检查

```typescript
// 检查特定功能是否启用
router.get('/analytics',
  authenticate,
  tenantIsolation,
  checkFeatureFlag('analytics'), // 仅Pro/Enterprise计划可用
  getAnalytics
);
```

**内置功能开关**:
- `multiWarehouse` - 多仓库
- `multiCurrency` - 多币种
- `customFields` - 自定义字段
- `apiAccess` - API访问
- `webhooks` - Webhook集成
- `auditLogs` - 审计日志
- `analytics` - 数据分析

#### API密钥认证

```typescript
// 启用API密钥认证的路由
router.get('/api/v1/products',
  authenticateApiKey,
  requireApiPermission('product:read'),
  getProducts
);
```

**创建API密钥**:

```typescript
const apiKey = await prisma.apiKey.create({
  data: {
    tenantId: tenantId,
    name: 'ERP Integration',
    key: generateApiKey(),
    permissions: ['product:read', 'inventory:read'],
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90天
  },
});
```

#### 速率限制

```typescript
// 租户级速率限制 (1000请求/分钟)
router.use('/api/v1/*', tenantRateLimit);

// 严格模式速率限制 (10请求/分钟)
router.post('/api/v1/login',
  strictRateLimit,
  login
);
```

**自定义速率限制**:

```typescript
const customRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 100, // 100请求
  keyPrefix: 'custom_api',
  skipSuccessfulRequests: true, // 成功请求不计入限制
});
```

### 2. RBAC权限系统

#### 权限定义

```typescript
// 模块:权限类型
Permission.PRODUCT_VIEW      // 查看物料
Permission.PRODUCT_CREATE    // 创建物料
Permission.PRODUCT_UPDATE    // 更新物料
Permission.PRODUCT_DELETE    // 删除物料
Permission.PRODUCT_MANAGE    // 管理物料
```

#### 角色权限矩阵

| 功能 | Admin | Manager | Staff | Viewer | Guest |
|------|-------|---------|-------|--------|-------|
| 查看数据 | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| 创建数据 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 更新数据 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 删除数据 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 确认操作 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 用户管理 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 系统设置 | ✅ | ❌ | ❌ | ❌ | ❌ |

#### 权限检查

```typescript
import { RBAC } from './utils/rbac';

// 检查单个权限
if (RBAC.hasPermission(user.role, Permission.PRODUCT_DELETE)) {
  // 允许删除
}

// 检查多个权限（全部满足）
if (RBAC.hasAllPermissions(user.role, [
  Permission.PRODUCT_CREATE,
  Permission.PRODUCT_UPDATE
])) {
  // 拥有所有权限
}

// 检查多个权限（任意满足）
if (RBAC.hasAnyPermission(user.role, [
  Permission.PURCHASE_CREATE,
  Permission.SALES_CREATE
])) {
  // 拥有任一权限
}

// 角色层级检查
if (RBAC.isRoleHigherOrEqual(currentUser.role, targetUser.role)) {
  // 可以管理目标用户
}
```

### 3. 事件系统

#### 事件类型

```typescript
// 用户事件
EventType.USER_CREATED
EventType.USER_UPDATED
EventType.USER_DELETED
EventType.USER_LOGIN
EventType.USER_LOGOUT

// 采购事件
EventType.PURCHASE_ORDER_CREATED
EventType.PURCHASE_ORDER_CONFIRMED
EventType.PURCHASE_ORDER_CANCELLED
EventType.PURCHASE_ORDER_COMPLETED
EventType.PURCHASE_INBOUND_CONFIRMED

// 销售事件
EventType.SALES_ORDER_CREATED
EventType.SALES_ORDER_CONFIRMED
EventType.SALES_OUTBOUND_CONFIRMED

// 库存事件
EventType.INVENTORY_INBOUND
EventType.INVENTORY_OUTBOUND
EventType.INVENTORY_ADJUSTED
EventType.INVENTORY_LOW_STOCK
```

#### Webhook配置

```typescript
// 创建Webhook
const webhook = await prisma.webhook.create({
  data: {
    tenantId: tenantId,
    name: '钉钉通知',
    url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
    events: 'PURCHASE_ORDER_CONFIRMED,SALES_ORDER_CONFIRMED,INVENTORY_LOW_STOCK',
    secret: 'SECxxxxxxxx',
    isActive: true,
  },
});

// Webhook签名验证
const payload = req.body;
const signature = req.headers['x-webhook-signature'];
const expectedSignature = crypto
  .createHmac('sha256', webhook.secret)
  .update(JSON.stringify(payload))
  .digest('hex');

if (signature !== `sha256=${expectedSignature}`) {
  return res.status(401).json({ success: false, message: '签名无效' });
}
```

#### 事件统计

```typescript
const stats = await eventService.getEventStats(tenantId, 30);
// {
//   totalEvents: 1250,
//   eventsByType: {
//     'purchase_order.created': 45,
//     'purchase_order.confirmed': 42,
//     'sales_order.created': 38,
//     ...
//   },
//   webhookDeliveries: 125,
//   webhookSuccessRate: 96.8
// }
```

---

## 数据库Schema优化

### Schema变更对比

| 模型 | 新增字段 | 新增索引 | 说明 |
|------|----------|----------|------|
| **Tenant** | creditLimit, balance | plan, createdAt | 信用管理 |
| **User** | mfaEnabled, mfaSecret | role, status | 双重认证 |
| **Supplier** | creditLimit, balance, metadata | status, name | 信用管理 |
| **Customer** | creditLimit, balance, salesPerson, metadata | status, salesPerson | 专属业务员 |
| **Product** | minStock, maxStock, safeStock, metadata | barcode, status | 库存预警 |
| **Warehouse** | metadata | status | 扩展字段 |
| **Account** | metadata | status | 扩展字段 |
| **PurchaseOrder** | createdBy | status | 操作追踪 |
| **SalesOrder** | createdBy | status | 操作追踪 |
| **PurchaseInbound** | createdBy | status | 操作追踪 |
| **SalesOutbound** | createdBy | status | 操作追踪 |
| **PaymentReceipt** | createdBy | status | 操作追踪 |
| **PaymentPayment** | createdBy | status | 操作追踪 |
| **InventoryItem** | - | quantity | 性能优化 |
| **WebhookLog** | - | success, createdAt | 追踪优化 |

### Schema迁移

```bash
# 1. 备份当前数据库
mysqldump -u root -p inventory_system > backup_$(date +%Y%m%d).sql

# 2. 应用新Schema
npx prisma migrate dev --name saas_enhancement

# 3. 生成Prisma Client
npx prisma generate

# 4. 重启应用
npm run dev
```

---

## API使用指南

### 标准请求流程

```typescript
// 1. 获取访问令牌
POST /api/v1/auth/login
Body: {
  "email": "user@example.com",
  "password": "password123"
}
Response: {
  "success": true,
  "code": "SUCCESS",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... },
    "tenant": { ... }
  }
}

// 2. 使用令牌访问API
GET /api/v1/products
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
}
Response: {
  "success": true,
  "code": "SUCCESS",
  "data": [...],
  "meta": {
    "pagination": { ... }
  }
}
```

### 错误码对照表

| 错误码 | 说明 | HTTP状态码 |
|--------|------|-----------|
| **通用错误** |
| E1000 | 未知错误 | 500 |
| E1001 | 服务器内部错误 | 500 |
| E1002 | 未实现的功能 | 501 |
| E1003 | 服务不可用 | 503 |
| E1004 | 请求超时 | 504 |
| **请求错误** |
| E2000 | 错误的请求 | 400 |
| E2001 | 数据验证失败 | 422 |
| E2002 | 缺少必填参数 | 400 |
| E2003 | 参数值无效 | 400 |
| E2004 | JSON格式错误 | 400 |
| E2005 | 请求体过大 | 413 |
| E2006 | 不支持的媒体类型 | 415 |
| **认证授权** |
| E3000 | 未认证 | 401 |
| E3001 | 令牌已过期 | 401 |
| E3002 | 令牌无效 | 401 |
| E3003 | 缺少令牌 | 401 |
| E3004 | 权限不足 | 403 |
| E3005 | 禁止访问 | 403 |
| E3006 | API密钥无效 | 401 |
| E3007 | API密钥已过期 | 401 |
| E3008 | 缺少API密钥 | 401 |
| **资源错误** |
| E4000 | 资源不存在 | 404 |
| E4001 | 未找到资源 | 404 |
| E4002 | 资源已存在 | 409 |
| E4003 | 资源冲突 | 409 |
| E4004 | 资源已删除 | 410 |
| **租户错误** |
| E5000 | 租户不存在 | 404 |
| E5001 | 租户未激活 | 403 |
| E5002 | 租户已停用 | 403 |
| E5003 | 租户已过期 | 403 |
| E5004 | 租户配额超出 | 403 |
| E5005 | 功能未启用 | 403 |
| **业务错误** |
| E6000 | 违反业务规则 | 400 |
| E6001 | 无效的状态转换 | 400 |
| E6002 | 库存不足 | 400 |
| E6003 | 重复记录 | 409 |
| E6004 | 操作不允许 | 403 |
| E6005 | 依赖关系存在 | 400 |
| **限流错误** |
| E7000 | 请求过于频繁 | 429 |
| E7001 | 配额已超出 | 429 |
| E7002 | 并发限制超出 | 429 |

---

## 部署步骤

### 1. 环境准备

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE inventory_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 创建Redis配置
# redis.conf: requirepass your_redis_password
```

### 2. 配置环境变量

```bash
# .env
DATABASE_URL="mysql://root:password@localhost:3306/inventory_system"
JWT_SECRET="your-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="24h"
REDIS_URL="redis://:password@localhost:6379"

# CORS配置
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# 上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES="jpg,jpeg,png,pdf,xlsx"

# 邮件配置（可选）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-password"
SMTP_FROM="noreply@yourdomain.com"

# 第三方配置（可选）
DINGTALK_WEBHOOK_URL="https://oapi.dingtalk.com/robot/send?access_token=xxx"
WECHAT_WORK_WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
```

### 3. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 4. 数据库迁移

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 5. 创建初始数据

```typescript
// scripts/seed.ts
async function seed() {
  // 创建超级管理员
  const admin = await prisma.systemUser.create({
    data: {
      email: 'admin@system.com',
      password: await bcrypt.hash('admin123', 10),
      name: '系统管理员',
      role: 'super_admin',
      status: 'active',
    },
  });

  // 创建示例租户
  const tenant = await prisma.tenant.create({
    data: {
      name: '示例公司',
      slug: 'demo',
      plan: 'pro',
      status: 'active',
    },
  });

  // 创建租户管理员
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      password: await bcrypt.hash('admin123', 10),
      name: '租户管理员',
      role: 'admin',
      status: 'active',
    },
  });

  console.log('Seed data created successfully!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

```bash
npx ts-node scripts/seed.ts
```

### 6. 启动服务

```bash
# 后端开发
npm run dev

# 后端生产
npm run build
npm start

# 前端开发
cd frontend
npm run dev

# 前端生产
npm run build
```

### 7. 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动后端
pm2 start dist/index.js --name inventory-api

# 启动前端
pm2 serve frontend/dist 80 --name inventory-web

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启
pm2 restart inventory-api

# 停止
pm2 stop all
```

---

## 最佳实践

### 1. 安全实践

```typescript
// ✅ 好的做法：使用中间件保护路由
router.post('/admin/users',
  authenticate,           // 检查令牌
  authorize(['admin']),   // 检查角色
  tenantIsolation,        // 租户隔离
  createUser
);

// ❌ 不好的做法：缺少中间件保护
router.post('/admin/users', createUser);

// ✅ 好的做法：参数验证
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const validated = schema.parse(req.body);

// ❌ 不好的做法：直接使用请求参数
const { email, password, name } = req.body;
```

### 2. 性能优化

```typescript
// ✅ 好的做法：使用Prisma include和select
const products = await prisma.product.findMany({
  where: { tenantId },
  include: { category: true },  // 只包含需要的关联
  select: {                     // 只选择需要的字段
    id: true,
    name: true,
    code: true,
    category: { name: true },
  },
});

// ❌ 不好的做法：查询所有字段和关联
const products = await prisma.product.findMany();

// ✅ 好的做法：使用分页
const { page, pageSize } = Pagination.normalizeParams(
  req.query.page,
  req.query.pageSize
);

const [items, totalCount] = await Promise.all([
  prisma.product.findMany({
    skip: Pagination.calculateSkip(page, pageSize),
    take: pageSize,
  }),
  prisma.product.count(),
]);

// ❌ 不好的做法：一次性查询所有数据
const products = await prisma.product.findMany(); // 可能返回数万条记录
```

### 3. 事件处理

```typescript
// ✅ 好的做法：使用事件系统解耦业务逻辑
async function confirmPurchaseOrder(orderId: string) {
  const order = await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: 'confirmed' },
  });

  // 发布事件，触发后续处理
  await eventService.emit(
    EventType.PURCHASE_ORDER_CONFIRMED,
    order.tenantId,
    { orderId: order.id, totalAmount: order.totalAmount }
  );

  return order;
}

// ❌ 不好的做法：在业务逻辑中直接处理所有副作用
async function confirmPurchaseOrder(orderId: string) {
  const order = await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: 'confirmed' },
  });

  // 直接处理所有副作用
  await sendNotificationToManager(order);
  await updateSupplierBalance(order);
  await recordAuditLog(order);
  await triggerWebhook(order);

  return order;
}
```

### 4. 错误处理

```typescript
// ✅ 好的做法：使用标准化的错误响应
router.post('/products', async (req, res) => {
  try {
    const product = await createProduct(req.body);
    return res.status(201).json(ApiSuccess.created(product));
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(422).json(ApiError.validation(error.errors));
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json(ApiError.notFound('物料'));
    }
    return res.status(500).json(ApiError.internal('创建物料失败'));
  }
});

// ❌ 不好的做法：不统一的错误处理
router.post('/products', async (req, res) => {
  try {
    const product = await createProduct(req.body);
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ error: error.message }); // 缺少错误码和统一格式
  }
});
```

### 5. 日志记录

```typescript
// ✅ 好的做法：结构化日志
import { eventService } from './services/event.service';

await eventService.emit(
  EventType.USER_LOGIN,
  tenantId,
  { userId: user.id, email: user.email },
  {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.headers['x-request-id'],
  }
);

// ✅ 或直接记录审计日志
await prisma.auditLog.create({
  data: {
    tenantId,
    userId: user.id,
    action: 'login',
    module: 'auth',
    resource: user.id,
    detail: JSON.stringify({ ip: req.ip }),
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  },
});

// ❌ 不好的做法：使用console.log
console.log(`User ${user.id} logged in from ${req.ip}`);
```

---

## 故障排查

### 常见问题

**Q1: 数据库连接失败**

```
Error: Can't reach database server at `localhost:3306`
```

解决方案:
1. 检查MySQL服务是否运行: `systemctl status mysql`
2. 验证连接字符串: `DATABASE_URL`
3. 检查防火墙设置

**Q2: Redis连接失败**

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

解决方案:
1. 检查Redis服务: `systemctl status redis`
2. 验证密码配置: `REDIS_URL`
3. 测试连接: `redis-cli -a password ping`

**Q3: JWT令牌无效**

```
Error: jwt malformed
```

解决方案:
1. 检查令牌格式: 应为 `Bearer <token>`
2. 验证JWT_SECRET配置
3. 检查令牌是否过期

**Q4: 权限被拒绝**

```
403 Forbidden
```

解决方案:
1. 检查用户角色: `req.user.role`
2. 验证权限配置: `src/utils/rbac.ts`
3. 确认租户状态: `req.tenant.status`

---

## 支持与反馈

如有问题或建议，请联系：

- 邮箱: support@erp2026.com
- 文档: https://docs.erp2026.com
- GitHub Issues: https://github.com/erp2026/inventory-system/issues

---

**文档版本**: v1.0.0
**最后更新**: 2026-05-22
**维护者**: ERP2026团队