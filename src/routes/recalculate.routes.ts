import { Router } from 'express';
import {
  recalculateInventory,
  recalculateAccountBalance,
  recalculateOrderPayments,
} from '../controllers/recalculate.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 重算库存
 * POST /api/v1/recalculate/inventory
 * Body: { warehouseId? }  可选，指定仓库
 */
router.post(
  '/inventory',
  authenticate,
  authorize(['admin', 'manager']),
  tenantIsolation(true),
  recalculateInventory,
);

/**
 * 重算账户余额
 * POST /api/v1/recalculate/account-balance
 */
router.post(
  '/account-balance',
  authenticate,
  authorize(['admin', 'manager']),
  tenantIsolation(true),
  recalculateAccountBalance,
);

/**
 * 重算应收应付（订单已收/已付金额）
 * POST /api/v1/recalculate/order-payments
 */
router.post(
  '/order-payments',
  authenticate,
  authorize(['admin', 'manager']),
  tenantIsolation(true),
  recalculateOrderPayments,
);

export default router;
