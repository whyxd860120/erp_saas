import { Router } from 'express';
import {
  systemLogin,
  tenantLogin,
  register,
  getMe,
  changePassword,
  refreshToken,
  logout,
  searchTenantsByUsername,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 系统管理员登录
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
router.post('/login', systemLogin);

/**
 * 租户用户登录
 * POST /api/v1/auth/tenant/login
 * Body: { email, password, tenantSlug? }
 */
router.post('/tenant/login', tenantLogin);

/**
 * 用户注册（创建租户 + 管理员账号）
 * POST /api/v1/auth/register
 * Body: { name, email, password, tenantName, tenantSlug }
 */
router.post('/register', register);

/**
 * 根据用户名搜索可用的租户列表
 * GET /api/v1/auth/search-tenants
 */
router.get('/search-tenants', searchTenantsByUsername);

/**
 * 获取当前用户信息
 * GET /api/v1/auth/me
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', authenticate, getMe);

/**
 * 修改密码
 * POST /api/v1/auth/change-password
 * Headers: Authorization: Bearer <token>
 * Body: { oldPassword, newPassword }
 */
router.post('/change-password', authenticate, changePassword);

/**
 * 刷新Token
 * POST /api/v1/auth/refresh
 * Headers: Authorization: Bearer <token>
 */
router.post('/refresh', authenticate, refreshToken);

/**
 * 登出
 * POST /api/v1/auth/logout
 * Headers: Authorization: Bearer <token>
 */
router.post('/logout', authenticate, logout);

export default router;
