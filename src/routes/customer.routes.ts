import { Router } from 'express';
import {
  getCustomerCategoryTree,
  getCustomerCategories,
  createCustomerCategory,
  updateCustomerCategory,
  deleteCustomerCategory,
  importCustomerCategories,
  getCustomers,
  getCustomerTree,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  batchDeleteCustomers,
  importCustomers,
} from '../controllers/customer.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const router = Router();

// ==================== 客户分类路由 ====================

/**
 * 获取客户分类树
 * GET /api/v1/customer-categories/tree
 */
router.get('/categories/tree', authenticate, tenantIsolation(true), getCustomerCategoryTree);

/**
 * 获取客户分类列表
 * GET /api/v1/customer-categories
 */
router.get('/categories', authenticate, tenantIsolation(true), getCustomerCategories);

/**
 * 创建客户分类
 * POST /api/v1/customer-categories
 */
router.post('/categories', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), createCustomerCategory);

/**
 * 更新客户分类
 * PUT /api/v1/customer-categories/:id
 */
router.put('/categories/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), updateCustomerCategory);

/**
 * 删除客户分类
 * DELETE /api/v1/customer-categories/:id
 */
router.delete('/categories/:id', authenticate, authorize(['admin']), tenantIsolation(true), deleteCustomerCategory);

/**
 * 导入客户分类
 * POST /api/v1/customer-categories/import
 */
router.post('/categories/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), importCustomerCategories);

// ==================== 客户路由 ====================

/**
 * 获取客户树形结构（包含客户分类和客户）
 * GET /api/v1/customers/tree
 */
router.get('/tree', authenticate, tenantIsolation(true), getCustomerTree);

/**
 * 获取客户列表
 * GET /api/v1/customers
 */
router.get('/', authenticate, tenantIsolation(true), getCustomers);

/**
 * 获取客户详情
 * GET /api/v1/customers/:id
 */
router.get('/:id', authenticate, tenantIsolation(true), getCustomerById);

/**
 * 创建客户
 * POST /api/v1/customers
 */
router.post('/', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), createCustomer);

/**
 * 更新客户
 * PUT /api/v1/customers/:id
 */
router.put('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), updateCustomer);

/**
 * 批量删除客户
 * DELETE /api/v1/customers/batch
 */
router.delete('/batch', authenticate, authorize(['admin']), tenantIsolation(true), batchDeleteCustomers);

/**
 * 删除客户
 * DELETE /api/v1/customers/:id
 */
router.delete('/:id', authenticate, authorize(['admin']), tenantIsolation(true), deleteCustomer);

/**
 * 导入客户
 * POST /api/v1/customers/import
 */
router.post('/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), importCustomers);

export default router;