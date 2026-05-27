import { Router } from 'express';
import {
  calculateInboundCost,
  calculateOutboundCost,
  calculateAbnormalCost,
  fixAbnormalCost,
} from '../controllers/cost-calculation.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 入库成本核算
 * POST /api/v1/cost-calculation/inbound
 * Body: { startDate?, endDate?, warehouseId? }
 */
router.post('/inbound', authenticate, tenantIsolation(), calculateInboundCost);

/**
 * 存货出库核算（加权平均法）
 * POST /api/v1/cost-calculation/outbound
 * Body: { startDate?, endDate?, warehouseId?, productId? }
 */
router.post('/outbound', authenticate, tenantIsolation(), calculateOutboundCost);

/**
 * 异常成本核算
 * POST /api/v1/cost-calculation/abnormal
 * Body: { warehouseId?, productId? }
 */
router.post('/abnormal', authenticate, tenantIsolation(), calculateAbnormalCost);

/**
 * 修复异常成本
 * POST /api/v1/cost-calculation/fix-abnormal
 * Body: { items: [{ inventoryItemId, newCostPrice }] }
 */
router.post('/fix-abnormal', authenticate, authorize(['admin', 'manager']), tenantIsolation(), fixAbnormalCost);

export default router;
