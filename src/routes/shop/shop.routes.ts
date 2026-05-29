import { Router } from 'express'
import { shopAuth } from '../../middlewares/shop/shop-auth.middleware'
import authController from '../../controllers/shop/auth.controller'
import productController from '../../controllers/shop/product.controller'
import cartController from '../../controllers/shop/cart.controller'
import orderController from '../../controllers/shop/order.controller'
import addressController from '../../controllers/shop/address.controller'

const router = Router()

// ===== 公开接口（无需认证） =====
// 微信登录
router.post('/auth/login', authController.wechatLogin)

// 商品列表 & 详情
router.get('/products', productController.getProducts)
router.get('/products/:id', productController.getProductDetail)

// ===== 需要商城认证的接口 =====
// 用户信息
router.get('/auth/me', shopAuth, authController.getMe)
router.put('/auth/profile', shopAuth, authController.updateProfile)

// 购物车
router.get('/cart', shopAuth, cartController.getCart)
router.post('/cart', shopAuth, cartController.addToCart)
router.put('/cart/select-all', shopAuth, cartController.selectAll)
router.put('/cart/:id', shopAuth, cartController.updateCartItem)
router.put('/cart/:id/select', shopAuth, cartController.toggleSelect)
router.delete('/cart/:id', shopAuth, cartController.deleteCartItem)

// 订单
router.get('/orders', shopAuth, orderController.getOrders)
router.get('/orders/:id', shopAuth, orderController.getOrderDetail)
router.post('/orders', shopAuth, orderController.createOrder)
router.put('/orders/:id/cancel', shopAuth, orderController.cancelOrder)
router.put('/orders/:id/receive', shopAuth, orderController.receiveOrder)

// 收货地址
router.get('/addresses', shopAuth, addressController.getAddresses)
router.post('/addresses', shopAuth, addressController.createAddress)
router.put('/addresses/:id', shopAuth, addressController.updateAddress)
router.delete('/addresses/:id', shopAuth, addressController.deleteAddress)

export default router
