import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 获取购物车列表
 * GET /api/v1/shop/cart
 */
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser

    const items = await prisma.shopCartItem.findMany({
      where: { userId: shopUser.id },
      include: {
        product: { select: { id: true, name: true, spec: true, unit: true, imageUrl: true, salePrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 同时查 shopProduct 获取商城价格
    const productIds = items.map(i => i.productId)
    const shopProducts = productIds.length > 0
      ? await prisma.shopProduct.findMany({
          where: { productId: { in: productIds }, tenantId: (req as any).tenantId },
          select: { productId: true, shopPrice: true, isOnSale: true },
        })
      : []

    const priceMap = new Map(shopProducts.map(sp => [sp.productId, sp]))

    const list = items.map(item => {
      const sp = priceMap.get(item.productId)
      const price = Number(sp?.shopPrice || item.product.salePrice)
      return {
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        spec: item.product.spec,
        unit: item.product.unit,
        imageUrl: item.product.imageUrl,
        price,
        quantity: item.quantity,
        selected: item.selected,
        amount: price * item.quantity,
        isOnSale: sp?.isOnSale ?? true,
      }
    })

    const selectedItems = list.filter(i => i.selected && i.isOnSale)
    const totalCount = selectedItems.reduce((s, i) => s + i.quantity, 0)
    const totalAmount = selectedItems.reduce((s, i) => s + i.amount, 0)

    res.json({
      success: true,
      data: {
        items: list,
        totalCount,
        totalAmount: Math.round(totalAmount * 100) / 100,
      },
    })
  } catch (error) {
    console.error('获取购物车失败:', error)
    res.status(500).json({ success: false, message: '获取购物车失败' })
  }
}

/**
 * 加入购物车
 * POST /api/v1/shop/cart
 * Body: { productId: string, quantity: number }
 */
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { productId, quantity = 1 } = req.body

    if (!productId) {
      res.status(400).json({ success: false, message: '商品ID不能为空' })
      return
    }

    // 检查商品是否上架
    const shopProduct = await prisma.shopProduct.findFirst({
      where: { productId, tenantId: (req as any).tenantId, isOnSale: true },
    })
    if (!shopProduct) {
      res.status(400).json({ success: false, message: '商品已下架' })
      return
    }

    // 检查库存
    const inventory = await prisma.inventoryItem.aggregate({
      where: { productId, tenantId: (req as any).tenantId },
      _sum: { quantity: true },
    })
    const stock = inventory._sum.quantity || 0

    // 已有购物车项
    const existing = await prisma.shopCartItem.findUnique({
      where: { userId_productId: { userId: shopUser.id, productId } },
    })

    const totalQty = (existing?.quantity || 0) + quantity
    if (totalQty > stock) {
      res.status(400).json({ success: false, message: `库存不足，当前库存${stock}` })
      return
    }

    if (existing) {
      await prisma.shopCartItem.update({
        where: { id: existing.id },
        data: { quantity: totalQty },
      })
    } else {
      await prisma.shopCartItem.create({
        data: { userId: shopUser.id, productId, quantity },
      })
    }

    res.json({ success: true, message: '已加入购物车' })
  } catch (error) {
    console.error('加入购物车失败:', error)
    res.status(500).json({ success: false, message: '加入购物车失败' })
  }
}

/**
 * 更新购物车商品数量
 * PUT /api/v1/shop/cart/:id
 */
export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { id } = req.params
    const { quantity } = req.body

    const item = await prisma.shopCartItem.findFirst({
      where: { id, userId: shopUser.id },
    })
    if (!item) {
      res.status(404).json({ success: false, message: '购物车项不存在' })
      return
    }

    if (quantity <= 0) {
      await prisma.shopCartItem.delete({ where: { id } })
      res.json({ success: true, message: '已删除' })
      return
    }

    await prisma.shopCartItem.update({
      where: { id },
      data: { quantity },
    })

    res.json({ success: true, message: '已更新' })
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败' })
  }
}

/**
 * 切换选中状态
 * PUT /api/v1/shop/cart/:id/select
 */
export const toggleSelect = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { id } = req.params

    const item = await prisma.shopCartItem.findFirst({
      where: { id, userId: shopUser.id },
    })
    if (!item) {
      res.status(404).json({ success: false, message: '购物车项不存在' })
      return
    }

    const updated = await prisma.shopCartItem.update({
      where: { id },
      data: { selected: !item.selected },
    })

    res.json({ success: true, data: { selected: updated.selected } })
  } catch (error) {
    res.status(500).json({ success: false, message: '操作失败' })
  }
}

/**
 * 全选/取消全选
 * PUT /api/v1/shop/cart/select-all
 */
export const selectAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { selected } = req.body

    await prisma.shopCartItem.updateMany({
      where: { userId: shopUser.id },
      data: { selected: !!selected },
    })

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, message: '操作失败' })
  }
}

/**
 * 删除购物车项
 * DELETE /api/v1/shop/cart/:id
 */
export const deleteCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { id } = req.params

    await prisma.shopCartItem.deleteMany({
      where: { id, userId: shopUser.id },
    })

    res.json({ success: true, message: '已删除' })
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败' })
  }
}

export default { getCart, addToCart, updateCartItem, toggleSelect, selectAll, deleteCartItem }
