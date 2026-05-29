import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 获取收货地址列表
 * GET /api/v1/shop/addresses
 */
export const getAddresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser

    const addresses = await prisma.shopAddress.findMany({
      where: { userId: shopUser.id, status: 'active' },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    res.json({ success: true, data: addresses })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取地址列表失败' })
  }
}

/**
 * 新增收货地址
 * POST /api/v1/shop/addresses
 */
export const createAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { name, mobile, province, city, district, detail, isDefault } = req.body

    if (!name || !mobile || !province || !city || !detail) {
      res.status(400).json({ success: false, message: '请填写完整地址信息' })
      return
    }

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      await prisma.shopAddress.updateMany({
        where: { userId: shopUser.id },
        data: { isDefault: false },
      })
    }

    const address = await prisma.shopAddress.create({
      data: {
        userId: shopUser.id,
        name, mobile, province, city,
        district: district || '',
        detail,
        isDefault: isDefault || false,
      },
    })

    res.json({ success: true, data: address })
  } catch (error) {
    res.status(500).json({ success: false, message: '添加地址失败' })
  }
}

/**
 * 更新收货地址
 * PUT /api/v1/shop/addresses/:id
 */
export const updateAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { id } = req.params
    const { name, mobile, province, city, district, detail, isDefault } = req.body

    const existing = await prisma.shopAddress.findFirst({
      where: { id, userId: shopUser.id },
    })
    if (!existing) {
      res.status(404).json({ success: false, message: '地址不存在' })
      return
    }

    if (isDefault) {
      await prisma.shopAddress.updateMany({
        where: { userId: shopUser.id },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.shopAddress.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(mobile !== undefined && { mobile }),
        ...(province !== undefined && { province }),
        ...(city !== undefined && { city }),
        ...(district !== undefined && { district }),
        ...(detail !== undefined && { detail }),
        ...(isDefault !== undefined && { isDefault }),
      },
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, message: '更新地址失败' })
  }
}

/**
 * 删除收货地址
 * DELETE /api/v1/shop/addresses/:id
 */
export const deleteAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { id } = req.params

    await prisma.shopAddress.deleteMany({
      where: { id, userId: shopUser.id },
    })

    res.json({ success: true, message: '已删除' })
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败' })
  }
}

export default { getAddresses, createAddress, updateAddress, deleteAddress }
