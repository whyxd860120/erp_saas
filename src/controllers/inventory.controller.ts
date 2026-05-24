import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 获取库存列表
 * GET /api/v1/inventory
 */
export const getInventory = async (req: Request, res: Response) => {
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
      warehouseId,
      categoryId,
      search,
      lowStock, // 是否只显示低库存
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (search) {
      where.OR = [
        { product: { code: { contains: search as string } } },
        { product: { name: { contains: search as string } } },
        { product: { spec: { contains: search as string } } },
      ];
    }

    if (categoryId) {
      where.product = {
        categoryId,
      };
    }

    // 查询库存列表
    const [inventoryItems, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              spec: true,
              unit: true,
              costPrice: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: [
          { warehouseId: 'asc' },
          { productId: 'asc' },
        ],
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // 如果只显示低库存，过滤
    let filteredItems = inventoryItems;
    if (lowStock === 'true') {
      filteredItems = inventoryItems.filter(item => 
        item.product.minStock && item.quantity <= item.product.minStock
      );
    }

    return res.json({
      success: true,
      data: {
        items: filteredItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取库存列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取库存列表失败',
    });
  }
};

/**
 * 获取库存详情
 * GET /api/v1/inventory/:id
 */
export const getInventoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            spec: true,
            unit: true,
            costPrice: true,
            salePrice: true,
            minStock: true,
            maxStock: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: '库存记录不存在',
      });
    }

    return res.json({
      success: true,
      data: inventoryItem,
    });
  } catch (error) {
    console.error('获取库存详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取库存详情失败',
    });
  }
};

/**
 * 获取库存变动日志
 * GET /api/v1/inventory/logs
 */
export const getInventoryLogs = async (req: Request, res: Response) => {
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
      productId,
      warehouseId,
      changeType,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (productId) {
      where.productId = productId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (changeType) {
      where.changeType = changeType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // 查询库存变动日志
    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              spec: true,
              unit: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryLog.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: logs,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取库存变动日志错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取库存变动日志失败',
    });
  }
};

/**
 * 库存盘点（调整库存数量）
 * POST /api/v1/inventory/:id/adjust
 */
export const adjustInventory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, remark } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    if (!quantity || isNaN(parseInt(quantity))) {
      return res.status(400).json({
        success: false,
        message: '调整数量必须是有效数字',
      });
    }

    const adjustQty = parseInt(quantity);

    // 检查库存记录是否存在
    const existingInventory = await prisma.inventoryItem.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingInventory) {
      return res.status(404).json({
        success: false,
        message: '库存记录不存在',
      });
    }

    // 计算新数量
    const newQty = existingInventory.quantity + adjustQty;

    // 不允许负库存
    if (newQty < 0) {
      return res.status(400).json({
        success: false,
        message: '调整后库存不能为负数',
      });
    }

    // 调整库存（事务）
    const updatedInventory = await prisma.$transaction(async (tx) => {
      // 1. 更新库存数量
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: { quantity: newQty },
      });

      // 2. 记录库存变动日志
      await tx.inventoryLog.create({
        data: {
          tenantId: req.user!.tenantId!,
          productId: existingInventory.productId,
          warehouseId: existingInventory.warehouseId,
          batchNo: existingInventory.batchNo,
          changeType: 'adjust',
          changeQty: adjustQty,
          beforeQty: existingInventory.quantity,
          afterQty: newQty,
          remark: remark || '库存盘点调整',
        },
      });

      return updated;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'inventory',
      resource: id,
      detail: JSON.stringify({ 
        action: 'adjust',
        adjustQty,
        beforeQty: existingInventory.quantity,
        afterQty: newQty,
        remark 
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedInventory,
      message: '库存调整成功',
    });
  } catch (error) {
    console.error('库存调整错误:', error);
    return res.status(500).json({
      success: false,
      message: '库存调整失败',
    });
  }
};

/**
 * 获取库存汇总（按商品汇总所有仓库）
 * GET /api/v1/inventory/summary
 */
export const getInventorySummary = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { search, categoryId } = req.query;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (search) {
      where.OR = [
        { product: { code: { contains: search as string } } },
        { product: { name: { contains: search as string } } },
      ];
    }

    if (categoryId) {
      where.product = {
        categoryId,
      };
    }

    // 查询所有库存记录
    const inventoryItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            spec: true,
            unit: true,
            minStock: true,
            maxStock: true,
          },
        },
      },
    });

    // 按商品汇总
    const summaryMap = new Map();

    inventoryItems.forEach(item => {
      const productId = item.productId;
      
      if (!summaryMap.has(productId)) {
        summaryMap.set(productId, {
          productId,
          productCode: item.product.code,
          productName: item.product.name,
          productSpec: item.product.spec,
          unit: item.product.unit,
          minStock: item.product.minStock,
          maxStock: item.product.maxStock,
          totalQty: 0,
          totalValue: 0,
          warehouses: [],
        });
      }

      const summary = summaryMap.get(productId);
      summary.totalQty += item.quantity;
      summary.totalValue += item.quantity * item.costPrice;
      summary.warehouses.push({
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
        quantity: item.quantity,
        costPrice: item.costPrice,
      });
    });

    const summary = Array.from(summaryMap.values());

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('获取库存汇总错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取库存汇总失败',
    });
  }
};

export default {
  getInventory,
  getInventoryById,
  getInventoryLogs,
  adjustInventory,
  getInventorySummary,
};
