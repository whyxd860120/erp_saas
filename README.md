# SaaS多租户进销存管理系统

## 项目概述

这是一个完整的SaaS多租户进销存管理系统，包含**后端API**和**前端Web界面**。

### 技术栈

**后端：**
- TypeScript + Node.js + Express
- Prisma ORM + MySQL 8.0
- Redis（缓存/会话）
- JWT认证
- 多租户架构

**前端：**
- Vue 3 + TypeScript
- Vite构建工具
- Element Plus UI组件库
- Pinia状态管理
- Vue Router路由

## 功能模块

### 1. 系统管理
- ✅ **用户认证**：登录、登出、Token管理
- ✅ **租户管理**：多租户隔离
- ✅ **用户管理**：用户CRUD、角色分配
- ✅ **审计日志**：操作记录追踪

### 2. 基础资料
- ✅ **供应商管理**：供应商信息维护
- ✅ **客户管理**：客户信息维护
- ✅ **商品管理**：商品信息、分类管理
- ✅ **仓库管理**：仓库信息维护
- ✅ **账户管理**：银行账户、余额管理

### 3. 采购管理
- ✅ **采购订单**：订单创建、确认、跟踪
- ✅ **采购入库**：基于采购订单的入库操作

### 4. 销售管理
- ✅ **销售订单**：订单创建、确认、跟踪
- ✅ **销售出库**：基于销售订单的出库操作

### 5. 财务管理
- ✅ **收款单**：客户付款记录
- ✅ **付款单**：供应商付款记录

### 6. 库存管理
- ✅ **库存查询**：实时库存查询
- ✅ **库存盘点**：库存调整记录
- ✅ **库存汇总**：多仓库库存汇总

## 项目结构

```
inventory-system/
├── src/                          # 后端源码
│   ├── index.ts                   # Prisma客户端导出
│   ├── schema.prisma              # 数据模型定义
│   ├── app.ts                     # Express主应用
│   ├── config/                    # 配置文件
│   ├── middlewares/               # 中间件
│   │   ├── auth.middleware.ts    # 认证中间件
│   │   ├── tenant.middleware.ts  # 租户中间件
│   │   └── error.middleware.ts   # 错误处理中间件
│   ├── controllers/               # 控制器
│   │   ├── auth.controller.ts
│   │   ├── tenant.controller.ts
│   │   ├── user.controller.ts
│   │   ├── supplier.controller.ts
│   │   ├── customer.controller.ts
│   │   ├── product.controller.ts
│   │   ├── warehouse.controller.ts
│   │   ├── account.controller.ts
│   │   ├── purchase-order.controller.ts
│   │   ├── sales-order.controller.ts
│   │   ├── purchase-inbound.controller.ts
│   │   ├── sales-outbound.controller.ts
│   │   ├── payment-receipt.controller.ts
│   │   ├── payment-payment.controller.ts
│   │   ├── inventory.controller.ts
│   │   └── audit-log.controller.ts
│   ├── routes/                    # 路由配置
│   └── utils/                    # 工具函数
│       └── audit.util.ts          # 审计工具
├── frontend/                     # 前端源码
│   ├── src/
│   │   ├── main.ts              # 入口文件
│   │   ├── App.vue              # 根组件
│   │   ├── router/             # 路由配置
│   │   ├── stores/             # 状态管理
│   │   ├── api/                # API服务
│   │   ├── layouts/            # 布局组件
│   │   ├── views/              # 页面组件
│   │   └── assets/             # 静态资源
│   ├── public/                  # 公共资源
│   └── package.json
├── package.json                  # 后端依赖
├── tsconfig.json                # TypeScript配置
├── .env.example                # 环境变量示例
└── README.md                   # 项目文档
```

## 快速开始

### 1. 环境准备

**必需软件：**
- Node.js >= 18
- MySQL >= 8.0
- Redis >= 6

### 2. 后端安装

```bash
# 克隆项目
cd inventory-system

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息

# 初始化数据库
npx prisma migrate dev

# 启动后端服务
npm run dev
```

后端API地址：<ADDRESS_REMOVING>http://localhost:3000</ADDRESS_REMOVING>

### 3. 前端安装

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端地址：<ADDRESS_REMOVING>http://localhost:5173</ADDRESS_REMOVING>

## 环境变量配置

编辑 `.env` 文件：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DATABASE_URL="mysql://root:password@localhost:3306/inventory_saas"

# JWT配置
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 前端地址（用于CORS）
FRONTEND_URL=http://localhost:5173
```

## API接口文档

### 认证接口

```
POST /api/v1/auth/login           # 登录
POST /api/v1/auth/logout         # 登出
GET  /api/v1/auth/me             # 获取当前用户信息
POST /api/v1/auth/change-password # 修改密码
```

### 业务接口

所有业务接口都需要认证，格式为：

```
GET    /api/v1/{resource}        # 列表查询
GET    /api/v1/{resource}/:id    # 详情查询
POST   /api/v1/{resource}        # 创建
PUT    /api/v1/{resource}/:id    # 更新
DELETE /api/v1/{resource}/:id    # 删除
POST   /api/v1/{resource}/:id/confirm # 确认单据
```

资源名称：
- `tenants` - 租户
- `users` - 用户
- `suppliers` - 供应商
- `customers` - 客户
- `products` - 商品
- `warehouses` - 仓库
- `accounts` - 账户
- `purchase-orders` - 采购订单
- `sales-orders` - 销售订单
- `purchase-inbounds` - 采购入库
- `sales-outbounds` - 销售出库
- `payment-receipts` - 收款单
- `payment-payments` - 付款单
- `inventory` - 库存
- `audit-logs` - 审计日志

## 多租户架构

系统采用**共享数据库、共享Schema**的多租户模式：

1. **数据隔离**：所有表包含 `tenantId` 字段
2. **自动过滤**：通过中间件自动注入 `tenantId`
3. **权限控制**：用户只能访问自己租户的数据

## 角色权限

系统预置5种角色：

| 角色 | 权限 |
|------|------|
| super_admin | 超级管理员，管理所有租户 |
| admin | 租户管理员，管理租户内所有功能 |
| finance | 财务人员，管理财务相关功能 |
| teacher | 教师角色（可扩展） |
| reception | 前台角色（可扩展） |

## 审计日志

系统自动记录所有重要操作：

- 用户登录/登出
- 数据的创建、更新、删除
- 单据的确认操作

日志记录内容包括：
- 操作时间、用户、IP地址
- 操作的模块和功能
- 操作前的数据快照
- 操作后的数据快照

## 开发指南

### 添加新功能模块

1. **更新数据模型** (`schema.prisma`)：
```prisma
model NewModule {
  id        String   @id @default(cuid())
  tenantId  String
  // ... 其他字段
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
}
```

2. **创建控制器** (`controllers/new-module.controller.ts`)
3. **创建路由** (`routes/new-module.routes.ts`)
4. **注册路由** (`app.ts`)
5. **创建前端页面** (`views/NewModuleListView.vue`)
6. **添加路由配置** (`router/index.ts`)

### 代码规范

- 使用 ESLint + Prettier
- 遵循 Airbnb JavaScript 风格指南
- 使用 TypeScript 类型注解
- 组件命名使用 PascalCase
- 变量命名使用 camelCase

## 部署指南

### 后端部署

```bash
# 构建
npm run build

# 生产环境启动
NODE_ENV=production npm start
```

### 前端部署

```bash
# 构建
cd frontend
npm run build

# 部署 dist/ 目录到Web服务器
```

## 常见问题

### 1. 数据库连接失败

检查 `.env` 文件中的 `DATABASE_URL` 是否正确。

### 2. JWT Token 过期

默认Token有效期7天，可在 `.env` 中修改 `JWT_EXPIRES_IN`。

### 3. 前端跨域问题

检查后端 CORS 配置，确保 `FRONTEND_URL` 正确。

## 后续开发计划

- [ ] 报表统计功能
- [ ] 数据导入导出
- [ ] 消息通知系统
- [ ] 移动端适配
- [ ] 微信小程序端
- [ ] 支付宝小程序端

## 许可证

MIT License

## 联系方式

如有疑问，请提交 Issue 或联系开发团队。
