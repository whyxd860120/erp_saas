import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';
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

    return res.json({
      success: true,
      data: order,
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
      items,
    } = req.body;

    // 验证参数
    if (!orderNo || !supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '订单编号、供应商和商品明细不能为空',
      });
    }

    // 检查订单编号是否已存在（同一租户内）
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        tenantId: req.user.tenantId,
        orderNo,
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

    // 计算总金额
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.amount, 0);

    // 创建采购订单（事务）
    const order = await prisma.$transaction(async (tx) => {
      // 创建订单主表
      const newOrder = await tx.purchaseOrder.create({
        data: {
          tenantId: req.user!.tenantId!,
          orderNo,
          supplierId,
          orderDate: new Date(orderDate),
          totalAmount,
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

export default {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  deletePurchaseOrder,
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
    const errors: Array<{ row: number; message: string }> = [];
    const successItems: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      if (item.supplierError) rowErrors.push(item.supplierError);
      if (item.productError) rowErrors.push(item.productError);

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      if (!item.supplierId) rowErrors.push('供应商不能为空');
      if (!item.productId) rowErrors.push('物料不能为空');
      if (!item.quantity) rowErrors.push('数量不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      const orderNo = `PO${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const order = await prisma.purchaseOrder.create({
        data: {
          tenantId,
          orderNo,
          supplierId: item.supplierId,
          orderDate: new Date(),
          remark: item.remark || '',
          status: 'draft',
          totalAmount: (item.quantity || 0) * (item.unitPrice || 0),
          items: {
            create: {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice || 0,
              amount: (item.quantity || 0) * (item.unitPrice || 0),
            }
          }
        }
      });

      successItems.push(order);
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