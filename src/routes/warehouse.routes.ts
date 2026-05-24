import { Router } from 'express';
import {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  importWarehouses,
} from '../controllers/warehouse.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFeature } from '../middlewares/feature.middleware';

const router = Router();

/**
 * 获取仓库列表
 * GET /api/v1/warehouses
 * Query: page, limit, status, search
 */
router.get('/', authenticate, tenantIsolation(true), checkFeature('multiWarehouse'), getWarehouses);

/**
 * 获取仓库详情
 * GET /api/v1/warehouses/:id
 */
router.get('/:id', authenticate, tenantIsolation(true), checkFeature('multiWarehouse'), getWarehouseById);

/**
 * 创建仓库
 * POST /api/v1/warehouses
 * Body: { code, name, address?, manager?, remark? }
 */
router.post('/', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), checkFeature('multiWarehouse'), createWarehouse);

/**
 * 更新仓库
 * PUT /api/v1/warehouses/:id
 * Body: { code?, name?, address?, manager?, status?, remark? }
 */
router.put('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), checkFeature('multiWarehouse'), updateWarehouse);

/**
 * 删除仓库
 * DELETE /api/v1/warehouses/:id
 */
router.delete('/:id', authenticate, authorize(['admin']), tenantIsolation(true), checkFeature('multiWarehouse'), deleteWarehouse);

/**
 * 导入仓库
 * POST /api/v1/warehouses/import
 * Body: [{ code, name, address?, manager?, remark? }, ...]
 */
router.post('/import', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), checkFeature('multiWarehouse'), importWarehouses);

export default router;
