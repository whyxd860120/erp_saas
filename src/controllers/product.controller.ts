import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 获取商品分类列表
 * GET /api/v1/products/categories
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const categories = await prisma.productCategory.findMany({
      where: {
        tenantId: req.user.tenantId,
      },
      orderBy: [
        { parentId: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // 构建带计数的树形结构
    const categoryTree = await buildCategoryTreeWithCounts(categories, req.user.tenantId);

    return res.json({
      success: true,
      data: categoryTree,
    });
  } catch (error) {
    console.error('获取商品分类错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取商品分类失败',
    });
  }
};

/**
 * 创建商品分类
 * POST /api/v1/products/categories
 */
export const createCategory = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { name, parentId, sortOrder = 0 } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分类名称不能为空',
      });
    }

    // 如果指定了父分类，检查是否存在
    if (parentId) {
      const parentCategory = await prisma.productCategory.findFirst({
        where: {
          id: parentId,
          tenantId: req.user.tenantId,
        },
      });

      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: '父分类不存在',
        });
      }
    }

    // 创建分类
    const category = await prisma.productCategory.create({
      data: {
        tenantId: req.user.tenantId,
        name,
        parentId,
        sortOrder,
        status: 'active',
      },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'product_category',
      resource: category.id,
      detail: JSON.stringify({ name, parentId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      success: true,
      data: category,
      message: '商品分类创建成功',
    });
  } catch (error) {
    console.error('创建商品分类错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建商品分类失败',
    });
  }
};

/**
 * 更新商品分类
 * PUT /api/v1/products/categories/:id
 */
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parentId, sortOrder, status } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const existing = await prisma.productCategory.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: '分类不存在',
      });
    }

    if (parentId === id) {
      return res.status(400).json({
        success: false,
        message: '不能将分类设置为自己的子分类',
      });
    }

    if (parentId) {
      const parent = await prisma.productCategory.findFirst({
        where: { id: parentId, tenantId: req.user.tenantId },
      });
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: '父分类不存在',
        });
      }
    }

    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(status !== undefined && { status }),
      },
    });

    return res.json({
      success: true,
      data: category,
      message: '分类更新成功',
    });
  } catch (error) {
    console.error('更新商品分类错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新商品分类失败',
    });
  }
};

/**
 * 删除商品分类
 * DELETE /api/v1/products/categories/:id
 */
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const existing = await prisma.productCategory.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: '分类不存在',
      });
    }

    const [childCount, productCount] = await Promise.all([
      prisma.productCategory.count({ where: { parentId: id, tenantId: req.user.tenantId } }),
      prisma.product.count({ where: { categoryId: id, tenantId: req.user.tenantId } }),
    ]);

    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: '请先删除或移动子分类',
      });
    }

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: '该分类下还有商品，无法删除',
      });
    }

    await prisma.productCategory.delete({ where: { id } });

    return res.json({
      success: true,
      message: '分类删除成功',
    });
  } catch (error) {
    console.error('删除商品分类错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除商品分类失败',
    });
  }
};

/**
 * 获取商品列表
 * GET /api/v1/products
 */
export const getProducts = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      page = '1',
      limit = '10',
      categoryId,
      status = 'active',
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { code: { contains: search as string } },
        { name: { contains: search as string } },
        { spec: { contains: search as string } },
        { barcode: { contains: search as string } },
      ];
    }

    // 查询商品列表
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: products,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取商品列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取商品列表失败',
    });
  }
};

/**
 * 获取商品详情
 * GET /api/v1/products/:id
 */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        inventoryItems: {
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在',
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('获取商品详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取商品详情失败',
    });
  }
};

/**
 * 创建商品
 * POST /api/v1/products
 */
export const createProduct = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      code,
      name,
      spec,
      unit = '个',
      categoryId,
      costPrice = 0,
      salePrice = 0,
      barcode,
      imageUrl,
      remark,
      enableBatch = false,
      enableExpiry = false,
      enableSN = false,
    } = req.body;

    // 验证参数
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: '商品编码和名称不能为空',
      });
    }

    // 检查编码是否已存在（同一租户内）
    const existingProduct = await prisma.product.findFirst({
      where: {
        tenantId: req.user.tenantId,
        code,
      },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: '商品编码已存在',
      });
    }

    // 如果指定了分类，检查是否存在
    if (categoryId) {
      const category = await prisma.productCategory.findFirst({
        where: {
          id: categoryId,
          tenantId: req.user.tenantId,
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: '商品分类不存在',
        });
      }
    }

    // 创建商品
    const product = await prisma.product.create({
      data: {
        tenantId: req.user.tenantId,
        code,
        name,
        spec,
        unit,
        categoryId,
        costPrice,
        salePrice,
        barcode,
        imageUrl,
        remark,
        enableBatch,
        enableExpiry,
        enableSN,
        status: 'active',
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'product',
      resource: product.id,
      detail: JSON.stringify({ code, name, categoryId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      success: true,
      data: product,
      message: '商品创建成功',
    });
  } catch (error) {
    console.error('创建商品错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建商品失败',
    });
  }
};

/**
 * 更新商品
 * PUT /api/v1/products/:id
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      spec,
      unit,
      categoryId,
      costPrice,
      salePrice,
      barcode,
      imageUrl,
      status,
      remark,
      enableBatch,
      enableExpiry,
      enableSN,
    } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查商品是否存在
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: '商品不存在',
      });
    }

    // 如果修改编码，检查新编码是否已存在
    if (code && code !== existingProduct.code) {
      const codeExists = await prisma.product.findFirst({
        where: {
          tenantId: req.user.tenantId,
          code,
          id: { not: id },
        },
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: '商品编码已存在',
        });
      }
    }

    // 如果指定了分类，检查是否存在
    if (categoryId) {
      const category = await prisma.productCategory.findFirst({
        where: {
          id: categoryId,
          tenantId: req.user.tenantId,
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: '商品分类不存在',
        });
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (spec !== undefined) updateData.spec = spec;
    if (unit !== undefined) updateData.unit = unit;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (salePrice !== undefined) updateData.salePrice = salePrice;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (status !== undefined) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark;
    if (enableBatch !== undefined) updateData.enableBatch = enableBatch;
    if (enableExpiry !== undefined) updateData.enableExpiry = enableExpiry;
    if (enableSN !== undefined) updateData.enableSN = enableSN;

    // 更新商品
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'product',
      resource: id,
      detail: JSON.stringify({ ...updateData }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedProduct,
      message: '商品更新成功',
    });
  } catch (error) {
    console.error('更新商品错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新商品失败',
    });
  }
};

/**
 * 删除商品
 * DELETE /api/v1/products/:id
 */
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查商品是否存在
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: '商品不存在',
      });
    }

    // 检查是否有关联的库存
    const inventoryItems = await prisma.inventoryItem.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
        quantity: { gt: 0 },
      },
    });

    if (inventoryItems) {
      return res.status(400).json({
        success: false,
        message: '该商品有库存，无法删除',
      });
    }

    // 检查是否有关联的采购入库明细
    const purchaseInboundDetails = await prisma.purchaseInboundDetail.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (purchaseInboundDetails) {
      return res.status(400).json({
        success: false,
        message: '该商品有关联的采购入库记录，无法删除',
      });
    }

    // 检查是否有关联的销售出库明细
    const salesOutboundDetails = await prisma.salesOutboundDetail.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (salesOutboundDetails) {
      return res.status(400).json({
        success: false,
        message: '该商品有关联的销售出库记录，无法删除',
      });
    }

    // 检查是否有关联的库存调拨明细
    const stockTransferDetails = await prisma.stockTransferDetail.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (stockTransferDetails) {
      return res.status(400).json({
        success: false,
        message: '该商品有关联的库存调拨记录，无法删除',
      });
    }

    // 检查是否有关联的采购订单明细
    const purchaseOrderItems = await prisma.purchaseOrderItem.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (purchaseOrderItems) {
      return res.status(400).json({
        success: false,
        message: '该商品有关联的采购订单明细，无法删除',
      });
    }

    // 检查是否有关联的销售订单明细
    const salesOrderItems = await prisma.salesOrderItem.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (salesOrderItems) {
      return res.status(400).json({
        success: false,
        message: '该商品有关联的销售订单明细，无法删除',
      });
    }

    // 检查是否有关联的其他入库明细
    const otherInboundDetails = await prisma.otherInboundDetail.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (otherInboundDetails) {
      return res.status(400).json({
        success: false,
        message: '该商品有关联的其他入库记录，无法删除',
      });
    }

    // 检查是否有关联的其他出库明细
    const otherOutboundDetails = await prisma.otherOutboundDetail.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (otherOutboundDetails) {
      return res.status(400).json({
        success: false,
        message: '该商品有关联的其他出库记录，无法删除',
      });
    }

    // 检查是否有关联的库存调整明细
    const stockAdjustmentDetails = await prisma.stockAdjustmentDetail.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (stockAdjustmentDetails) {
      return res.status(400).json({
        success: false,
        message: '该商品有关联的库存调整记录，无法删除',
      });
    }

    // 检查是否有关联的盘点明细
    const stockTakeDetails = await prisma.stockTakeDetail.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (stockTakeDetails) {
      return res.status(400).json({
        success: false,
        message: '该商品有关联的盘点记录，无法删除',
      });
    }

    // 检查是否有关联的客户价格
    const customerPrices = await prisma.customerPrice.findFirst({
      where: {
        productId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (customerPrices) {
      return res.status(400).json({
        success: false,
        message: '该商品有关联的客户价格，无法删除',
      });
    }

    // 删除商品
    await prisma.product.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'product',
      resource: id,
      detail: JSON.stringify({ code: existingProduct.code, name: existingProduct.name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '商品删除成功',
    });
  } catch (error) {
    console.error('删除商品错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除商品失败',
    });
  }
};

/**
 * 批量删除商品
 * DELETE /api/v1/products/batch
 */
export const batchDeleteProducts = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要删除的商品',
      });
    }

    const errors: Array<{ id: string; message: string }> = [];
    const successIds: string[] = [];

    for (const id of ids) {
      try {
        const existingProduct = await prisma.product.findFirst({
          where: {
            id,
            tenantId: req.user.tenantId,
          },
        });

        if (!existingProduct) {
          errors.push({ id, message: '商品不存在' });
          continue;
        }

        // 检查是否有库存
        const inventoryItems = await prisma.inventoryItem.findFirst({
          where: {
            productId: id,
            tenantId: req.user.tenantId,
            quantity: { gt: 0 },
          },
        });

        if (inventoryItems) {
          errors.push({ id, message: `商品"${existingProduct.code}"有库存，无法删除` });
          continue;
        }

        await prisma.product.delete({
          where: { id },
        });

        successIds.push(id);
      } catch (error) {
        console.error('删除商品失败:', error);
        errors.push({ id, message: '删除失败，请稍后重试' });
      }
    }

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'batch_delete',
      module: 'product',
      resource: null,
      detail: JSON.stringify({
        total: ids.length,
        success: successIds.length,
        failed: errors.length
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: `批量删除完成：成功 ${successIds.length} 条，失败 ${errors.length} 条`,
      data: {
        successIds,
        errors
      }
    });
  } catch (error) {
    console.error('批量删除商品错误:', error);
    return res.status(500).json({
      success: false,
      message: '批量删除商品失败',
    });
  }
};

/**
 * 构建带计数的分类树
 */
async function buildCategoryTreeWithCounts(categories: any[], tenantId: string): Promise<any[]> {
  const categoryMap = new Map();
  const roots: any[] = [];

  // 第一次遍历：将所有分类放入Map
  categories.forEach((category) => {
    category.children = [];
    categoryMap.set(category.id, category);
  });

  // 获取每个分类的物料数量
  const categoryIds = categories.map(c => c.id);
  const productCounts = await prisma.product.groupBy({
    by: ['categoryId'],
    where: {
      tenantId,
      categoryId: { in: categoryIds }
    },
    _count: {
      id: true
    }
  });

  // 创建物料数量映射
  const countMap = new Map(productCounts.map(pc => [pc.categoryId, pc._count.id]));

  // 为每个分类添加物料计数
  categories.forEach((category) => {
    category.productCount = countMap.get(category.id) || 0;
  });

  // 递归计算子分类数量和总物料数量
  function calculateCounts(node: any): void {
    if (node.children && node.children.length > 0) {
      node.children.forEach(calculateCounts);
      // 父分类的物料数量 = 自身的物料数量 + 所有子分类的物料数量
      const childrenProductCount = node.children.reduce((sum: number, child: any) => sum + (child.productCount || 0), 0);
      node.productCount = (countMap.get(node.id) || 0) + childrenProductCount;
    }
  }

  // 第二次遍历：构建树形结构
  categories.forEach((category) => {
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.children.push(category);
      } else {
        roots.push(category);
      }
    } else {
      roots.push(category);
    }
  });

  // 计算所有根节点的计数
  roots.forEach(calculateCounts);

  return roots;
}

/**
 * 导入商品分类
 * POST /api/v1/products/categories/import
 */
export const importCategories = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const items = req.body as any[];
    const errors: Array<{ row: number; message: string }> = [];
    const successItems: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      // 验证必填字段
      if (!item.name) rowErrors.push('分类名称不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      // 检查编码是否已存在
      const existing = await prisma.productCategory.findFirst({
        where: { tenantId, code: item.code }
      });

      if (existing) {
        errors.push({ row, message: `分类编码 ${item.code} 已存在` });
        continue;
      }

      // 创建分类
      const category = await prisma.productCategory.create({
        data: {
          tenantId,
          code: item.code,
          name: item.name,
          parentId: item.parentId,
          sortOrder: item.sortOrder || 0,
          remark: item.remark
        }
      });

      successItems.push(category);

      // 记录审计日志
      await auditLog({
        tenantId: req.user.tenantId,
        userId: req.user.id,
        action: 'create',
        module: 'product_category',
        resource: category.id,
        detail: `导入商品分类: ${category.name}`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    res.json({
      success: true,
      data: {
        successCount: successItems.length,
        failCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('导入商品分类失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

/**
 * 导入物料
 * POST /api/v1/products/import
 */
export const importProducts = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const items = req.body as any[];
    const errors: Array<{ row: number; message: string }> = [];
    const successItems: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      // 验证必填字段
      if (!item.name) rowErrors.push('物料名称不能为空');
      if (!item.code) rowErrors.push('物料编码不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      // 检查编码是否已存在
      const existingByCode = await prisma.product.findFirst({
        where: { tenantId, code: item.code }
      });

      if (existingByCode) {
        errors.push({ row, message: `物料编码 ${item.code} 已存在` });
        continue;
      }

      // 检查名称+规格是否已存在
      const spec = item.spec || '';
      const existingByCombo = await prisma.product.findFirst({
        where: {
          tenantId,
          name: item.name,
          spec: spec
        }
      });

      if (existingByCombo) {
        errors.push({ row, message: `物料名称 "${item.name}" + 规格 "${spec}" 已存在` });
        continue;
      }

      // 处理分类
      let categoryId = null;
      if (item.categoryId) {
        const category = await prisma.productCategory.findFirst({
          where: { id: item.categoryId, tenantId }
        });
        if (!category) {
          errors.push({ row, message: `物料分类不存在，请先创建分类` });
          continue;
        }
        categoryId = item.categoryId;
      }

      // 创建物料
      const product = await prisma.product.create({
        data: {
          tenantId,
          code: item.code,
          name: item.name,
          spec: item.spec,
          unit: item.unit,
          costPrice: item.costPrice || 0,
          salePrice: item.salePrice || 0,
          categoryId,
          remark: item.remark,
          status: 'active'
        }
      });

      successItems.push(product);

      // 记录审计日志
      await auditLog({
        tenantId: req.user.tenantId,
        userId: req.user.id,
        action: 'create',
        module: 'product',
        resource: product.id,
        detail: `导入物料: ${product.name}`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    res.json({
      success: true,
      data: {
        successCount: successItems.length,
        failCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('导入物料失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

export default {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  importCategories,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  batchDeleteProducts,
  importProducts,
};