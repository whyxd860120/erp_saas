import { Router } from 'express';
import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  getMyTenant,
  updateMyTenant,
} from '../controllers/tenant.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 获取租户列表（系统管理员）
 * GET /api/v1/tenants
 * Query: page, limit, status, search
 */
router.get('/', authenticate, authorize(['super_admin']), getTenants);

/**
 * 获取租户详情（系统管理员）
 * GET /api/v1/tenants/:id
 */
router.get('/:id', authenticate, authorize(['super_admin']), getTenantById);

/**
 * 创建租户（系统管理员）
 * POST /api/v1/tenants
 * Body: { name, slug, plan? }
 */
router.post('/', authenticate, authorize(['super_admin']), createTenant);

/**
 * 更新租户信息（系统管理员）
 * PUT /api/v1/tenants/:id
 * Body: { name?, plan?, status? }
 */
router.put('/:id', authenticate, authorize(['super_admin']), updateTenant);

/**
 * 删除租户（系统管理员）
 * DELETE /api/v1/tenants/:id
 */
router.delete('/:id', authenticate, authorize(['super_admin']), deleteTenant);

/**
 * 获取当前租户信息（租户管理员）
 * GET /api/v1/tenants/me
 */
router.get('/me', authenticate, getMyTenant);

/**
 * 更新当前租户信息（租户管理员）
 * PUT /api/v1/tenants/me
 * Body: { name? }
 */
router.put('/me', authenticate, updateMyTenant);

export default router;
