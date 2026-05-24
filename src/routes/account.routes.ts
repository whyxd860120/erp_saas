import { Router } from 'express';
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  adjustBalance,
} from '../controllers/account.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 获取账户列表
 * GET /api/v1/accounts
 * Query: page, limit, type, status, search
 */
router.get('/', authenticate, tenantIsolation(true), getAccounts);

/**
 * 获取账户详情
 * GET /api/v1/accounts/:id
 */
router.get('/:id', authenticate, tenantIsolation(true), getAccountById);

/**
 * 创建账户
 * POST /api/v1/accounts
 * Body: { code, name, type, remark? }
 */
router.post('/', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), createAccount);

/**
 * 更新账户
 * PUT /api/v1/accounts/:id
 * Body: { code?, name?, type?, status?, remark? }
 */
router.put('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), updateAccount);

/**
 * 删除账户
 * DELETE /api/v1/accounts/:id
 */
router.delete('/:id', authenticate, authorize(['admin']), tenantIsolation(true), deleteAccount);

/**
 * 调整账户余额（管理员�? * POST /api/v1/accounts/:id/adjust-balance
 * Body: { amount, remark? }
 */
router.post('/:id/adjust-balance', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), adjustBalance);

export default router;
