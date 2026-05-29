import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { RedisClientType, createClient } from 'redis';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import userRoutes from './routes/user.routes';
import supplierRoutes from './routes/supplier.routes';
import customerRoutes from './routes/customer.routes';
import productRoutes from './routes/product.routes';
import warehouseRoutes from './routes/warehouse.routes';
import accountRoutes from './routes/account.routes';
import purchaseOrderRoutes from './routes/purchase-order.routes';
import salesOrderRoutes from './routes/sales-order.routes';
import purchaseInboundRoutes from './routes/purchase-inbound.routes';
import salesOutboundRoutes from './routes/sales-outbound.routes';
import paymentReceiptRoutes from './routes/payment-receipt.routes';
import paymentPaymentRoutes from './routes/payment-payment.routes';
import inventoryRoutes from './routes/inventory.routes';
import auditLogRoutes from './routes/audit-log.routes';
import numberingRuleRoutes from './routes/numbering-rule.routes';
import tenantSettingRoutes from './routes/tenant-setting.routes';
import subscriptionRoutes from './routes/subscription.routes';
import apiKeyRoutes from './routes/api-key.routes';
import webhookRoutes from './routes/webhook.routes';
import initDataRoutes from './routes/init-data.routes';
import roleRoutes from './routes/role.routes';
import permissionRoutes from './routes/permission.routes';
import dataPermissionRoutes from './routes/data-permission.routes';
import menuRoutes from './routes/menu.routes';
import stockTakeRoutes from './routes/stock-take.routes';
import otherInboundRoutes from './routes/other-inbound.routes';
import otherOutboundRoutes from './routes/other-outbound.routes';
import stockTransferRoutes from './routes/stock-transfer.routes';
import workflowRoutes from './routes/workflow.routes';
import shopRoutes from './routes/shop/shop.routes';
import shopManageRoutes from './routes/shop/manage.routes';
import { initPermissions } from './controllers/permission.controller';
import { errorHandler } from './middlewares/error.middleware';
import { auditLogger } from './middlewares/audit.middleware';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// 初始化Prisma客户端
export const prisma = new PrismaClient();

// 初始化Redis客户端
export const redis: RedisClientType = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD || undefined,
});

redis.on('error', (err) => console.error('Redis Client Error', err));

// 中间件
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    // 开发环境允许 localhost / 127.0.0.1 任意端口
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// 审计日志中间件
app.use(auditLogger);

// 根路由 - 欢迎信息
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'ERP2026 进销存管理系统 API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      tenants: '/api/v1/tenants',
      users: '/api/v1/users',
      suppliers: '/api/v1/suppliers',
      customers: '/api/v1/customers',
      products: '/api/v1/products',
      warehouses: '/api/v1/warehouses',
      accounts: '/api/v1/accounts',
      purchaseOrders: '/api/v1/purchase-orders',
      salesOrders: '/api/v1/sales-orders',
      purchaseInbounds: '/api/v1/purchase-inbounds',
      salesOutbounds: '/api/v1/sales-outbounds',
      paymentReceipts: '/api/v1/payment-receipts',
      paymentPayments: '/api/v1/payment-payments',
      inventory: '/api/v1/inventory',
      auditLogs: '/api/v1/audit-logs',
      numberingRules: '/api/v1/numbering-rules',
      stockTakes: '/api/v1/stock-take',
      otherInbounds: '/api/v1/other-inbound',
      otherOutbounds: '/api/v1/other-outbound',
    },
  });
});

// Swagger API 文档配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ERP2026 进销存管理系统 API',
      version: '1.0.0',
      description: 'SaaS 多租户进销存管理系统 API 文档',
      contact: {
        name: 'ERP2026 Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发环境',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // 扫描路由文件中的 JSDoc 注释
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger API 文档路由
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ERP2026 API 文档',
}));

// 健康检查
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/customers', customerRoutes);
// 兼容性路由 - 支持单数形式的customer路径
app.use('/api/v1/customer', customerRoutes);
app.use('/api/v1/customer-categories', customerRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/warehouses', warehouseRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/sales-orders', salesOrderRoutes);
app.use('/api/v1/purchase-inbounds', purchaseInboundRoutes);
app.use('/api/v1/sales-outbounds', salesOutboundRoutes);
app.use('/api/v1/payment-receipts', paymentReceiptRoutes);
app.use('/api/v1/payment-payments', paymentPaymentRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/numbering-rules', numberingRuleRoutes);
app.use('/api/v1/tenant-settings', tenantSettingRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/init-data', initDataRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use('/api/v1/menus', menuRoutes);
app.use('/api/v1/data-permissions', dataPermissionRoutes);
app.use('/api/v1/stock-take', stockTakeRoutes);
app.use('/api/v1/other-inbound', otherInboundRoutes);
app.use('/api/v1/other-outbound', otherOutboundRoutes);
app.use('/api/v1/stock-transfers', stockTransferRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/shop', shopRoutes);
app.use('/api/v1/shop/manage', shopManageRoutes);

// 404处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api-docs`);

  // 连接Redis
  await redis.connect();
  console.log('✅ Redis connected');

    // 测试数据库连接
    try {
    await prisma.$connect();
    console.log('✅ Database connected');

    // 初始化权限数据（如果失败不影响启动）
    try {
      await initPermissions();
    } catch (permError) {
      console.warn('⚠️ 权限数据初始化失败:', permError);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await prisma.$disconnect();
  await redis.quit();
  console.log('Database connections closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await prisma.$disconnect();
  await redis.quit();
  console.log('Database connections closed');
  process.exit(0);
});

export default app;
