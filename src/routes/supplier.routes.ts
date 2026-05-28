import { Router } from 'express';
import {
  getSupplierCategoryTree,
  getSupplierCategories,
  createSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
  importSupplierCategories,
  getSuppliers,
  getSupplierTree,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  batchDeleteSuppliers,
  importSuppliers,
} from '../controllers/supplier.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const router = Router();

// ==================== 供应商分类路由 ====================

/**
 * 获取供应商分类树
 * GET /api/v1/suppliers/categories/tree
 */
router.get('/categories/tree', authenticate, authorize(['admin', 'manager', 'user']), tenantIsolation(true), getSupplierCategoryTree);

/**
 * 获取供应商分类列表
 * GET /api/v1/suppliers/categories
 */
router.get('/categories', authenticate, authorize(['admin', 'manager', 'user']), tenantIsolation(true), getSupplierCategories);

/**
 * 创建供应商分类
 * POST /api/v1/suppliers/categories
 */
router.post('/categories', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), createSupplierCategory);

/**
 * 更新供应商分类
 * PUT /api/v1/suppliers/categories/:id
 */
router.put('/categories/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), updateSupplierCategory);

/**
 * 删除供应商分类
 * DELETE /api/v1/suppliers/categories/:id
 */
router.delete('/categories/:id', authenticate, authorize(['admin']), tenantIsolation(true), deleteSupplierCategory);

/**
 * 导入供应商分类
 * POST /api/v1/suppliers/categories/import
 */
router.post('/categories/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), importSupplierCategories);

// ==================== 供应商路由 ====================

/**
 * 获取供应商列表
 * GET /api/v1/suppliers
 */
router.get('/', authenticate, authorize(['admin', 'manager', 'user']), tenantIsolation(true), getSuppliers);

/**
 * 获取供应商树
 * GET /api/v1/suppliers/tree
 */
router.get('/tree', authenticate, authorize(['admin', 'manager', 'user']), tenantIsolation(true), getSupplierTree);

/**
 * 按ID获取供应商
 * GET /api/v1/suppliers/:id
 */
router.get('/:id', authenticate, authorize(['admin', 'manager', 'user']), tenantIsolation(true), getSupplierById);

/**
 * 创建供应商
 * POST /api/v1/suppliers
 */
router.post('/', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), createSupplier);

/**
 * 更新供应商
 * PUT /api/v1/suppliers/:id
 */
router.put('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), updateSupplier);

/**
 * 批量删除供应商
 * DELETE /api/v1/suppliers/batch
 */
router.delete('/batch', authenticate, authorize(['admin']), tenantIsolation(true), batchDeleteSuppliers);

/**
 * 删除供应商
 * DELETE /api/v1/suppliers/:id
 */
router.delete('/:id', authenticate, authorize(['admin']), tenantIsolation(true), deleteSupplier);

/**
 * 导入供应商
 * POST /api/v1/suppliers/import
 */
router.post('/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), importSuppliers);

export default router;