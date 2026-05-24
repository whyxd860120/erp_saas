import { Router } from 'express';
import {
  getStockTakes,
  getStockTakeDetail,
  createStockTake,
  confirmStockTake,
  cancelStockTake,
  deleteStockTake,
  getWarehouseInventory,
} from '../controllers/stock-take.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFiscalPeriod } from '../middlewares/fiscal-period.middleware';

const router = Router();

/**
 * 获取盘点单列表
 * GET /api/v1/stock-take
 * Query: page, limit, status, warehouseId, takeNo, startDate, endDate
 */
router.get('/', authenticate, tenantIsolation(), getStockTakes);

/**
 * 获取盘点单详情
 * GET /api/v1/stock-take/:id
 */
router.get('/:id', authenticate, tenantIsolation(), getStockTakeDetail);

/**
 * 创建盘点单
 * POST /api/v1/stock-take
 * Body: { takeNo, warehouseId, takeDate?, remark?, details: [{ productId, batchNo?, bookQty, actualQty, unitCost?, productionDate?, expiryDate?, serialNumbers? }] }
 */
router.post('/', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('takeDate'), createStockTake);

/**
 * 确认盘点单（草稿 → 已确认，同时调整库存）
 * POST /api/v1/stock-take/:id/confirm
 */
router.post('/:id/confirm', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('takeDate'), confirmStockTake);

/**
 * 取消盘点单（仅草稿状态）
 * POST /api/v1/stock-take/:id/cancel
 */
router.post('/:id/cancel', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('takeDate'), cancelStockTake);

/**
 * 删除盘点单（仅草稿或已取消状态）
 * DELETE /api/v1/stock-take/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('takeDate'), deleteStockTake);

export default router;