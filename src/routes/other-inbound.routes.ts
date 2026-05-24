import { Router } from 'express';
import {
  getOtherInbounds,
  getOtherInboundDetail,
  createOtherInbound,
  confirmOtherInbound,
  cancelOtherInbound,
  deleteOtherInbound,
} from '../controllers/other-inbound.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFiscalPeriod } from '../middlewares/fiscal-period.middleware';

const router = Router();

/**
 * 获取其他入库单列表
 * GET /api/v1/other-inbound
 * Query: page, limit, status, warehouseId, inboundType, inboundNo, startDate, endDate
 */
router.get('/', authenticate, tenantIsolation(), getOtherInbounds);

/**
 * 获取其他入库单详情
 * GET /api/v1/other-inbound/:id
 */
router.get('/:id', authenticate, tenantIsolation(), getOtherInboundDetail);

/**
 * 创建其他入库单
 * POST /api/v1/other-inbound
 * Body: { inboundNo, warehouseId, inboundType, inboundDate?, remark?, details: [{ productId, quantity, unitPrice, batchNo?, productionDate?, expiryDate?, serialNumbers? }] }
 */
router.post('/', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('inboundDate'), createOtherInbound);

/**
 * 确认其他入库单（草稿 → 已确认，同时增加库存）
 * POST /api/v1/other-inbound/:id/confirm
 */
router.post('/:id/confirm', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('inboundDate'), confirmOtherInbound);

/**
 * 取消其他入库单（仅草稿状态）
 * POST /api/v1/other-inbound/:id/cancel
 */
router.post('/:id/cancel', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('inboundDate'), cancelOtherInbound);

/**
 * 删除其他入库单（仅草稿或已取消状态）
 * DELETE /api/v1/other-inbound/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('inboundDate'), deleteOtherInbound);

export default router;