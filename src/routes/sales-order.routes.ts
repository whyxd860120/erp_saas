import { Router } from 'express';
import {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  deleteSalesOrder,
  batchDeleteSalesOrders,
  importSalesOrders,
} from '../controllers/sales-order.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFiscalPeriod } from '../middlewares/fiscal-period.middleware';

const router = Router();

/**
 * 获取销售订单列表
 * GET /api/v1/sales-orders
 * Query: page, limit, status, customer, startDate, endDate, search
 */
router.get('/', authenticate, tenantIsolation(), getSalesOrders);

/**
 * 获取销售订单详情
 * GET /api/v1/sales-orders/:id
 */
router.get('/:id', authenticate, tenantIsolation(), getSalesOrderById);

/**
 * 创建销售订单
 * POST /api/v1/sales-orders
 * Body: { orderNo, customerId, orderDate?, remark?, items: [{ productId, quantity, unitPrice }] }
 */
router.post('/', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('orderDate'), createSalesOrder);

/**
 * 更新销售订单（仅草稿状态）
 * PUT /api/v1/sales-orders/:id
 * Body: { orderNo?, customerId?, orderDate?, remark?, items? }
 */
router.put('/:id', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('orderDate'), updateSalesOrder);

/**
 * 确认销售订单（草稿 → 已确认）
 * POST /api/v1/sales-orders/:id/confirm
 */
router.post('/:id/confirm', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('orderDate'), confirmSalesOrder);

/**
 * 批量删除销售订单（仅草稿状态）
 * DELETE /api/v1/sales-orders/batch
 */
router.delete('/batch', authenticate, authorize(['admin', 'manager']), tenantIsolation(), batchDeleteSalesOrders);

/**
 * 删除销售订单（仅草稿状态）
 * DELETE /api/v1/sales-orders/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('orderDate'), deleteSalesOrder);

/**
 * 导入销售订单
 * POST /api/v1/sales-orders/import
 */
router.post('/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(), importSalesOrders);

export default router;