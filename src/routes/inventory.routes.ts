import { Router } from 'express';
import {
  getInventory,
  getInventoryById,
  getInventoryLogs,
  adjustInventory,
  getInventorySummary,
} from '../controllers/inventory.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 获取库存列表
 * GET /api/v1/inventory
 * Query: page, limit, warehouseId, categoryId, search, lowStock
 */
router.get('/', authenticate, tenantIsolation(), getInventory);

/**
 * 获取库存汇总（按商品汇总所有仓库）
 * GET /api/v1/inventory/summary
 * Query: search, categoryId
 */
router.get('/summary', authenticate, tenantIsolation(), getInventorySummary);

/**
 * 获取库存详情
 * GET /api/v1/inventory/:id
 */
router.get('/:id', authenticate, tenantIsolation(), getInventoryById);

/**
 * 获取库存变动日志
 * GET /api/v1/inventory/logs
 * Query: page, limit, productId, warehouseId, changeType, startDate, endDate
 */
router.get('/logs', authenticate, tenantIsolation(), getInventoryLogs);

/**
 * 库存盘点（调整库存数量）
 * POST /api/v1/inventory/:id/adjust
 * Body: { quantity, remark? }
 */
router.post('/:id/adjust', authenticate, authorize(['admin', 'manager']), tenantIsolation(), adjustInventory);

export default router;
