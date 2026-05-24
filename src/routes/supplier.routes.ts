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
  importSuppliers,
} from '../controllers/supplier.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const router = Router();

// ==================== ??????? ====================

/**
 * ????????
 * GET /api/v1/suppliers/categories/tree
 */
router.get('/categories/tree', authenticate, authorize(['admin', 'manager', 'user']), tenantIsolation(true), getSupplierCategoryTree);

/**
 * ?????????
 * GET /api/v1/suppliers/categories
 */
router.get('/categories', authenticate, authorize(['admin', 'manager', 'user']), tenantIsolation(true), getSupplierCategories);

/**
 * ???????
 * POST /api/v1/suppliers/categories
 */
router.post('/categories', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), createSupplierCategory);

/**
 * ???????
 * PUT /api/v1/suppliers/categories/:id
 */
router.put('/categories/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), updateSupplierCategory);

/**
 * ???????
 * DELETE /api/v1/suppliers/categories/:id
 */
router.delete('/categories/:id', authenticate, authorize(['admin']), tenantIsolation(true), deleteSupplierCategory);

/**
 * ???????
 * POST /api/v1/suppliers/categories/import
 */
router.post('/categories/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), importSupplierCategories);

// ==================== ????? ====================

/**
 * ???????
 * GET /api/v1/suppliers
 */
router.get('/', authenticate, authorize(['admin', 'manager', 'user']), tenantIsolation(true), getSuppliers);

/**
 * ??????
 * GET /api/v1/suppliers/tree
 */
router.get('/tree', authenticate, authorize(['admin', 'manager', 'user']), tenantIsolation(true), getSupplierTree);

/**
 * ??ID?????
 * GET /api/v1/suppliers/:id
 */
router.get('/:id', authenticate, authorize(['admin', 'manager', 'user']), tenantIsolation(true), getSupplierById);

/**
 * ?????
 * POST /api/v1/suppliers
 */
router.post('/', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), createSupplier);

/**
 * ?????
 * PUT /api/v1/suppliers/:id
 */
router.put('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), updateSupplier);

/**
 * ?????
 * DELETE /api/v1/suppliers/:id
 */
router.delete('/:id', authenticate, authorize(['admin']), tenantIsolation(true), deleteSupplier);

/**
 * ?????
 * POST /api/v1/suppliers/import
 */
router.post('/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), importSuppliers);

export default router;
