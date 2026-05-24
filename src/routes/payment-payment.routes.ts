import { Router } from 'express';
import {
  getPaymentPayments,
  getPaymentPaymentById,
  createPaymentPayment,
  confirmPaymentPayment,
  deletePaymentPayment,
} from '../controllers/payment-payment.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFiscalPeriod } from '../middlewares/fiscal-period.middleware';

const router = Router();

/**
 * 获取付款单列�? * GET /api/v1/payment-payments
 * Query: page, limit, status, orderId, accountId, startDate, endDate, search
 */
router.get('/', authenticate, tenantIsolation(), getPaymentPayments);

/**
 * 获取付款单详�? * GET /api/v1/payment-payments/:id
 */
router.get('/:id', authenticate, tenantIsolation(), getPaymentPaymentById);

/**
 * 创建付款�? * POST /api/v1/payment-payments
 * Body: { paymentNo, orderId?, accountId?, paymentDate?, amount, remark? }
 */
router.post('/', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('paymentDate'), createPaymentPayment);

/**
 * 确认付款单（草稿 �?已确认，同时更新账户余额�? * POST /api/v1/payment-payments/:id/confirm
 */
router.post('/:id/confirm', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('paymentDate'), confirmPaymentPayment);

/**
 * 删除付款单（仅草稿状态）
 * DELETE /api/v1/payment-payments/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('paymentDate'), deletePaymentPayment);

export default router;
