import { Router } from 'express';
import {
  getAllMenus,
  getMenuById,
  getAllMenusFlat,
  createMenu,
  updateMenu,
  deleteMenu,
  batchUpdateMenus,
} from '../controllers/menu.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['admin', 'super_admin']), getAllMenus);
router.get('/flat', authorize(['admin', 'super_admin']), getAllMenusFlat);
router.get('/:id', authorize(['admin', 'super_admin']), getMenuById);
router.post('/', authorize(['admin', 'super_admin']), createMenu);
router.put('/:id', authorize(['admin', 'super_admin']), updateMenu);
router.delete('/:id', authorize(['admin', 'super_admin']), deleteMenu);
router.post('/batch-update', authorize(['admin', 'super_admin']), batchUpdateMenus);

export default router;
