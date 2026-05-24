import { Router } from 'express';
import {
  getPaymentReceipts,
  getPaymentReceiptById,
  createPaymentReceipt,
  confirmPaymentReceipt,
  deletePaymentReceipt,
} from '../controllers/payment-receipt.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFiscalPeriod } from '../middlewares/fiscal-period.middleware';

const router = Router();

/**
 * 获取收款单列�? * GET /api/v1/payment-receipts
 * Query: page, limit, status, orderId, accountId, startDate, endDate, search
 */
router.get('/', authenticate, tenantIsolation(), getPaymentReceipts);

/**
 * 获取收款单详�? * GET /api/v1/payment-receipts/:id
 */
router.get('/:id', authenticate, tenantIsolation(), getPaymentReceiptById);

/**
 * 创建收款�? * POST /api/v1/payment-receipts
 * Body: { receiptNo, orderId?, accountId?, receiptDate?, amount, remark? }
 */
router.post('/', authenticate, authorize(['admin', 'manager', 'staff']), tenantIsolation(), checkFiscalPeriod('receiptDate'), createPaymentReceipt);

/**
 * 确认收款单（草稿 �?已确认，同时更新账户余额�? * POST /api/v1/payment-receipts/:id/confirm
 */
router.post('/:id/confirm', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('receiptDate'), confirmPaymentReceipt);

/**
 * 删除收款单（仅草稿状态）
 * DELETE /api/v1/payment-receipts/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(), checkFiscalPeriod('receiptDate'), deletePaymentReceipt);

export default router;
