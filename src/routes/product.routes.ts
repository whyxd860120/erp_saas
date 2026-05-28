import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  importCategories,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  batchDeleteProducts,
  importProducts,
  toggleProductStatus,
} from '../controllers/product.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const router = Router();

// 商品分类路由
router.get('/categories/tree', authenticate, tenantIsolation(true), getCategories);
router.get('/categories', authenticate, tenantIsolation(true), getCategories);
router.post('/categories', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), createCategory);
router.put('/categories/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), updateCategory);
router.delete('/categories/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), deleteCategory);
router.post('/categories/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), importCategories);

// 商品路由
router.get('/', authenticate, tenantIsolation(true), getProducts);
router.get('/:id', authenticate, tenantIsolation(true), getProductById);
router.post('/', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), createProduct);
router.put('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), updateProduct);
router.delete('/batch', authenticate, authorize(['admin']), tenantIsolation(true), batchDeleteProducts);
router.delete('/:id', authenticate, authorize(['admin']), tenantIsolation(true), deleteProduct);
router.post('/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), importProducts);

/**
 * 切换物料状态
 * PATCH /api/v1/products/:id/status
 */
router.patch('/:id/status', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), toggleProductStatus);

export default router;