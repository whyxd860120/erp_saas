import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 获取仓库列表
 * GET /api/v1/warehouses
 */
export const getWarehouses = async (req: Request, res: Response) => {
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
      status,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    // 只有在明确传递了status参数时才添加状态过滤
    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { code: { contains: search as string } },
        { name: { contains: search as string } },
        { address: { contains: search as string } },
        { manager: { contains: search as string } },
      ];
    }

    // 查询仓库列表
    const [warehouses, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.warehouse.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: warehouses,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取仓库列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取仓库列表失败',
    });
  }
};

/**
 * 获取仓库详情
 * GET /api/v1/warehouses/:id
 */
export const getWarehouseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: '仓库不存在',
      });
    }

    return res.json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    console.error('获取仓库详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取仓库详情失败',
    });
  }
};

/**
 * 创建仓库
 * POST /api/v1/warehouses
 */
export const createWarehouse = async (req: Request, res: Response) => {
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
      address,
      manager,
      remark,
    } = req.body;

    // 验证参数
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: '仓库编码和名称不能为空',
      });
    }

    // 检查编码是否已存在（同一租户内）
    const existingWarehouse = await prisma.warehouse.findFirst({
      where: {
        tenantId: req.user.tenantId,
        code,
      },
    });

    if (existingWarehouse) {
      return res.status(400).json({
        success: false,
        message: '仓库编码已存在',
      });
    }

    // 创建仓库
    const warehouse = await prisma.warehouse.create({
      data: {
        tenantId: req.user.tenantId,
        code,
        name,
        address,
        manager,
        remark,
        status: 'active',
      },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'warehouse',
      resource: warehouse.id,
      detail: JSON.stringify({ code, name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      success: true,
      data: warehouse,
      message: '仓库创建成功',
    });
  } catch (error) {
    console.error('创建仓库错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建仓库失败',
    });
  }
};

/**
 * 更新仓库
 * PUT /api/v1/warehouses/:id
 */
export const updateWarehouse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      address,
      manager,
      status,
      remark,
    } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查仓库是否存在
    const existingWarehouse = await prisma.warehouse.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingWarehouse) {
      return res.status(404).json({
        success: false,
        message: '仓库不存在',
      });
    }

    // 如果修改编码，检查新编码是否已存在
    if (code && code !== existingWarehouse.code) {
      const codeExists = await prisma.warehouse.findFirst({
        where: {
          tenantId: req.user.tenantId,
          code,
          id: { not: id },
        },
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: '仓库编码已存在',
        });
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (manager !== undefined) updateData.manager = manager;
    if (status !== undefined) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark;

    // 更新仓库
    const updatedWarehouse = await prisma.warehouse.update({
      where: { id },
      data: updateData,
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'warehouse',
      resource: id,
      detail: JSON.stringify({ ...updateData }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedWarehouse,
      message: '仓库更新成功',
    });
  } catch (error) {
    console.error('更新仓库错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新仓库失败',
    });
  }
};

/**
 * 删除仓库
 * DELETE /api/v1/warehouses/:id
 */
export const deleteWarehouse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查仓库是否存在
    const existingWarehouse = await prisma.warehouse.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingWarehouse) {
      return res.status(404).json({
        success: false,
        message: '仓库不存在',
      });
    }

    // 检查是否有关联的库存
    const inventoryItems = await prisma.inventoryItem.findFirst({
      where: { warehouseId: id },
    });

    if (inventoryItems) {
      return res.status(400).json({
        success: false,
        message: '该仓库有库存数据，无法删除',
      });
    }

    // 检查是否有关联的入库单
    const inbounds = await prisma.purchaseInbound.findFirst({
      where: { warehouseId: id },
    });

    if (inbounds) {
      return res.status(400).json({
        success: false,
        message: '该仓库有关联的入库单，无法删除',
      });
    }

    // 检查是否有关联的出库单
    const outbounds = await prisma.salesOutbound.findFirst({
      where: { warehouseId: id },
    });

    if (outbounds) {
      return res.status(400).json({
        success: false,
        message: '该仓库有关联的出库单，无法删除',
      });
    }

    // 检查是否有关联的其他入库单
    const otherInbounds = await prisma.otherInbound.findFirst({
      where: { warehouseId: id },
    });

    if (otherInbounds) {
      return res.status(400).json({
        success: false,
        message: '该仓库有关联的其他入库单，无法删除',
      });
    }

    // 检查是否有关联的其他出库单
    const otherOutbounds = await prisma.otherOutbound.findFirst({
      where: { warehouseId: id },
    });

    if (otherOutbounds) {
      return res.status(400).json({
        success: false,
        message: '该仓库有关联的其他出库单，无法删除',
      });
    }

    // 检查是否有关联的库存调整单
    const stockAdjustments = await prisma.stockAdjustment.findFirst({
      where: { warehouseId: id },
    });

    if (stockAdjustments) {
      return res.status(400).json({
        success: false,
        message: '该仓库有关联的库存调整单，无法删除',
      });
    }

    // 检查是否有关联的盘点单
    const stockTakes = await prisma.stockTake.findFirst({
      where: { warehouseId: id },
    });

    if (stockTakes) {
      return res.status(400).json({
        success: false,
        message: '该仓库有关联的盘点单，无法删除',
      });
    }

    // 删除仓库
    await prisma.warehouse.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'warehouse',
      resource: id,
      detail: JSON.stringify({ code: existingWarehouse.code, name: existingWarehouse.name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '仓库删除成功',
    });
  } catch (error) {
    console.error('删除仓库错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除仓库失败',
    });
  }
};

/**
 * 导入仓库
 * POST /api/v1/warehouses/import
 */
export const importWarehouses = async (req: Request, res: Response) => {
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
      if (!item.name) rowErrors.push('仓库名称不能为空');
      if (!item.code) rowErrors.push('仓库编码不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      // 检查编码是否已存在
      const existingByCode = await prisma.warehouse.findFirst({
        where: { tenantId, code: item.code }
      });

      if (existingByCode) {
        errors.push({ row, message: `仓库编码 ${item.code} 已存在` });
        continue;
      }

      // 检查名称是否已存在
      const existingByName = await prisma.warehouse.findFirst({
        where: { tenantId, name: item.name }
      });

      if (existingByName) {
        errors.push({ row, message: `仓库名称 ${item.name} 已存在` });
        continue;
      }

      // 创建仓库
      const warehouse = await prisma.warehouse.create({
        data: {
          tenantId,
          code: item.code,
          name: item.name,
          address: item.address,
          manager: item.manager,
          remark: item.remark,
          status: 'active'
        }
      });

      successItems.push(warehouse);

      // 记录审计日志
      await auditLog(req, {
        action: 'create',
        module: 'warehouse',
        resource: warehouse.id,
        details: `导入仓库: ${warehouse.name}`
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
    console.error('导入仓库失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

export default {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  importWarehouses,
};
