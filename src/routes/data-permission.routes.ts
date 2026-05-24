import { Router } from 'express';
import * as dataPermissionController from '../controllers/data-permission.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取角色的数据权限规则
router.get('/:roleId', dataPermissionController.getDataPermissionRules);

// 创建数据权限规则
router.post('/', dataPermissionController.createDataPermissionRule);

// 更新数据权限规则
router.put('/:id', dataPermissionController.updateDataPermissionRule);

// 删除数据权限规则
router.delete('/:id', dataPermissionController.deleteDataPermissionRule);

// 批量设置角色的数据权限规则
router.post('/batch/:roleId', dataPermissionController.batchSetDataPermissionRules);

export default router;