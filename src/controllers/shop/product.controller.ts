import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * 获取上架商品列表（公开接口）
 * GET /api/v1/shop/products?page=1&pageSize=10&keyword=&sort=
 */
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const keyword = (req.query.keyword as string) || ''
    const sort = (req.query.sort as string) || 'default' // default, sales, price_asc, price_desc

    const where: any = {
      tenantId,
      isOnSale: true,
      product: { status: 'active' },
    }
    if (keyword) {
      where.OR = [
        { shopTitle: { contains: keyword } },
        { product: { name: { contains: keyword } } },
      ]
    }

    let orderBy: any = { sortOrder: 'asc' }
    if (sort === 'sales') orderBy = { sales: 'desc' }
    else if (sort === 'price_asc') orderBy = { shopPrice: 'asc' }
    else if (sort === 'price_desc') orderBy = { shopPrice: 'desc' }

    const [items, total] = await Promise.all([
      prisma.shopProduct.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: {
            select: { id: true, name: true, spec: true, unit: true, barcode: true, imageUrl: true, salePrice: true },
          },
        },
      }),
      prisma.shopProduct.count({ where }),
    ])

    const list = items.map((sp) => ({
      id: sp.productId,
      shopProductId: sp.id,
      name: sp.shopTitle || sp.product.name,
      spec: sp.product.spec,
      unit: sp.product.unit,
      price: Number(sp.shopPrice || sp.product.salePrice),
      originalPrice: Number(sp.product.salePrice),
      imageUrl: sp.product.imageUrl,
      images: sp.shopImages,
      sales: sp.sales,
      desc: sp.shopDesc,
    }))

    res.json({ success: true, data: { items: list, total, page, pageSize } })
  } catch (error) {
    console.error('获取商品列表失败:', error)
    res.status(500).json({ success: false, message: '获取商品列表失败' })
  }
}

/**
 * 获取商品详情（公开接口）
 * GET /api/v1/shop/products/:id
 */
export const getProductDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId
    const { id } = req.params

    const sp = await prisma.shopProduct.findFirst({
      where: { productId: id, tenantId, isOnSale: true },
      include: {
        product: {
          select: { id: true, name: true, spec: true, unit: true, barcode: true, imageUrl: true, salePrice: true, brand: true, origin: true },
        },
      },
    })

    if (!sp) {
      res.status(404).json({ success: false, message: '商品不存在或已下架' })
      return
    }

    // 查询库存
    const inventory = await prisma.inventoryItem.aggregate({
      where: { productId: id, tenantId },
      _sum: { quantity: true },
    })

    res.json({
      success: true,
      data: {
        id: sp.productId,
        shopProductId: sp.id,
        name: sp.shopTitle || sp.product.name,
        spec: sp.product.spec,
        unit: sp.product.unit,
        brand: sp.product.brand,
        origin: sp.product.origin,
        price: Number(sp.shopPrice || sp.product.salePrice),
        originalPrice: Number(sp.product.salePrice),
        imageUrl: sp.product.imageUrl,
        images: sp.shopImages || [],
        desc: sp.shopDesc || '',
        sales: sp.sales,
        stock: inventory._sum.quantity || 0,
      },
    })
  } catch (error) {
    console.error('获取商品详情失败:', error)
    res.status(500).json({ success: false, message: '获取商品详情失败' })
  }
}

export default { getProducts, getProductDetail }
