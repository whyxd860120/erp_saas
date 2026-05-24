import { Router } from 'express';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
} from '../controllers/role.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 角色管理路由（需要管理员权限）
router.get('/', authorize(['admin', 'super_admin']), getRoles);
router.post('/', authorize(['admin', 'super_admin']), createRole);
router.get('/:id', authorize(['admin', 'super_admin']), getRoleById);
router.put('/:id', authorize(['admin', 'super_admin']), updateRole);
router.delete('/:id', authorize(['admin', 'super_admin']), deleteRole);

// 角色权限管理
router.get('/:id/permissions', authorize(['admin', 'super_admin']), getRolePermissions);
router.put('/:id/permissions', authorize(['admin', 'super_admin']), updateRolePermissions);

export default router;
