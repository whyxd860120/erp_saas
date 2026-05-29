import { Router } from 'express';
import {
  getPurchaseInbounds,
  getPurchaseInboundById,
  createPurchaseInbound,
  updatePurchaseInbound,
  confirmPurchaseInbound,
  unconfirmPurchaseInbound,
  deletePurchaseInbound,
  importPurchaseInbounds,
} from '../controllers/purchase-inbound.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFiscalPeriod } from '../middlewares/fiscal-period.middleware';

const router = Router();

/**
 * 获取采购入库单列表
 * GET /api/v1/purchase-inbounds
 * Query: page, limit, status, orderId, warehouseId, startDate, endDate, search
 */
router.get('/', authenticate, tenantIsolation(), getPurchaseInbounds);

/**
 * 获取采购入库单详情
 * GET /api/v1/purchase-inbounds/:id
 */
router.get('/:id', authenticate, tenantIsolation(), getPurchaseInboundById);

/**
 * 创建采购入库单
 * POST /api/v1/purchase-inbounds
 * Body: { inboundNo, orderId?, warehouseId, inboundDate?, remark?, details: [{ productId, quantity, unitPrice, batchNo?, productionDate?, expiryDate? }] }
 */
router.post('/', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('inboundDate'), createPurchaseInbound);

/**
 * 更新采购入库单（仅草稿状态）
 * PUT /api/v1/purchase-inbounds/:id
 * Body: { inboundNo?, orderId?, warehouseId?, inboundDate?, remark?, details? }
 */
router.put('/:id', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('inboundDate'), updatePurchaseInbound);

/**
 * 导入采购入库单
 * POST /api/v1/purchase-inbounds/import
 */
router.post('/import', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), importPurchaseInbounds);

/**
 * 确认采购入库单（草稿 → 已确认，同时更新库存）
 * POST /api/v1/purchase-inbounds/:id/confirm
 */
router.post('/:id/confirm', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('inboundDate'), confirmPurchaseInbound);

/**
 * 反确认采购入库单（已确认 → 草稿，同时扣减库存）
 * POST /api/v1/purchase-inbounds/:id/unconfirm
 */
router.post('/:id/unconfirm', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('inboundDate'), unconfirmPurchaseInbound);

/**
 * 删除采购入库单（仅草稿状态）
 * DELETE /api/v1/purchase-inbounds/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('inboundDate'), deletePurchaseInbound);

export default router;
