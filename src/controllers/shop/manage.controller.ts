import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 管理端：获取商城商品列表（包含未上架的）
 * GET /api/v1/shop/manage/products
 */
export const getManageProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const keyword = req.query.keyword as string
    const status = req.query.status as string

    const where: any = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { productCode: { contains: keyword } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.shopProduct.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.shopProduct.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        items: items.map(i => ({
          ...i,
          price: Number(i.price || i.shopPrice || 0),
          createdAt: i.createdAt?.toISOString(),
          updatedAt: i.updatedAt?.toISOString(),
        })),
        total,
        page,
        pageSize,
      },
    })
  } catch (error) {
    console.error('获取商城商品失败:', error)
    res.status(500).json({ success: false, message: '获取商品列表失败' })
  }
}

/**
 * 管理端：上架商品
 * POST /api/v1/shop/manage/products
 */
export const publishProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId
    const { productId, name, price, category, imageUrl, description, sortOrder, status } = req.body

    if (!name) {
      res.status(400).json({ success: false, message: '商品名称不能为空' })
      return
    }

    const shopProduct = await prisma.shopProduct.create({
      data: {
        tenantId,
        productId: productId || '',
        productCode: '',
        name,
        shopPrice: price || 0,
        price: price || 0,
        category: category || '',
        imageUrl: imageUrl || '',
        description: description || '',
        sortOrder: sortOrder || 0,
        status: status || 'active',
      },
    })

    res.json({ success: true, data: shopProduct })
  } catch (error) {
    console.error('上架商品失败:', error)
    res.status(500).json({ success: false, message: '上架失败' })
  }
}

/**
 * 管理端：更新商城商品
 * PUT /api/v1/shop/manage/products/:id
 */
export const updateManageProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, price, category, imageUrl, description, sortOrder, status } = req.body

    const updated = await prisma.shopProduct.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { shopPrice: price, price }),
        ...(category !== undefined && { category }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(description !== undefined && { description }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(status !== undefined && { status }),
      },
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('更新商品失败:', error)
    res.status(500).json({ success: false, message: '更新失败' })
  }
}

/**
 * 管理端：下架商品
 * DELETE /api/v1/shop/manage/products/:id
 */
export const unpublishProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    await prisma.shopProduct.update({
      where: { id },
      data: { status: 'inactive' },
    })
    res.json({ success: true, message: '已下架' })
  } catch (error) {
    res.status(500).json({ success: false, message: '下架失败' })
  }
}

/**
 * 管理端：获取所有商城订单
 * GET /api/v1/shop/manage/orders
 */
export const getManageOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as string
    const keyword = req.query.keyword as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    const where: any = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status
    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword } },
        { receiverName: { contains: keyword } },
        { receiverMobile: { contains: keyword } },
      ]
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59')
    }

    const [items, total] = await Promise.all([
      prisma.shopOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true, mobile: true } },
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

    res.json({
      success: true,
      data: {
        items: items.map(o => ({
          id: o.id,
          orderNo: o.orderNo,
          userId: o.userId,
          userName: o.user?.nickname || '',
          totalAmount: Number(o.totalAmount),
          finalAmount: Number(o.finalAmount),
          status: o.status,
          receiverName: (o.addressSnapshot as any)?.name || '',
          receiverMobile: (o.addressSnapshot as any)?.mobile || '',
          receiverAddress: `${(o.addressSnapshot as any)?.province || ''}${(o.addressSnapshot as any)?.city || ''}${(o.addressSnapshot as any)?.district || ''}${(o.addressSnapshot as any)?.detail || ''}`,
          expressCompany: o.expressCompany,
          expressNo: o.expressNo,
          remark: o.buyerRemark,
          user: o.user,
          items: o.items.map(i => ({
            id: i.id,
            productId: i.productId,
            name: (i.productSnapshot as any)?.name || '',
            imageUrl: (i.productSnapshot as any)?.imageUrl || '',
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            amount: Number(i.amount),
          })),
          createdAt: o.createdAt?.toISOString(),
          paidAt: o.payTime?.toISOString(),
        })),
        total,
        page,
        pageSize,
      },
    })
  } catch (error) {
    console.error('获取订单列表失败:', error)
    res.status(500).json({ success: false, message: '获取订单列表失败' })
  }
}

/**
 * 管理端：获取订单详情
 * GET /api/v1/shop/manage/orders/:id
 */
export const getManageOrderDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const order = await prisma.shopOrder.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true, mobile: true } },
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
        ...order,
        totalAmount: Number(order.totalAmount),
        freightAmount: Number(order.freightAmount),
        finalAmount: Number(order.finalAmount),
        receiverName: (order.addressSnapshot as any)?.name || '',
        receiverMobile: (order.addressSnapshot as any)?.mobile || '',
        receiverAddress: `${(order.addressSnapshot as any)?.province || ''}${(order.addressSnapshot as any)?.city || ''}${(order.addressSnapshot as any)?.district || ''}${(order.addressSnapshot as any)?.detail || ''}`,
        user: order.user,
        items: order.items.map(i => ({
          id: i.id,
          productId: i.productId,
          name: (i.productSnapshot as any)?.name || '',
          imageUrl: (i.productSnapshot as any)?.imageUrl || '',
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          amount: Number(i.amount),
        })),
        createdAt: order.createdAt?.toISOString(),
        paidAt: order.payTime?.toISOString(),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取订单详情失败' })
  }
}

/**
 * 管理端：更新订单（发货/取消/修改状态）
 * PUT /api/v1/shop/manage/orders/:id
 */
export const updateManageOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { status, expressCompany, expressNo } = req.body

    const data: any = {}
    if (status) data.status = status
    if (status === 'shipped') {
      data.shipTime = new Date()
      if (expressCompany) data.expressCompany = expressCompany
      if (expressNo) data.expressNo = expressNo
    }
    if (status === 'completed') data.finishTime = new Date()
    if (status === 'cancelled') data.cancelReason = '管理员取消'

    await prisma.shopOrder.update({ where: { id }, data })

    res.json({ success: true, message: '更新成功' })
  } catch (error) {
    console.error('更新订单失败:', error)
    res.status(500).json({ success: false, message: '更新失败' })
  }
}

/**
 * 管理端：获取商城用户列表
 * GET /api/v1/shop/manage/users
 */
export const getManageUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const keyword = req.query.keyword as string
    const status = req.query.status as string

    const where: any = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status
    if (keyword) {
      where.OR = [
        { nickname: { contains: keyword } },
        { mobile: { contains: keyword } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.shopUser.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, openid: true, nickname: true, avatarUrl: true,
          mobile: true, status: true, lastLoginAt: true, createdAt: true,
        },
      }),
      prisma.shopUser.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        items: items.map(u => ({
          ...u,
          lastLoginAt: u.lastLoginAt?.toISOString(),
          createdAt: u.createdAt?.toISOString(),
        })),
        total,
        page,
        pageSize,
      },
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.status(500).json({ success: false, message: '获取用户列表失败' })
  }
}

/**
 * 管理端：更新用户状态
 * PUT /api/v1/shop/manage/users/:id/status
 */
export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { status } = req.body
    await prisma.shopUser.update({ where: { id }, data: { status } })
    res.json({ success: true, message: '更新成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败' })
  }
}

export default {
  getManageProducts,
  publishProduct,
  updateManageProduct,
  unpublishProduct,
  getManageOrders,
  getManageOrderDetail,
  updateManageOrder,
  getManageUsers,
  updateUserStatus,
}
