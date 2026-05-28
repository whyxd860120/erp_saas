import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog, getAuditLogs } from '../utils/audit.util';
import { applyDataPermissions } from '../utils/data-permission.util';

const prisma = new PrismaClient();

/**
 * 格式化日期用于编码规则
 */
function formatDateForRule(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('YY', String(year).slice(-2))
    .replace('MM', month)
    .replace('DD', day);
}

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
          salesman: {
            select: {
              id: true,
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
        salesman: {
          select: {
            id: true,
            name: true,
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

    // 获取操作记录
    const auditLogs = await getAuditLogs({
      tenantId: req.user.tenantId,
      module: 'sales_order',
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
    console.error('获取销售订单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取销售订单详情失败',
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
      salesmanId,
      orderDate = new Date(),
      remark,
      logisticsCost = 0,
      items,
    } = req.body;

    console.log('创建销售订单 - 请求数据:', {
      orderNo,
      customerId,
      salesmanId,
      orderDate,
      logisticsCost,
      itemsCount: items?.length
    });

    // 验证参数
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '客户和商品明细不能为空',
      });
    }

    // 如果没有传入订单编号，自动生成
    let generatedOrderNo = orderNo;
    if (!generatedOrderNo) {
      try {
        // 查找编码规则
        const rule = await prisma.numberingRule.findFirst({
          where: {
            tenantId: req.user.tenantId,
            businessType: 'sales_order',
            status: 'active',
          },
        });

        if (rule) {
          // 生成编号
          const now = new Date();
          const dateStr = formatDateForRule(now, rule.dateFormat);
          const sequenceStr = String(rule.currentNumber + 1).padStart(rule.sequenceLength, '0');
          generatedOrderNo = `${rule.prefix}${rule.separator}${dateStr}${rule.separator}${sequenceStr}`;

          // 更新序号
          await prisma.numberingRule.update({
            where: { id: rule.id },
            data: { currentNumber: rule.currentNumber + 1 },
          });
        } else {
          // 如果没有编码规则，生成默认编号
          generatedOrderNo = `SO-${Date.now()}`;
        }
      } catch (numError) {
        console.error('生成编号失败:', numError);
        generatedOrderNo = `SO-${Date.now()}`;
      }
    }

    // 检查订单编号是否已存在（同一租户内）
    const existingOrder = await prisma.salesOrder.findFirst({
      where: {
        tenantId: req.user.tenantId,
        orderNo: generatedOrderNo,
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

    // 计算总金额（包含物流费用）
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.amount, 0) + (logisticsCost || 0);

    // 创建销售订单（事务）
    const order = await prisma.$transaction(async (tx) => {
      // 创建订单主表
      const newOrder = await tx.salesOrder.create({
        data: {
          tenantId: req.user!.tenantId!,
          orderNo: generatedOrderNo,
          customerId,
          salesmanId,
          orderDate: new Date(orderDate),
          totalAmount,
          logisticsCost,
          status: 'draft',
          remark,
        },
      });

      // 创建订单明细
      for (const item of items) {
        await tx.salesOrderItem.create({
          data: {
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
      salesmanId,
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
    if (salesmanId !== undefined) updateData.salesmanId = salesmanId;
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
 * 反确认销售订单（已确认 → 草稿）
 * POST /api/v1/sales-orders/:id/unconfirm
 */
export const unconfirmSalesOrder = async (req: Request, res: Response) => {
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
        outbounds: true,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: '销售订单不存在',
      });
    }

    // 只有已确认状态可以反确认
    if (existingOrder.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: '只有已确认状态可以反确认',
      });
    }

    // 检查是否有关联的出库单
    if (existingOrder.outbounds.length > 0) {
      return res.status(400).json({
        success: false,
        message: '已有关联出库单，无法反确认',
      });
    }

    // 更新状态为草稿
    const updatedOrder = await prisma.salesOrder.update({
      where: { id },
      data: { status: 'draft' },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'sales_order',
      resource: id,
      detail: JSON.stringify({ action: 'unconfirm', status: 'draft' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedOrder,
      message: '销售订单反确认成功',
    });
  } catch (error) {
    console.error('反确认销售订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '反确认销售订单失败',
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

/**
 * 批量删除销售订单（仅草稿状态）
 * DELETE /api/v1/sales-orders/batch
 */
export const batchDeleteSalesOrders = async (req: Request, res: Response) => {
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
        message: '请选择要删除的销售订单',
      });
    }

    const errors: Array<{ id: string; message: string }> = [];
    const successIds: string[] = [];

    for (const id of ids) {
      try {
        const existingOrder = await prisma.salesOrder.findFirst({
          where: {
            id,
            tenantId: req.user.tenantId,
          },
        });

        if (!existingOrder) {
          errors.push({ id, message: '销售订单不存在' });
          continue;
        }

        if (existingOrder.status !== 'draft') {
          errors.push({ id, message: '只有草稿状态可以删除' });
          continue;
        }

        await prisma.salesOrder.delete({
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
      module: 'sales_order',
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
    console.error('批量删除销售订单错误:', error);
    return res.status(500).json({
      success: false,
      message: '批量删除销售订单失败',
    });
  }
};

/**
 * 导入销售订单
 * POST /api/v1/sales-orders/import
 */
export const importSalesOrders = async (req: Request, res: Response) => {
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

      if (item.customerError) rowErrors.push(item.customerError);
      if (item.productError) rowErrors.push(item.productError);

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      if (!item.customerId) rowErrors.push('客户不能为空');
      if (!item.productId) rowErrors.push('物料不能为空');
      if (!item.quantity) rowErrors.push('数量不能为空');
      if (!item.orderNo) rowErrors.push('订单单号不能为空');
      if (!item.orderDate) rowErrors.push('订单日期不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      const orderNo = item.orderNo || `SO${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const orderDate = item.orderDate ? new Date(item.orderDate) : new Date();

      const order = await prisma.salesOrder.create({
        data: {
          tenantId,
          orderNo,
          customerId: item.customerId,
          orderDate,
          remark: item.remark || '',
          status: 'draft',
          totalAmount: (item.quantity || 0) * (item.unitPrice || 0),
          logisticsCost: item.logisticsCost || 0,
          salesmanId: item.salesmanId,
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
      module: 'sales_order',
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
    console.error('导入销售订单失败:', error);
    res.status(500).json({
      success: false,
      message: '导入销售订单失败',
      error: error instanceof Error ? error.message : '未知错误'
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
  batchDeleteSalesOrders,
  importSalesOrders,
};