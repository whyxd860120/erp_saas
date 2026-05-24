import { Router } from 'express';
import {
  getPermissions,
  getMyPermissions,
  getMyMenu,
} from '../controllers/permission.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 获取权限树 - 公开接口，无需认证
router.get('/', getPermissions);

// 所有其他路由需要认证
router.use(authenticate);

// 获取当前用户权限
router.get('/me', getMyPermissions);

// 获取当前用户菜单
router.get('/menu', getMyMenu);

export default router;
