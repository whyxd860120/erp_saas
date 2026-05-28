import { Router } from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  deletePurchaseOrder,
  batchDeletePurchaseOrders,
  importPurchaseOrders,
} from '../controllers/purchase-order.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFiscalPeriod } from '../middlewares/fiscal-period.middleware';

const router = Router();

/**
 * 获取采购订单列表
 * GET /api/v1/purchase-orders
 * Query: page, limit, status, supplier, startDate, endDate, search
 */
router.get('/', authenticate, tenantIsolation(), getPurchaseOrders);

/**
 * 获取采购订单详情
 * GET /api/v1/purchase-orders/:id
 */
router.get('/:id', authenticate, tenantIsolation(), getPurchaseOrderById);

/**
 * 创建采购订单
 * POST /api/v1/purchase-orders
 * Body: { orderNo, supplierId, orderDate?, remark?, items: [{ productId, quantity, unitPrice }] }
 */
router.post('/', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('orderDate'), createPurchaseOrder);

/**
 * 更新采购订单（仅草稿状态）
 * PUT /api/v1/purchase-orders/:id
 * Body: { orderNo?, supplierId?, orderDate?, remark?, items? }
 */
router.put('/:id', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('orderDate'), updatePurchaseOrder);

/**
 * 确认采购订单（草稿 → 已确认）
 * POST /api/v1/purchase-orders/:id/confirm
 */
router.post('/:id/confirm', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('orderDate'), confirmPurchaseOrder);

/**
 * 批量删除采购订单（仅草稿状态）
 * DELETE /api/v1/purchase-orders/batch
 */
router.delete('/batch', authenticate, authorize(['admin', 'manager']), tenantIsolation(), batchDeletePurchaseOrders);

/**
 * 删除采购订单（仅草稿状态）
 * DELETE /api/v1/purchase-orders/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('orderDate'), deletePurchaseOrder);

/**
 * 导入采购订单
 * POST /api/v1/purchase-orders/import
 */
router.post('/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(), importPurchaseOrders);

export default router;