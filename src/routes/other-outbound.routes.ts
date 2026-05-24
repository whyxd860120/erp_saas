import { Router } from 'express';
import {
  getOtherOutbounds,
  getOtherOutboundDetail,
  createOtherOutbound,
  confirmOtherOutbound,
  cancelOtherOutbound,
  deleteOtherOutbound,
} from '../controllers/other-outbound.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFiscalPeriod } from '../middlewares/fiscal-period.middleware';

const router = Router();

/**
 * 获取其他出库单列表
 * GET /api/v1/other-outbound
 * Query: page, limit, status, warehouseId, outboundType, outboundNo, startDate, endDate
 */
router.get('/', authenticate, tenantIsolation(), getOtherOutbounds);

/**
 * 获取其他出库单详情
 * GET /api/v1/other-outbound/:id
 */
router.get('/:id', authenticate, tenantIsolation(), getOtherOutboundDetail);

/**
 * 创建其他出库单
 * POST /api/v1/other-outbound
 * Body: { outboundNo, warehouseId, outboundType, outboundDate?, remark?, details: [{ productId, quantity, unitPrice, batchNo?, productionDate?, expiryDate?, serialNumbers? }] }
 */
router.post('/', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('outboundDate'), createOtherOutbound);

/**
 * 确认其他出库单（草稿 → 已确认，同时减少库存）
 * POST /api/v1/other-outbound/:id/confirm
 */
router.post('/:id/confirm', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('outboundDate'), confirmOtherOutbound);

/**
 * 取消其他出库单（仅草稿状态）
 * POST /api/v1/other-outbound/:id/cancel
 */
router.post('/:id/cancel', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('outboundDate'), cancelOtherOutbound);

/**
 * 删除其他出库单（仅草稿或已取消状态）
 * DELETE /api/v1/other-outbound/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('outboundDate'), deleteOtherOutbound);

export default router;