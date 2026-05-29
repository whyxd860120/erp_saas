import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 创建订单（从购物车下单）
 * POST /api/v1/shop/orders
 * Body: { addressId: string, buyerRemark?: string, cartItemIds?: string[] }
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const tenantId = (req as any).tenantId
    const { addressId, buyerRemark, cartItemIds } = req.body

    // 获取收货地址
    const address = await prisma.shopAddress.findFirst({
      where: { id: addressId, userId: shopUser.id },
    })
    if (!address) {
      res.status(400).json({ success: false, message: '收货地址不存在' })
      return
    }

    // 获取选中的购物车项
    const whereCart: any = { userId: shopUser.id }
    if (cartItemIds?.length) {
      whereCart.id = { in: cartItemIds }
    } else {
      whereCart.selected = true
    }

    const cartItems = await prisma.shopCartItem.findMany({
      where: whereCart,
      include: {
        product: { select: { id: true, name: true, spec: true, unit: true, imageUrl: true, salePrice: true } },
      },
    })

    if (cartItems.length === 0) {
      res.status(400).json({ success: false, message: '请选择商品' })
      return
    }

    // 获取商城价格
    const productIds = cartItems.map(i => i.productId)
    const shopProducts = await prisma.shopProduct.findMany({
      where: { productId: { in: productIds }, tenantId },
      select: { productId: true, shopPrice: true, isOnSale: true },
    })
    const priceMap = new Map(shopProducts.map(sp => [sp.productId, sp]))

    // 检查库存和上架状态
    for (const item of cartItems) {
      const sp = priceMap.get(item.productId)
      if (!sp?.isOnSale) {
        res.status(400).json({ success: false, message: `商品"${item.product.name}"已下架` })
        return
      }
      const inv = await prisma.inventoryItem.aggregate({
        where: { productId: item.productId, tenantId },
        _sum: { quantity: true },
      })
      if ((inv._sum.quantity || 0) < item.quantity) {
        res.status(400).json({ success: false, message: `商品"${item.product.name}"库存不足` })
        return
      }
    }

    // 计算金额
    const orderItems = cartItems.map(item => {
      const sp = priceMap.get(item.productId)
      const unitPrice = Number(sp?.shopPrice || item.product.salePrice)
      const quantity = item.quantity
      const amount = Math.round(unitPrice * quantity * 100) / 100
      return {
        productId: item.productId,
        quantity,
        unitPrice,
        amount,
        productSnapshot: {
          name: item.product.name,
          spec: item.product.spec,
          imageUrl: item.product.imageUrl,
        },
      }
    })

    const totalAmount = orderItems.reduce((s, i) => s + i.amount, 0)
    const finalAmount = totalAmount // 暂无运费

    // 生成订单号
    const orderNo = `SO${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // 创建订单（事务）
    const order = await prisma.$transaction(async (tx) => {
      const shopOrder = await tx.shopOrder.create({
        data: {
          tenantId,
          orderNo,
          userId: shopUser.id,
          addressId: address.id,
          addressSnapshot: {
            name: address.name,
            mobile: address.mobile,
            province: address.province,
            city: address.city,
            district: address.district,
            detail: address.detail,
          },
          totalAmount,
          freightAmount: 0,
          finalAmount,
          buyerRemark: buyerRemark || '',
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      })

      // 清除购物车中已下单的商品
      const orderedIds = cartItems.map(i => i.id)
      await tx.shopCartItem.deleteMany({
        where: { id: { in: orderedIds } },
      })

      return shopOrder
    })

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNo: order.orderNo,
        totalAmount: Number(order.totalAmount),
        finalAmount: Number(order.finalAmount),
        status: order.status,
      },
    })
  } catch (error) {
    console.error('创建订单失败:', error)
    res.status(500).json({ success: false, message: '创建订单失败' })
  }
}

/**
 * 获取订单列表
 * GET /api/v1/shop/orders?page=1&pageSize=10&status=
 */
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const status = req.query.status as string

    const where: any = { userId: shopUser.id }
    if (status) where.status = status

    const [items, total] = await Promise.all([
      prisma.shopOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: {
            select: {
              id: true, productId: true, quantity: true, unitPrice: true, amount: true,
              productSnapshot: true,
            },
          },
        },
      }),
      prisma.shopOrder.count({ where }),
    ])

    const list = items.map(o => ({
      id: o.id,
      orderNo: o.orderNo,
      totalAmount: Number(o.totalAmount),
      finalAmount: Number(o.finalAmount),
      status: o.status,
      expressCompany: o.expressCompany,
      expressNo: o.expressNo,
      items: o.items.map(i => ({
        id: i.id,
        productId: i.productId,
        name: (i.productSnapshot as any)?.name || '',
        imageUrl: (i.productSnapshot as any)?.imageUrl || '',
        spec: (i.productSnapshot as any)?.spec || '',
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        amount: Number(i.amount),
      })),
      itemCount: o.items.length,
      createdAt: o.createdAt,
    }))

    res.json({ success: true, data: { items: list, total, page, pageSize } })
  } catch (error) {
    console.error('获取订单列表失败:', error)
    res.status(500).json({ success: false, message: '获取订单列表失败' })
  }
}

/**
 * 获取订单详情
 * GET /api/v1/shop/orders/:id
 */
export const getOrderDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { id } = req.params

    const order = await prisma.shopOrder.findFirst({
      where: { id, userId: shopUser.id },
      include: {
        items: {
          select: {
            id: true, productId: true, quantity: true, unitPrice: true, amount: true,
            productSnapshot: true,
          },
        },
      },
    })

    if (!order) {
      res.status(404).json({ success: false, message: '订单不存在' })
      return
    }

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNo: order.orderNo,
        totalAmount: Number(order.totalAmount),
        freightAmount: Number(order.freightAmount),
        finalAmount: Number(order.finalAmount),
        status: order.status,
        payMethod: order.payMethod,
        payTime: order.payTime,
        expressCompany: order.expressCompany,
        expressNo: order.expressNo,
        shipTime: order.shipTime,
        finishTime: order.finishTime,
        cancelReason: order.cancelReason,
        buyerRemark: order.buyerRemark,
        addressSnapshot: order.addressSnapshot,
        items: order.items.map(i => ({
          id: i.id,
          productId: i.productId,
          name: (i.productSnapshot as any)?.name || '',
          imageUrl: (i.productSnapshot as any)?.imageUrl || '',
          spec: (i.productSnapshot as any)?.spec || '',
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          amount: Number(i.amount),
        })),
        createdAt: order.createdAt,
      },
    })
  } catch (error) {
    console.error('获取订单详情失败:', error)
    res.status(500).json({ success: false, message: '获取订单详情失败' })
  }
}

/**
 * 取消订单
 * PUT /api/v1/shop/orders/:id/cancel
 */
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { id } = req.params
    const { reason } = req.body

    const order = await prisma.shopOrder.findFirst({
      where: { id, userId: shopUser.id },
    })
    if (!order) {
      res.status(404).json({ success: false, message: '订单不存在' })
      return
    }
    if (order.status !== 'pending') {
      res.status(400).json({ success: false, message: '当前状态不可取消' })
      return
    }

    await prisma.shopOrder.update({
      where: { id },
      data: { status: 'cancelled', cancelReason: reason || '用户取消' },
    })

    res.json({ success: true, message: '订单已取消' })
  } catch (error) {
    res.status(500).json({ success: false, message: '取消失败' })
  }
}

/**
 * 确认收货
 * PUT /api/v1/shop/orders/:id/receive
 */
export const receiveOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { id } = req.params

    const order = await prisma.shopOrder.findFirst({
      where: { id, userId: shopUser.id },
    })
    if (!order) {
      res.status(404).json({ success: false, message: '订单不存在' })
      return
    }
    if (order.status !== 'shipped') {
      res.status(400).json({ success: false, message: '当前状态不可确认收货' })
      return
    }

    await prisma.shopOrder.update({
      where: { id },
      data: { status: 'completed', finishTime: new Date() },
    })

    res.json({ success: true, message: '已确认收货' })
  } catch (error) {
    res.status(500).json({ success: false, message: '操作失败' })
  }
}

export default { createOrder, getOrders, getOrderDetail, cancelOrder, receiveOrder }
