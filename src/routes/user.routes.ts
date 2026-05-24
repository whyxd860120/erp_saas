import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getUserRoles,
  updateUserRoles,
} from '../controllers/user.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 获取用户列表（租户内）
 * GET /api/v1/users
 * Query: page, limit, role, status, search
 */
router.get('/', authenticate, tenantIsolation(true), getUsers);

/**
 * 获取用户详情
 * GET /api/v1/users/:id
 */
router.get('/:id', authenticate, tenantIsolation(true), getUserById);

/**
 * 创建用户（管理员）
 * POST /api/v1/users
 * Body: { email, password, name, phone?, role? }
 */
router.post('/', authenticate, authorize(['admin', 'super_admin']), tenantIsolation(true), createUser);

/**
 * 更新用户信息
 * PUT /api/v1/users/:id
 * Body: { name?, phone?, role?, status? }
 */
router.put('/:id', authenticate, tenantIsolation(true), updateUser);

/**
 * 删除用户（管理员）
 * DELETE /api/v1/users/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'super_admin']), tenantIsolation(true), deleteUser);

/**
 * 重置用户密码（管理员）
 * POST /api/v1/users/:id/reset-password
 * Body: { newPassword }
 */
router.post('/:id/reset-password', authenticate, authorize(['admin', 'super_admin']), tenantIsolation(true), resetPassword);

/**
 * 获取用户角色
 * GET /api/v1/users/:id/roles
 */
router.get('/:id/roles', authenticate, authorize(['admin', 'super_admin']), tenantIsolation(true), getUserRoles);

/**
 * 更新用户角色
 * PUT /api/v1/users/:id/roles
 * Body: { roleIds: string[] }
 */
router.put('/:id/roles', authenticate, authorize(['admin', 'super_admin']), tenantIsolation(true), updateUserRoles);

export default router;
