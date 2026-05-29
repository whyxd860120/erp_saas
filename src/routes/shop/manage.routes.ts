import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import manageController from '../../controllers/shop/manage.controller'

const router = Router()

// 所有管理端接口都需要 ERP 认证
router.use(authenticate as any)

// 商品管理
router.get('/products', manageController.getManageProducts)
router.post('/products', manageController.publishProduct)
router.put('/products/:id', manageController.updateManageProduct)
router.delete('/products/:id', manageController.unpublishProduct)

// 订单管理
router.get('/orders', manageController.getManageOrders)
router.get('/orders/:id', manageController.getManageOrderDetail)
router.put('/orders/:id', manageController.updateManageOrder)

// 用户管理
router.get('/users', manageController.getManageUsers)
router.put('/users/:id/status', manageController.updateUserStatus)

export default router
