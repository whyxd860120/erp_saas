import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';
import { applyDataPermissions } from '../utils/data-permission.util';

const prisma = new PrismaClient();

/**
 * 获取销售订单列表
 * GET /api/v1/sales-orders
 */
export const getSalesOrders = async (req: Request, res: Response) => {
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
      customerId,
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

    if (customerId) {
      where.customerId = customerId;
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
      'sales_order',
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

    // 查询销售订单列表
    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: {
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
      prisma.salesOrder.count({ where }),
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
    console.error('获取销售订单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取销售订单列表失败',
    });
  }
};

/**
 * 获取销售订单详情
 * GET /api/v1/sales-orders/:id
 */
export const getSalesOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const order = await prisma.salesOrder.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        customer: {
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
        outbounds: {
          select: {
            id: true,
            outboundNo: true,
            outboundDate: true,
            status: true,
            totalAmount: true,
          },
        },
        receipts: {
          select: {
            id: true,
            receiptNo: true,
            receiptDate: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '销售订单不存在',
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('获取销售订单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取销售订单详情失败',
    });
  }
};

/**
 * 创建销售订单
 * POST /api/v1/sales-orders
 */
export const createSalesOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      orderNo,
      customerId,
      orderDate = new Date(),
      remark,
      items,
    } = req.body;

    // 验证参数
    if (!orderNo || !customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '订单编号、客户和商品明细不能为空',
      });
    }

    // 检查订单编号是否已存在（同一租户内）
    const existingOrder = await prisma.salesOrder.findFirst({
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

    // 检查客户是否存在
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: req.user.tenantId,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: '客户不存在',
      });
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

    // 创建销售订单（事务）
    const order = await prisma.$transaction(async (tx) => {
      // 创建订单主表
      const newOrder = await tx.salesOrder.create({
        data: {
          tenantId: req.user!.tenantId!,
          orderNo,
          customerId,
          orderDate: new Date(orderDate),
          totalAmount,
          status: 'draft',
          remark,
        },
      });

      // 创建订单明细
      for (const item of items) {
        await tx.salesOrderItem.create({
          data: {
            tenantId: req.user!.tenantId!,
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            shippedQty: 0,
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
      module: 'sales_order',
      resource: order.id,
      detail: JSON.stringify({ orderNo, customerId, totalAmount }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的订单信息
    const createdOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
      include: {
        customer: {
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
      message: '销售订单创建成功',
    });
  } catch (error) {
    console.error('创建销售订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建销售订单失败',
    });
  }
};

/**
 * 更新销售订单（仅草稿状态）
 * PUT /api/v1/sales-orders/:id
 */
export const updateSalesOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      orderNo,
      customerId,
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
    const existingOrder = await prisma.salesOrder.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: '销售订单不存在',
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
      const orderNoExists = await prisma.salesOrder.findFirst({
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

    // 如果修改客户，检查是否存在
    if (customerId && customerId !== existingOrder.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          tenantId: req.user.tenantId,
        },
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: '客户不存在',
        });
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (orderNo !== undefined) updateData.orderNo = orderNo;
    if (customerId !== undefined) updateData.customerId = customerId;
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
        await tx.salesOrder.update({
          where: { id },
          data: updateData,
        });

        // 删除旧明细
        await tx.salesOrderItem.deleteMany({
          where: { orderId: id },
        });

        // 创建新明细
        for (const item of items) {
          await tx.salesOrderItem.create({
            data: {
              tenantId: req.user!.tenantId!,
              orderId: id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              shippedQty: 0,
              status: 'pending',
            },
          });
        }
      });
    } else {
      // 只更新主表
      await prisma.salesOrder.update({
        where: { id },
        data: updateData,
      });
    }

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'sales_order',
      resource: id,
      detail: JSON.stringify({ ...updateData }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回更新后的订单信息
    const updatedOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: {
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
      message: '销售订单更新成功',
    });
  } catch (error) {
    console.error('更新销售订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新销售订单失败',
    });
  }
};

/**
 * 确认销售订单（草稿 → 已确认）
 * POST /api/v1/sales-orders/:id/confirm
 */
export const confirmSalesOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查订单是否存在
    const existingOrder = await prisma.salesOrder.findFirst({
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
        message: '销售订单不存在',
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
    const updatedOrder = await prisma.salesOrder.update({
      where: { id },
      data: { status: 'confirmed' },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'sales_order',
      resource: id,
      detail: JSON.stringify({ action: 'confirm', status: 'confirmed' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedOrder,
      message: '销售订单确认成功',
    });
  } catch (error) {
    console.error('确认销售订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '确认销售订单失败',
    });
  }
};

/**
 * 删除销售订单（仅草稿状态）
 * DELETE /api/v1/sales-orders/:id
 */
export const deleteSalesOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查订单是否存在
    const existingOrder = await prisma.salesOrder.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: '销售订单不存在',
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
    await prisma.salesOrder.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'sales_order',
      resource: id,
      detail: JSON.stringify({ orderNo: existingOrder.orderNo, customerId: existingOrder.customerId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '销售订单删除成功',
    });
  } catch (error) {
    console.error('删除销售订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除销售订单失败',
    });
  }
};

export default {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  deleteSalesOrder,
};
