import { Router } from 'express';
import {
  getSalesOutbounds,
  getSalesOutboundById,
  createSalesOutbound,
  confirmSalesOutbound,
  deleteSalesOutbound,
} from '../controllers/sales-outbound.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFiscalPeriod } from '../middlewares/fiscal-period.middleware';

const router = Router();

/**
 * 获取销售出库单列表
 * GET /api/v1/sales-outbounds
 * Query: page, limit, status, orderId, warehouseId, startDate, endDate, search
 */
router.get('/', authenticate, tenantIsolation(), getSalesOutbounds);

/**
 * 获取销售出库单详情
 * GET /api/v1/sales-outbounds/:id
 */
router.get('/:id', authenticate, tenantIsolation(), getSalesOutboundById);

/**
 * 创建销售出库单
 * POST /api/v1/sales-outbounds
 * Body: { outboundNo, orderId?, warehouseId, outboundDate?, remark?, details: [{ productId, quantity, unitPrice, batchNo? }] }
 */
router.post('/', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('outboundDate'), createSalesOutbound);

/**
 * 确认销售出库单（草�?�?已确认，同时更新库存�? * POST /api/v1/sales-outbounds/:id/confirm
 */
router.post('/:id/confirm', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('outboundDate'), confirmSalesOutbound);

/**
 * 删除销售出库单（仅草稿状态）
 * DELETE /api/v1/sales-outbounds/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('outboundDate'), deleteSalesOutbound);

export default router;
