import { Router } from 'express';
import {
  getInitInventory,
  addInitInventory,
  updateInitInventory,
  deleteInitInventory,
  importInventory,
  getInitReceivable,
  addInitReceivable,
  deleteInitReceivable,
  importReceivable,
  getInitPayable,
  addInitPayable,
  deleteInitPayable,
  importPayable,
  getInitAccountBalance,
  addInitAccountBalance,
  deleteInitAccountBalance,
  importAccountBalance,
  resetInitData,
  completeInit,
  revertInit
} from '../controllers/init-data.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

// 初始化数据路由需要在账套初始化完成前访问，所以使用 tenantIsolation(true) 跳过初始化检查

const router = Router();

// 初始库存
router.get('/inventory', authenticate, tenantIsolation(true), getInitInventory);
router.post('/inventory', authenticate, tenantIsolation(true), addInitInventory);
router.put('/inventory', authenticate, tenantIsolation(true), updateInitInventory);
router.post('/inventory/import', authenticate, tenantIsolation(true), importInventory);
router.delete('/inventory/:id', authenticate, tenantIsolation(true), deleteInitInventory);

// 应收款
router.get('/receivable', authenticate, tenantIsolation(true), getInitReceivable);
router.post('/receivable', authenticate, tenantIsolation(true), addInitReceivable);
router.post('/receivable/import', authenticate, tenantIsolation(true), importReceivable);
router.delete('/receivable/:id', authenticate, tenantIsolation(true), deleteInitReceivable);

// 应付款
router.get('/payable', authenticate, tenantIsolation(true), getInitPayable);
router.post('/payable', authenticate, tenantIsolation(true), addInitPayable);
router.post('/payable/import', authenticate, tenantIsolation(true), importPayable);
router.delete('/payable/:id', authenticate, tenantIsolation(true), deleteInitPayable);

// 账户余额
router.get('/account-balance', authenticate, tenantIsolation(true), getInitAccountBalance);
router.post('/account-balance', authenticate, tenantIsolation(true), addInitAccountBalance);
router.post('/account-balance/import', authenticate, tenantIsolation(true), importAccountBalance);
router.delete('/account-balance/:id', authenticate, tenantIsolation(true), deleteInitAccountBalance);

// 初始化控制
router.post('/reset', authenticate, tenantIsolation(true), resetInitData);
router.post('/complete', authenticate, tenantIsolation(true), completeInit);
router.post('/revert', authenticate, tenantIsolation(true), revertInit);

export default router;
