import { Router } from 'express';
import { authenticate, tenantIsolation } from '../middlewares/auth.middleware';
import {
  getStockTransfers,
  getStockTransferById,
  createStockTransfer,
  confirmStockTransfer,
  cancelStockTransfer,
  deleteStockTransfer,
} from '../controllers/stock-transfer.controller';

const router = Router();

/**
 * 获取调拨单列表
 * GET /api/v1/stock-transfers
 */
router.get('/', authenticate, tenantIsolation(true), getStockTransfers);

/**
 * 获取调拨单详情
 * GET /api/v1/stock-transfers/:id
 */
router.get('/:id', authenticate, tenantIsolation(true), getStockTransferById);

/**
 * 创建调拨单
 * POST /api/v1/stock-transfers
 */
router.post('/', authenticate, tenantIsolation(true), createStockTransfer);

/**
 * 确认调拨单
 * POST /api/v1/stock-transfers/:id/confirm
 */
router.post('/:id/confirm', authenticate, tenantIsolation(true), confirmStockTransfer);

/**
 * 取消调拨单
 * POST /api/v1/stock-transfers/:id/cancel
 */
router.post('/:id/cancel', authenticate, tenantIsolation(true), cancelStockTransfer);

/**
 * 删除调拨单
 * DELETE /api/v1/stock-transfers/:id
 */
router.delete('/:id', authenticate, tenantIsolation(true), deleteStockTransfer);

export default router;