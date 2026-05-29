import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog, getAuditLogs } from '../utils/audit.util';
import { applyDataPermissions } from '../utils/data-permission.util';

const prisma = new PrismaClient();

/**
 * 获取采购订单列表
 * GET /api/v1/purchase-orders
 */
export const getPurchaseOrders = async (req: Request, res: Response) => {
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
      supplierId,
      startDate,
      endDate,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate.gte = parseDateStart(startDate as string);
      }
      if (endDate) {
        where.orderDate.lte = parseDateEnd(endDate as string);
      }
    }

    if (search) {
      where.OR = [
        { orderNo: { contains: search as string } },
        { remark: { contains: search as string } },
      ];
    }

    // 应用数据权限
    const dataPermissionWhere = await applyDataPermissions(
      'purchase_order',
      {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        userRoles: req.user.roles || [],
      }
    );

    // 合并数据权限条件
    if (Object.keys(dataPermissionWhere).length > 0) {
      if (where.OR) {
        // 如果已有OR条件，需要与数据权限条件组合
        where.AND = [
          { OR: where.OR },
          dataPermissionWhere,
        ];
        delete where.OR;
      } else {
        Object.assign(where, dataPermissionWhere);
      }
    }

    // 查询采购订单列表
    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: orders,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取采购订单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取采购订单列表失败',
    });
  }
};

/**
 * 获取采购订单详情
 * GET /api/v1/purchase-orders/:id
 */
export const getPurchaseOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const order = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            contact: true,
            phone: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        updater: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
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
          },
        },
        inbounds: {
          select: {
            id: true,
            inboundNo: true,
            inboundDate: true,
            status: true,
            totalAmount: true,
          },
        },
        payments: {
          select: {
            id: true,
            paymentNo: true,
            paymentDate: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '采购订单不存在',
      });
    }

    // 获取操作记录
    const auditLogs = await getAuditLogs({
      tenantId: req.user.tenantId,
      module: 'purchase_order',
      resource: id,
      limit: 20,
    });

    // 格式化操作记录
    const formattedLogs = auditLogs.items.map((log: any) => ({
      id: log.id,
      action: log.action,
      actionText: getActionText(log.action),
      operator: log.user ? {
        id: log.user.id,
        name: log.user.name,
      } : null,
      createdAt: log.createdAt,
      detail: log.detail,
    }));

    const orderWithLogs = {
      ...order,
      logs: formattedLogs,
    };

    return res.json({
      success: true,
      data: orderWithLogs,
    });
  } catch (error) {
    console.error('获取采购订单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取采购订单详情失败',
    });
  }
};

/**
 * 获取操作文本
 */
function getActionText(action: string): string {
  const actionMap: Record<string, string> = {
    create: '创建订单',
    update: '更新订单',
    delete: '删除订单',
    confirm: '确认订单',
    unconfirm: '反确认订单',
    cancel: '取消订单',
  };
  return actionMap[action] || action;
}

/**
 * 创建采购订单
 * POST /api/v1/purchase-orders
 */
export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      orderNo,
      supplierId,
      orderDate = new Date(),
      remark,
      logisticsCost = 0,
      items,
    } = req.body;

    // 验证参数
    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '供应商和商品明细不能为空',
      });
    }

    // 如果没有提供订单编号，自动生成
    const finalOrderNo = orderNo || `PO${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // 检查订单编号是否已存在（同一租户内）
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        tenantId: req.user.tenantId,
        orderNo: finalOrderNo,
      },
    });

    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: '订单编号已存在',
      });
    }

    // 检查供应商是否存在
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: supplierId,
        tenantId: req.user.tenantId,
      },
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: '供应商不存在',
      });
    }

    // 应用数据权限检查 - 创建时检查用户是否有权为该供应商创建订单
    const hasPermission = await applyDataPermissions(
      'purchase_order',
      {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        userRoles: req.user.roles || [],
      },
      { supplierId: 'supplierId' } // 字段映射
    );

    // 如果有数据权限限制，检查是否匹配
    if (Object.keys(hasPermission).length > 0) {
      const { supplierId: allowedSupplierId } = hasPermission as any;
      if (allowedSupplierId && allowedSupplierId.in && !allowedSupplierId.in.includes(supplierId)) {
        return res.status(403).json({
          success: false,
          message: '无权为该供应商创建订单',
        });
      }
    }

    // 验证商品明细
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        return res.status(400).json({
          success: false,
          message: '商品明细必须包含商品ID、数量和单价',
        });
      }

      // 检查商品是否存在
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          tenantId: req.user.tenantId,
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `商品不存在: ${item.productId}`,
        });
      }

      // 计算金额
      item.amount = item.quantity * item.unitPrice;
    }

    // 计算总金额（包含物流费用）
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.amount, 0) + (logisticsCost || 0);

    // 创建采购订单（事务）
    const order = await prisma.$transaction(async (tx) => {
      // 创建订单主表
      const newOrder = await tx.purchaseOrder.create({
        data: {
          tenantId: req.user!.tenantId!,
          orderNo: finalOrderNo,
          supplierId,
          orderDate: new Date(orderDate),
          totalAmount,
          logisticsCost,
          status: 'draft',
          remark,
        },
      });

      // 创建订单明细
      for (const item of items) {
        await tx.purchaseOrderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            receivedQty: 0,
            status: 'pending',
          },
        });
      }

      return newOrder;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'purchase_order',
      resource: order.id,
      detail: JSON.stringify({ orderNo, supplierId, totalAmount }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的订单信息
    const createdOrder = await prisma.purchaseOrder.findUnique({
      where: { id: order.id },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        items: {
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
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: createdOrder,
      message: '采购订单创建成功',
    });
  } catch (error) {
    console.error('创建采购订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建采购订单失败',
    });
  }
};

/**
 * 更新采购订单
 * PUT /api/v1/purchase-orders/:id
 */
export const updatePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      orderNo,
      supplierId,
      orderDate,
      remark,
      logisticsCost,
      items,
    } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查订单是否存在
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: '采购订单不存在',
      });
    }

    // 只有草稿状态可以修改
    if (existingOrder.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以修改',
      });
    }

    // 如果修改订单编号，检查是否已存在
    if (orderNo && orderNo !== existingOrder.orderNo) {
      const orderNoExists = await prisma.purchaseOrder.findFirst({
        where: {
          tenantId: req.user.tenantId,
          orderNo,
          id: { not: id },
        },
      });

      if (orderNoExists) {
        return res.status(400).json({
          success: false,
          message: '订单编号已存在',
        });
      }
    }

    // 如果修改供应商，检查是否存在
    if (supplierId && supplierId !== existingOrder.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: supplierId,
          tenantId: req.user.tenantId,
        },
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: '供应商不存在',
        });
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (orderNo !== undefined) updateData.orderNo = orderNo;
    if (supplierId !== undefined) updateData.supplierId = supplierId;
    if (orderDate !== undefined) updateData.orderDate = new Date(orderDate);
    if (remark !== undefined) updateData.remark = remark;
    if (logisticsCost !== undefined) updateData.logisticsCost = logisticsCost;

    // 如果有明细，更新明细
    if (items && Array.isArray(items)) {
      // 验证商品明细
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.unitPrice) {
          return res.status(400).json({
            success: false,
            message: '商品明细必须包含商品ID、数量和单价',
          });
        }

        // 检查商品是否存在
        const product = await prisma.product.findFirst({
          where: {
            id: item.productId,
            tenantId: req.user.tenantId,
          },
        });

        if (!product) {
          return res.status(404).json({
            success: false,
            message: `商品不存在: ${item.productId}`,
          });
        }

        // 计算金额
        item.amount = item.quantity * item.unitPrice;
      }

      // 计算总金额
      const totalAmount = items.reduce((sum: number, item: any) => sum + item.amount, 0);
      updateData.totalAmount = totalAmount;

      // 更新订单和明细（事务）
      await prisma.$transaction(async (tx) => {
        // 更新订单主表
        await tx.purchaseOrder.update({
          where: { id },
          data: updateData,
        });

        // 删除旧明细
        await tx.purchaseOrderItem.deleteMany({
          where: { orderId: id },
        });

        // 创建新明细
        for (const item of items) {
          await tx.purchaseOrderItem.create({
            data: {
              orderId: id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              receivedQty: 0,
              status: 'pending',
            },
          });
        }
      });
    } else {
      // 只更新主表
      await prisma.purchaseOrder.update({
        where: { id },
        data: updateData,
      });
    }

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'purchase_order',
      resource: id,
      detail: JSON.stringify({ ...updateData }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回更新后的订单信息
    const updatedOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        items: {
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
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedOrder,
      message: '采购订单更新成功',
    });
  } catch (error) {
    console.error('更新采购订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新采购订单失败',
    });
  }
};

/**
 * 确认采购订单
 * POST /api/v1/purchase-orders/:id/confirm
 */
export const confirmPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查订单是否存在
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        items: true,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: '采购订单不存在',
      });
    }

    // 只有草稿状态可以确认
    if (existingOrder.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以确认',
      });
    }

    // 检查是否有明细
    if (existingOrder.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '订单没有明细，无法确认',
      });
    }

    // 更新状态为已确认
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'confirmed' },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'purchase_order',
      resource: id,
      detail: JSON.stringify({ action: 'confirm', status: 'confirmed' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedOrder,
      message: '采购订单确认成功',
    });
  } catch (error) {
    console.error('确认采购订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '确认采购订单失败',
    });
  }
};

/**
 * 反确认采购订单（已确认 → 草稿）
 * POST /api/v1/purchase-orders/:id/unconfirm
 */
export const unconfirmPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查订单是否存在
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        items: true,
        inbounds: true,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: '采购订单不存在',
      });
    }

    // 只有已确认状态可以反确认
    if (existingOrder.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: '只有已确认状态可以反确认',
      });
    }

    // 检查是否有关联的入库单
    if (existingOrder.inbounds.length > 0) {
      return res.status(400).json({
        success: false,
        message: '已有关联入库单，无法反确认',
      });
    }

    // 更新状态为草稿
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'draft' },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'purchase_order',
      resource: id,
      detail: JSON.stringify({ action: 'unconfirm', status: 'draft' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedOrder,
      message: '采购订单反确认成功',
    });
  } catch (error) {
    console.error('反确认采购订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '反确认采购订单失败',
    });
  }
};

/**
 * 删除采购订单
 * DELETE /api/v1/purchase-orders/:id
 */
export const deletePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查订单是否存在
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: '采购订单不存在',
      });
    }

    // 只有草稿状态可以删除
    if (existingOrder.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以删除',
      });
    }

    // 删除订单（级联删除明细）
    await prisma.purchaseOrder.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'purchase_order',
      resource: id,
      detail: JSON.stringify({ orderNo: existingOrder.orderNo, supplierId: existingOrder.supplierId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '采购订单删除成功',
    });
  } catch (error) {
    console.error('删除采购订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除采购订单失败',
    });
  }
};

/**
 * 批量删除采购订单（仅草稿状态）
 * DELETE /api/v1/purchase-orders/batch
 */
export const batchDeletePurchaseOrders = async (req: Request, res: Response) => {
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
        message: '请选择要删除的采购订单',
      });
    }

    const errors: Array<{ id: string; message: string }> = [];
    const successIds: string[] = [];

    for (const id of ids) {
      try {
        const existingOrder = await prisma.purchaseOrder.findFirst({
          where: {
            id,
            tenantId: req.user.tenantId,
          },
        });

        if (!existingOrder) {
          errors.push({ id, message: '采购订单不存在' });
          continue;
        }

        if (existingOrder.status !== 'draft') {
          errors.push({ id, message: '只有草稿状态可以删除' });
          continue;
        }

        await prisma.purchaseOrder.delete({
          where: { id },
        });

        successIds.push(id);
      } catch (error) {
        errors.push({ id, message: '删除失败' });
      }
    }

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'batch_delete',
      module: 'purchase_order',
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
    console.error('批量删除采购订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '批量删除采购订单失败',
    });
  }
};

export default {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  deletePurchaseOrder,
  batchDeletePurchaseOrders,
  importPurchaseOrders,
};

/**
 * 导入采购订单
 * POST /api/v1/purchase-orders/import
 */
export const importPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const items = req.body as any[];
    console.log('导入采购订单 - 接收到的数据:', JSON.stringify(items, null, 2));

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: '数据格式错误，期望数组格式' });
    }

    const errors: Array<{ row: number; message: string }> = [];
    const successItems: any[] = [];

    // 按订单号分组（采购订单改为按订单号分组）
    const orderGroups = new Map<string, any[]>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      console.log(`处理第${row}行数据:`, JSON.stringify(item, null, 2));

      if (item.supplierError) rowErrors.push(item.supplierError);
      if (item.productError) rowErrors.push(item.productError);

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      if (!item.supplierId) rowErrors.push('供应商不能为空');
      if (!item.productId) rowErrors.push('物料不能为空');
      if (!item.quantity) rowErrors.push('数量不能为空');
      if (!item.orderNo) rowErrors.push('订单单号不能为空');
      if (!item.orderDate) rowErrors.push('订单日期不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      const orderNo = item.orderNo || `PO${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // 按订单号分组
      if (!orderGroups.has(orderNo)) {
        orderGroups.set(orderNo, []);
      }
      orderGroups.get(orderNo)!.push(item);
    }

    // 为每个订单组创建订单
    for (const [orderNo, orderItems] of orderGroups.entries()) {
      try {
        const firstItem = orderItems[0];
        const orderDate = firstItem.orderDate ? new Date(firstItem.orderDate) : new Date();

        console.log(`创建订单 ${orderNo}, 供应商ID: ${firstItem.supplierId}, 明细数量: ${orderItems.length}`);

        // 检查订单号是否已存在
        const existingOrder = await prisma.purchaseOrder.findFirst({
          where: {
            tenantId,
            orderNo,
          },
          include: {
            items: true
          }
        });

        if (existingOrder) {
          console.log(`订单号 ${orderNo} 已存在，尝试合并明细`);
          
          try {
            // 计算新明细的金额（优先使用前端传入的金额）
            let newTotalAmount = 0;
            const newItemsData = orderItems.map(item => {
              const quantity = parseInt(item.quantity) || 0;
              const unitPrice = parseFloat(item.unitPrice) || 0;
              // 优先使用前端传入的amount，如果没有则计算
              const amount = parseFloat(item.amount) || (quantity * unitPrice);
              newTotalAmount += amount;

              return {
                productId: item.productId,
                quantity: quantity,
                unitPrice: unitPrice,
                amount: amount,
              };
            });

            // 计算现有订单的明细金额
            const existingTotalAmount = existingOrder.items.reduce((sum, item) => {
              return sum + Number(item.amount);
            }, 0);

            // 更新订单，添加新明细，并确保状态为已确认
            const updatedOrder = await prisma.purchaseOrder.update({
              where: { id: existingOrder.id },
              data: {
                totalAmount: existingTotalAmount + newTotalAmount,
                status: 'confirmed',
                items: {
                  create: newItemsData
                }
              },
              include: {
                supplier: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
                items: {
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
                  },
                },
              },
            });

            successItems.push(updatedOrder);
            console.log(`订单 ${orderNo} 明细合并成功`);
            continue;
          } catch (mergeError) {
            console.error(`合并订单 ${orderNo} 明细失败:`, mergeError);
            // 找到这个订单的所有行号
            const affectedRows = items.map((item, index) => 
              item.orderNo === orderNo ? index + 1 : -1
            ).filter(row => row > 0);
            
            affectedRows.forEach(row => {
              errors.push({ row, message: `合并订单 ${orderNo} 明细失败: ${mergeError instanceof Error ? mergeError.message : '未知错误'}` });
            });
            continue;
          }
        }

        // 计算总金额（优先使用前端传入的金额）
        let totalAmount = 0;
        const itemsData = orderItems.map(item => {
          const quantity = parseInt(item.quantity) || 0;
          const unitPrice = parseFloat(item.unitPrice) || 0;
          // 优先使用前端传入的amount，如果没有则计算
          const amount = parseFloat(item.amount) || (quantity * unitPrice);
          totalAmount += amount;

          return {
            productId: item.productId,
            quantity: quantity,
            unitPrice: unitPrice,
            amount: amount,
          };
        });

        const order = await prisma.purchaseOrder.create({
          data: {
            tenantId,
            orderNo,
            supplierId: firstItem.supplierId,
            orderDate,
            remark: firstItem.remark || '',
            status: 'confirmed',
            totalAmount: totalAmount,
            salesmanId: firstItem.salesmanId,
            items: {
              create: itemsData
            }
          },
          include: {
            supplier: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            items: {
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
              },
            },
          },
        });

        successItems.push(order);
      } catch (error) {
        console.error(`创建订单 ${orderNo} 失败:`, error);
        // 找到这个订单的所有行号
        const affectedRows = items.map((item, index) => 
          item.orderNo === orderNo ? index + 1 : -1
        ).filter(row => row > 0);
        
        affectedRows.forEach(row => {
          errors.push({ row, message: `订单 ${orderNo} 创建失败: ${error instanceof Error ? error.message : '未知错误'}` });
        });
      }
    }

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'import',
      module: 'purchase_order',
      resource: null,
      detail: JSON.stringify({
        total: items.length,
        success: successItems.length,
        failed: errors.length
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: `导入完成：成功 ${successItems.length} 条，失败 ${errors.length} 条`,
      data: {
        success: successItems,
        errors
      }
    });
  } catch (error) {
    console.error('导入采购订单失败:', error);
    res.status(500).json({
      success: false,
      message: '导入采购订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};