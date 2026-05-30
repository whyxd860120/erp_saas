import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog, getAuditLogs } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 构建 batchNo 查询条件，兼容 null 和空字符串
 * 当批次号为空时，在 where 顶层使用 OR 同时匹配 null 和空字符串
 */
function buildBatchNoWhere(baseWhere: any, batchNo?: string): any {
  if (batchNo && batchNo.trim() !== '') {
    return { ...baseWhere, batchNo };
  }
  // 同时匹配 null 和空字符串
  const { batchNo: _, ...rest } = baseWhere;
  return {
    OR: [
      { ...rest, batchNo: null },
      { ...rest, batchNo: '' },
    ],
  };
}

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
 * 获取销售出库单列表
 * GET /api/v1/sales-outbounds
 */
export const getSalesOutbounds = async (req: Request, res: Response) => {
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
      orderId,
      warehouseId,
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

    if (orderId) {
      where.orderId = orderId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (startDate || endDate) {
      where.outboundDate = {};
      if (startDate) {
        where.outboundDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.outboundDate.lte = new Date(endDate as string);
      }
    }

    if (search) {
      where.OR = [
        { outboundNo: { contains: search as string } },
        { remark: { contains: search as string } },
      ];
    }

    // 查询出库单列表
    const [outbounds, total] = await Promise.all([
      prisma.salesOutbound.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              customer: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
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
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              details: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesOutbound.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: outbounds,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取销售出库单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取销售出库单列表失败',
    });
  }
};

/**
 * 获取销售出库单详情
 * GET /api/v1/sales-outbounds/:id
 */
export const getSalesOutboundById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const outbound = await prisma.salesOutbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            customer: {
              select: {
                id: true,
                code: true,
                name: true,
                contact: true,
                phone: true,
              },
            },
          },
        },
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
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        details: {
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

    if (!outbound) {
      return res.status(404).json({
        success: false,
        message: '销售出库单不存在',
      });
    }

    // 获取操作记录
    const auditLogs = await getAuditLogs({
      tenantId: req.user.tenantId,
      module: 'sales_outbound',
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

    const outboundWithLogs = {
      ...outbound,
      logs: formattedLogs,
    };

    return res.json({
      success: true,
      data: outboundWithLogs,
    });
  } catch (error) {
    console.error('获取销售出库单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取销售出库单详情失败',
    });
  }
};

/**
 * 获取操作文本
 */
function getActionText(action: string): string {
  const actionMap: Record<string, string> = {
    create: '创建出库单',
    update: '更新出库单',
    delete: '删除出库单',
    confirm: '确认出库单',
    cancel: '取消出库单',
  };
  return actionMap[action] || action;
}

/**
 * 创建销售出库单
 * POST /api/v1/sales-outbounds
 */
export const createSalesOutbound = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      outboundNo,
      orderId,
      customerId,
      salesmanId,
      warehouseId,
      outboundDate = new Date(),
      remark,
      logisticsCost = 0,
      details,
    } = req.body;

    // 如果没有传入编号，自动生成
    let generatedOutboundNo = outboundNo;
    if (!generatedOutboundNo) {
      try {
        // 查找编码规则
        const rule = await prisma.numberingRule.findFirst({
          where: {
            tenantId: req.user.tenantId,
            businessType: 'sales_outbound',
            status: 'active',
          },
        });

        if (rule) {
          // 生成编号
          const now = new Date();
          const dateStr = formatDateForRule(now, rule.dateFormat);
          const sequenceStr = String(rule.currentNumber + 1).padStart(rule.sequenceLength, '0');
          generatedOutboundNo = `${rule.prefix}${rule.separator}${dateStr}${rule.separator}${sequenceStr}`;

          // 更新序号
          await prisma.numberingRule.update({
            where: { id: rule.id },
            data: { currentNumber: rule.currentNumber + 1 },
          });
        } else {
          // 没有规则，生成简单编号
          generatedOutboundNo = `SO-${Date.now()}`;
        }
      } catch (numError) {
        console.error('生成编号失败:', numError);
        generatedOutboundNo = `SO-${Date.now()}`;
      }
    }

    // 验证参数（仓库和明细必填）
    if (!warehouseId || !details || !Array.isArray(details) || details.length === 0) {
      return res.status(400).json({
        success: false,
        message: '仓库和商品明细不能为空',
      });
    }

    // 检查出库单编号是否已存在（同一租户内）
    const existingOutbound = await prisma.salesOutbound.findFirst({
      where: {
        tenantId: req.user.tenantId,
        outboundNo: generatedOutboundNo,
      },
    });

    if (existingOutbound) {
      return res.status(400).json({
        success: false,
        message: '出库单编号已存在',
      });
    }

    let finalCustomerId = customerId || null;
    let finalSalesmanId = salesmanId || null;
    const finalOrderId = orderId || null;
    
    // 如果关联销售订单，检查是否存在
    if (finalOrderId) {
      const order = await prisma.salesOrder.findFirst({
        where: {
          id: finalOrderId,
          tenantId: req.user.tenantId,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: '销售订单不存在',
        });
      }

      // 检查订单状态
      if (order.status !== 'confirmed' && order.status !== 'partial') {
        return res.status(400).json({
          success: false,
          message: '只有已确认或部分出库的订单可以出库',
        });
      }
      
      // 从销售订单中获取客户和业务员，如果前端没有提供
      if (!finalCustomerId) {
        finalCustomerId = order.customerId;
      }
      if (!finalSalesmanId) {
        finalSalesmanId = order.salesmanId;
      }
    }

    // 检查仓库是否存在
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        tenantId: req.user.tenantId,
      },
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: '仓库不存在',
      });
    }

    // 验证明细 + 检查库存是否充足
    for (const detail of details) {
      if (!detail.productId || !detail.quantity || !detail.unitPrice) {
        return res.status(400).json({
          success: false,
          message: '出库明细必须包含商品ID、数量和单价',
        });
      }

      // 检查商品是否存在
      const product = await prisma.product.findFirst({
        where: {
          id: detail.productId,
          tenantId: req.user.tenantId,
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `商品不存在: ${detail.productId}`,
        });
      }

      // 检查库存是否充足
      const inventory = await prisma.inventoryItem.findFirst({
        where: {
          tenantId: req.user.tenantId,
          productId: detail.productId,
          warehouseId,
        },
      });

      if (!inventory || inventory.quantity < detail.quantity) {
        return res.status(400).json({
          success: false,
          message: `商品 ${product.name} 库存不足，当前库存: ${inventory?.quantity || 0}`,
        });
      }

      // 计算金额
      detail.amount = detail.quantity * detail.unitPrice;
    }

    // 计算总金额（包含物流费用）
    const totalAmount = details.reduce((sum: number, detail: any) => sum + detail.amount, 0) + (logisticsCost || 0);

    // 创建出库单（事务）
    const outbound = await prisma.$transaction(async (tx) => {
      // 创建出库单主表
      const newOutbound = await tx.salesOutbound.create({
        data: {
          tenantId: req.user!.tenantId!,
          outboundNo: generatedOutboundNo,
          orderId: finalOrderId,
          customerId: finalCustomerId,
          salesmanId: finalSalesmanId,
          warehouseId,
          outboundDate: new Date(outboundDate),
          totalAmount,
          logisticsCost,
          status: 'confirmed',
          remark,
          creatorId: req.user.id,
        },
      });

      // 创建出库单明细
      for (const detail of details) {
        await tx.salesOutboundDetail.create({
          data: {
            outboundId: newOutbound.id,
            productId: detail.productId,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            amount: detail.amount,
            batchNo: detail.batchNo,
          },
        });
      }

      // 扣减库存
      for (const detail of details) {
        const inventory = await tx.inventoryItem.findFirst({
          where: buildBatchNoWhere({
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId,
          }, detail.batchNo),
        });

        if (!inventory || inventory.quantity < detail.quantity) {
          throw new Error(`商品库存不足: ${detail.productId}，当前库存: ${inventory?.quantity || 0}，需要: ${detail.quantity}`);
        }

        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantity: inventory.quantity - detail.quantity,
          },
        });

        // 记录库存变动日志
        await tx.inventoryLog.create({
          data: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId,
            batchNo: detail.batchNo,
            changeType: 'sales_outbound',
            changeQty: -detail.quantity,
            beforeQty: inventory.quantity,
            afterQty: inventory.quantity - detail.quantity,
            relatedOrderNo: generatedOutboundNo,
            remark: `销售出库: ${generatedOutboundNo}`,
          },
        });
      }

      // 如果关联了销售订单，更新订单状态
      if (finalOrderId) {
        // 获取销售订单及其所有明细
        const salesOrder = await tx.salesOrder.findFirst({
          where: { id: finalOrderId, tenantId: req.user!.tenantId! },
          include: {
            items: true,
          },
        });

        if (salesOrder) {
          // 按明细行逐行比较（而非全局数量汇总）判断订单出库状态
          // 获取所有已确认的出库单明细（包括本次创建的）
          const allOutboundDetails = await tx.salesOutboundDetail.findMany({
            where: {
              outbound: {
                orderId: finalOrderId,
                status: 'confirmed',
                tenantId: req.user!.tenantId!,
              },
            },
          });

          // 按 productId 汇总每个物料的已出库数量
          const outboundByProduct = new Map<string, number>();
          for (const d of allOutboundDetails) {
            outboundByProduct.set(d.productId, (outboundByProduct.get(d.productId) || 0) + (d.quantity || 0));
          }

          let allCompleted = salesOrder.items.length > 0;
          let anyOutbound = false;

          for (const item of salesOrder.items) {
            const shipped = outboundByProduct.get(item.productId) || 0;
            if (shipped > 0) anyOutbound = true;
            if (shipped < (item.quantity || 0)) {
              allCompleted = false;
            }
          }

          let newStatus: string;
          if (allCompleted && salesOrder.items.length > 0) {
            newStatus = 'completed';
          } else if (anyOutbound) {
            newStatus = 'partial';
          } else {
            newStatus = salesOrder.status;
          }

          // 更新销售订单状态
          await tx.salesOrder.update({
            where: { id: finalOrderId },
            data: { status: newStatus }
          });
        }
      }

      return newOutbound;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'sales_outbound',
      resource: outbound.id,
      detail: JSON.stringify({ outboundNo, orderId: finalOrderId, warehouseId, totalAmount }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的出库单信息
    const createdOutbound = await prisma.salesOutbound.findUnique({
      where: { id: outbound.id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            customer: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        details: {
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
      data: createdOutbound,
      message: '销售出库单创建成功',
    });
  } catch (error) {
    console.error('创建销售出库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建销售出库单失败',
    });
  }
};

/**
 * 确认销售出库单（草稿 → 已确认，同时更新库存）
 * POST /api/v1/sales-outbounds/:id/confirm
 */
export const confirmSalesOutbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查出库单是否存在
    const existingOutbound = await prisma.salesOutbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        details: true,
        warehouse: true,
      },
    });

    if (!existingOutbound) {
      return res.status(404).json({
        success: false,
        message: '销售出库单不存在',
      });
    }

    // 只有草稿状态可以确认
    if (existingOutbound.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以确认',
      });
    }

    // 确认出库单（事务：更新状态 + 更新库存 + 更新订单已出库数量）
    const confirmedOutbound = await prisma.$transaction(async (tx) => {
      // 1. 更新出库单状态
      const updatedOutbound = await tx.salesOutbound.update({
        where: { id },
        data: { status: 'confirmed' },
      });

      // 2. 更新库存
      for (const detail of existingOutbound.details) {
        // 查找库存记录
        const inventory = await tx.inventoryItem.findFirst({
          where: buildBatchNoWhere({
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingOutbound.warehouseId,
          }, detail.batchNo),
        });

        if (!inventory || inventory.quantity < detail.quantity) {
          throw new Error(`商品库存不足: ${detail.productId}`);
        }

        // 更新库存
        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantity: inventory.quantity - detail.quantity,
          },
        });

        // 3. 记录库存变动日志
        await tx.inventoryLog.create({
          data: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingOutbound.warehouseId,
            batchNo: detail.batchNo,
            changeType: 'sales_outbound',
            changeQty: -detail.quantity,
            beforeQty: inventory.quantity,
            afterQty: inventory.quantity - detail.quantity,
            relatedOrderNo: existingOutbound.outboundNo,
            remark: `销售出库: ${existingOutbound.outboundNo}`,
          },
        });

        // 4. 如果关联销售订单，更新订单明细的已出库数量
        if (existingOutbound.orderId) {
          const orderItem = await tx.salesOrderItem.findFirst({
            where: {
              orderId: existingOutbound.orderId,
              productId: detail.productId,
            },
          });

          if (orderItem) {
            const newShippedQty = orderItem.shippedQty + detail.quantity;
            const newStatus = newShippedQty >= orderItem.quantity ? 'completed' : 'partial';

            await tx.salesOrderItem.update({
              where: { id: orderItem.id },
              data: {
                shippedQty: newShippedQty,
                status: newStatus,
              },
            });

            // 检查订单所有明细是否都已完成
            const pendingItems = await tx.salesOrderItem.findMany({
              where: {
                orderId: existingOutbound.orderId,
                status: { not: 'completed' },
              },
            });

            // 如果所有明细都已完成，更新订单状态
            if (pendingItems.length === 0) {
              await tx.salesOrder.update({
                where: { id: existingOutbound.orderId },
                data: { status: 'completed' },
              });
            } else {
              await tx.salesOrder.update({
                where: { id: existingOutbound.orderId },
                data: { status: 'partial' },
              });
            }
          }
        }
      }

      return updatedOutbound;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'sales_outbound',
      resource: id,
      detail: JSON.stringify({ action: 'confirm', status: 'confirmed' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: confirmedOutbound,
      message: '销售出库单确认成功，库存已更新',
    });
  } catch (error) {
    console.error('确认销售出库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '确认销售出库单失败',
    });
  }
};

/**
 * 反确认销售出库单（已确认 → 草稿，同时扣减库存）
 * POST /api/v1/sales-outbounds/:id/unconfirm
 */
export const unconfirmSalesOutbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查出库单是否存在
    const existingOutbound = await prisma.salesOutbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        details: true,
        warehouse: true,
      },
    });

    if (!existingOutbound) {
      return res.status(404).json({
        success: false,
        message: '销售出库单不存在',
      });
    }

    // 只有已确认状态可以反确认
    if (existingOutbound.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: '只有已确认状态可以反确认',
      });
    }

    // 反确认出库单（事务：更新状态 + 扣减库存 + 更新订单已出库数量）
    const unconfirmedOutbound = await prisma.$transaction(async (tx) => {
      // 1. 更新出库单状态为草稿
      const updatedOutbound = await tx.salesOutbound.update({
        where: { id },
        data: { status: 'draft' },
      });

      // 2. 扣减库存（实际上是增加库存，因为出库是减少库存）
      for (const detail of existingOutbound.details) {
        // 查找库存记录
        const inventory = await tx.inventoryItem.findFirst({
          where: buildBatchNoWhere({
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingOutbound.warehouseId,
          }, detail.batchNo),
        });

        if (inventory) {
          // 增加库存（出库时扣减，反确认时加回）
          await tx.inventoryItem.update({
            where: { id: inventory.id },
            data: {
              quantity: inventory.quantity + detail.quantity,
            },
          });

          // 3. 记录库存变动日志（正数表示增加）
          await tx.inventoryLog.create({
            data: {
              tenantId: req.user!.tenantId!,
              productId: detail.productId,
              warehouseId: existingOutbound.warehouseId,
              batchNo: detail.batchNo,
              changeType: 'sales_outbound_unconfirm',
              changeQty: detail.quantity,
              beforeQty: inventory.quantity,
              afterQty: inventory.quantity + detail.quantity,
              relatedOrderNo: existingOutbound.outboundNo,
              remark: `反确认出库: ${existingOutbound.outboundNo}`,
            },
          });
        }

        // 4. 如果关联销售订单，更新订单明细的已出库数量
        if (existingOutbound.orderId) {
          const orderItem = await tx.salesOrderItem.findFirst({
            where: {
              orderId: existingOutbound.orderId,
              productId: detail.productId,
            },
          });

          if (orderItem) {
            const newShippedQty = Math.max(0, orderItem.shippedQty - detail.quantity);
            const newStatus = newShippedQty === 0 ? 'draft' : (newShippedQty >= orderItem.quantity ? 'completed' : 'partial');

            await tx.salesOrderItem.update({
              where: { id: orderItem.id },
              data: {
                shippedQty: newShippedQty,
                status: newStatus,
              },
            });

            // 检查并更新订单状态
            const pendingItems = await tx.salesOrderItem.findMany({
              where: {
                orderId: existingOutbound.orderId,
                status: { in: ['confirmed', 'partial'] },
              },
            });

            // 如果有部分出库的明细，更新订单状态
            if (pendingItems.length > 0 || newShippedQty > 0) {
              await tx.salesOrder.update({
                where: { id: existingOutbound.orderId },
                data: { status: 'partial' },
              });
            } else {
              await tx.salesOrder.update({
                where: { id: existingOutbound.orderId },
                data: { status: 'confirmed' },
              });
            }
          }
        }
      }

      return updatedOutbound;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'sales_outbound',
      resource: id,
      detail: JSON.stringify({ action: 'unconfirm', status: 'draft' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: unconfirmedOutbound,
      message: '销售出库单反确认成功，库存已恢复',
    });
  } catch (error) {
    console.error('反确认销售出库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '反确认销售出库单失败',
    });
  }
};

/**
 * 更新销售出库单（仅草稿状态）
 * PUT /api/v1/sales-outbounds/:id
 */
export const updateSalesOutbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      outboundNo,
      orderId,
      warehouseId,
      outboundDate,
      remark,
      details,
    } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查出库单是否存在
    const existingOutbound = await prisma.salesOutbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        details: true,
      },
    });

    if (!existingOutbound) {
      return res.status(404).json({
        success: false,
        message: '销售出库单不存在',
      });
    }

    // 只有草稿状态可以修改
    if (existingOutbound.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以修改',
      });
    }

    // 如果修改出库单编号，检查是否已存在
    if (outboundNo && outboundNo !== existingOutbound.outboundNo) {
      const outboundNoExists = await prisma.salesOutbound.findFirst({
        where: {
          tenantId: req.user.tenantId,
          outboundNo,
          id: { not: id },
        },
      });

      if (outboundNoExists) {
        return res.status(400).json({
          success: false,
          message: '出库单编号已存在',
        });
      }
    }

    // 如果修改关联订单，检查是否存在
    if (orderId && orderId !== existingOutbound.orderId) {
      const order = await prisma.salesOrder.findFirst({
        where: {
          id: orderId,
          tenantId: req.user.tenantId,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: '销售订单不存在',
        });
      }
    }

    // 如果修改仓库，检查是否存在
    if (warehouseId && warehouseId !== existingOutbound.warehouseId) {
      const warehouse = await prisma.warehouse.findFirst({
        where: {
          id: warehouseId,
          tenantId: req.user.tenantId,
        },
      });

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          message: '仓库不存在',
        });
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (outboundNo !== undefined) updateData.outboundNo = outboundNo;
    if (orderId !== undefined) updateData.orderId = orderId || null;
    if (warehouseId !== undefined) updateData.warehouseId = warehouseId;
    if (outboundDate !== undefined) updateData.outboundDate = new Date(outboundDate);
    if (remark !== undefined) updateData.remark = remark;

    // 如果有明细，更新明细
    if (details && Array.isArray(details)) {
      // 验证明细并计算金额
      for (const detail of details) {
        if (!detail.productId || !detail.quantity || !detail.unitPrice) {
          return res.status(400).json({
            success: false,
            message: '出库明细必须包含商品ID、数量和单价',
          });
        }

        // 检查商品是否存在
        const product = await prisma.product.findFirst({
          where: {
            id: detail.productId,
            tenantId: req.user.tenantId,
          },
        });

        if (!product) {
          return res.status(404).json({
            success: false,
            message: `商品不存在: ${detail.productId}`,
          });
        }

        // 计算金额
        detail.amount = detail.quantity * detail.unitPrice;
      }

      // 计算总金额
      const totalAmount = details.reduce((sum: number, detail: any) => sum + detail.amount, 0);
      
      updateData.totalAmount = totalAmount;

      // 更新出库单和明细（事务）
      await prisma.$transaction(async (tx) => {
        // 更新出库单主表
        await tx.salesOutbound.update({
          where: { id },
          data: updateData,
        });

        // 删除旧明细
        await tx.salesOutboundDetail.deleteMany({
          where: { outboundId: id },
        });

        // 创建新明细
        for (const detail of details) {
          await tx.salesOutboundDetail.create({
            data: {
              outboundId: id,
              productId: detail.productId,
              quantity: detail.quantity,
              unitPrice: detail.unitPrice,
              amount: detail.amount,
              batchNo: detail.batchNo,
            },
          });
        }
      });
    } else {
      // 只更新主表
      await prisma.salesOutbound.update({
        where: { id },
        data: updateData,
      });
    }

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'sales_outbound',
      resource: id,
      detail: JSON.stringify({ outboundNo, orderId, warehouseId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的出库单信息
    const updatedOutbound = await prisma.salesOutbound.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            customer: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        details: {
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
      data: updatedOutbound,
      message: '销售出库单更新成功',
    });
  } catch (error) {
    console.error('更新销售出库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新销售出库单失败',
    });
  }
};

/**
 * 删除销售出库单（仅草稿状态）
 * DELETE /api/v1/sales-outbounds/:id
 */
export const deleteSalesOutbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查出库单是否存在
    const existingOutbound = await prisma.salesOutbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingOutbound) {
      return res.status(404).json({
        success: false,
        message: '销售出库单不存在',
      });
    }

    // 只有草稿状态可以删除
    if (existingOutbound.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以删除',
      });
    }

    // 删除出库单（级联删除明细）
    await prisma.salesOutbound.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'sales_outbound',
      resource: id,
      detail: JSON.stringify({ outboundNo: existingOutbound.outboundNo, orderId: existingOutbound.orderId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '销售出库单删除成功',
    });
  } catch (error) {
    console.error('删除销售出库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除销售出库单失败',
    });
  }
};

/**
 * 导入销售出库单
 * POST /api/v1/sales-outbounds/import
 */
export const importSalesOutbounds = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const items = req.body as any[];
    console.log('导入销售出库单 - 接收到的数据:', JSON.stringify(items, null, 2));

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: '数据格式错误，期望数组格式' });
    }

    const errors: Array<{ row: number; message: string }> = [];
    const successItems: any[] = [];

    // 按出库单号分组
    const outboundGroups = new Map<string, any[]>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      console.log(`处理第${row}行数据:`, JSON.stringify(item, null, 2));

      if (item.warehouseError) rowErrors.push(item.warehouseError);
      if (item.productError) rowErrors.push(item.productError);
      if (item.customerError) rowErrors.push(item.customerError);
      if (item.orderError) rowErrors.push(item.orderError);

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      if (!item.warehouseId) rowErrors.push('仓库不能为空');
      if (!item.productId) rowErrors.push('物料不能为空');
      if (!item.quantity) rowErrors.push('数量不能为空');
      if (!item.outboundNo) rowErrors.push('出库单号不能为空');
      if (!item.outboundDate) rowErrors.push('出库日期不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      const outboundNo = item.outboundNo || `SO${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // 按出库单号分组
      if (!outboundGroups.has(outboundNo)) {
        outboundGroups.set(outboundNo, []);
      }
      outboundGroups.get(outboundNo)!.push(item);
    }

    // 为每个出库单组创建出库单
    for (const [outboundNo, outboundItems] of outboundGroups.entries()) {
      try {
        const firstItem = outboundItems[0];
        const outboundDate = firstItem.outboundDate ? new Date(firstItem.outboundDate) : new Date();

        console.log(`创建出库单 ${outboundNo}, 仓库ID: ${firstItem.warehouseId}, 明细数量: ${outboundItems.length}`);

        // 检查出库单号是否已存在
        const existingOutbound = await prisma.salesOutbound.findFirst({
          where: {
            tenantId,
            outboundNo,
          },
          include: {
            details: true
          }
        });

        if (existingOutbound) {
          console.log(`出库单号 ${outboundNo} 已存在，尝试合并明细`);
          
          try {
            // 计算新明细的金额（优先使用前端传入的金额）
            let newTotalAmount = 0;
            const newItemsData = outboundItems.map(item => {
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
                batchNo: item.batchNo,
              };
            });

            // 计算现有出库单的明细金额
            const existingTotalAmount = existingOutbound.details.reduce((sum, item) => {
              return sum + Number(item.amount);
            }, 0);

            // 更新出库单，添加新明细，并确保状态为已确认（事务：更新单据 + 扣减库存）
            const updatedOutbound = await prisma.$transaction(async (tx) => {
              // 构建更新数据，如果导入数据有customerId/salesmanId且已有出库单没有，则补填
              const newCombinedTotal = existingTotalAmount + newTotalAmount;
              const updateData: any = {
                totalAmount: newCombinedTotal,
                goodsAmount: newCombinedTotal,
                status: 'confirmed',
                creatorId: req.user.id,
                details: {
                  create: newItemsData
                }
              };
              // 如果已有出库单没有customerId，且导入数据有，则补填
              if (!existingOutbound.customerId && firstItem.customerId) {
                updateData.customerId = firstItem.customerId;
              }
              // 如果已有出库单没有salesmanId，且导入数据有，则补填
              if (!existingOutbound.salesmanId && firstItem.salesmanId) {
                updateData.salesmanId = firstItem.salesmanId;
              }

              const result = await tx.salesOutbound.update({
                where: { id: existingOutbound.id },
                data: updateData,
                include: {
                  order: {
                    select: {
                      id: true,
                      orderNo: true,
                      customer: {
                        select: {
                          id: true,
                          code: true,
                          name: true,
                        },
                      },
                    },
                  },
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
                  warehouse: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                  details: {
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

              // 只对新合并的明细扣减库存
              for (const item of newItemsData) {
                const inventory = await tx.inventoryItem.findFirst({
                  where: buildBatchNoWhere({
                    tenantId,
                    productId: item.productId,
                    warehouseId: existingOutbound.warehouseId,
                  }, item.batchNo),
                });

                if (!inventory || inventory.quantity < item.quantity) {
                  throw new Error(`商品库存不足: ${item.productId}，当前库存: ${inventory?.quantity || 0}，需要: ${item.quantity}`);
                }

                await tx.inventoryItem.update({
                  where: { id: inventory.id },
                  data: {
                    quantity: inventory.quantity - item.quantity,
                  },
                });

                // 记录库存变动日志
                await tx.inventoryLog.create({
                  data: {
                    tenantId,
                    productId: item.productId,
                    warehouseId: existingOutbound.warehouseId,
                    batchNo: item.batchNo,
                    changeType: 'sales_outbound',
                    changeQty: -item.quantity,
                    beforeQty: inventory.quantity,
                    afterQty: inventory.quantity - item.quantity,
                    relatedOrderNo: outboundNo,
                    remark: `销售出库(导入合并): ${outboundNo}`,
                  },
                });

                // 如果关联销售订单，更新订单明细的已出库数量
                if (existingOutbound.orderId) {
                  const orderItem = await tx.salesOrderItem.findFirst({
                    where: {
                      orderId: existingOutbound.orderId,
                      productId: item.productId,
                    },
                  });

                  if (orderItem) {
                    const newShippedQty = orderItem.shippedQty + item.quantity;
                    const newStatus = newShippedQty >= orderItem.quantity ? 'completed' : 'partial';

                    await tx.salesOrderItem.update({
                      where: { id: orderItem.id },
                      data: {
                        shippedQty: newShippedQty,
                        status: newStatus,
                      },
                    });

                    const pendingItems = await tx.salesOrderItem.findMany({
                      where: {
                        orderId: existingOutbound.orderId,
                        status: { not: 'completed' },
                      },
                    });

                    if (pendingItems.length === 0) {
                      await tx.salesOrder.update({
                        where: { id: existingOutbound.orderId },
                        data: { status: 'completed' },
                      });
                    } else {
                      await tx.salesOrder.update({
                        where: { id: existingOutbound.orderId },
                        data: { status: 'partial' },
                      });
                    }
                  }
                }
              }

              return result;
            });

            successItems.push(updatedOutbound);
            console.log(`出库单 ${outboundNo} 明细合并成功`);
            continue;
          } catch (mergeError) {
            console.error(`合并出库单 ${outboundNo} 明细失败:`, mergeError);
            // 找到这个出库单的所有行号
            const affectedRows = items.map((item, index) => 
              item.outboundNo === outboundNo ? index + 1 : -1
            ).filter(row => row > 0);
            
            affectedRows.forEach(row => {
              errors.push({ row, message: `合并出库单 ${outboundNo} 明细失败: ${mergeError instanceof Error ? mergeError.message : '未知错误'}` });
            });
            continue;
          }
        }

        // 计算总金额（优先使用前端传入的金额）
        let totalAmount = 0;
        const itemsData = outboundItems.map(item => {
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
            batchNo: item.batchNo,
          };
        });

        // 使用事务：创建出库单 + 扣减库存 + 记录日志 + 更新订单
        const outbound = await prisma.$transaction(async (tx) => {
          const newOutbound = await tx.salesOutbound.create({
            data: {
              tenantId,
              outboundNo,
              orderId: firstItem.orderId,
              warehouseId: firstItem.warehouseId,
              customerId: firstItem.customerId,
              salesmanId: firstItem.salesmanId || null,
              outboundDate,
              remark: firstItem.remark || '',
              status: 'confirmed',
              totalAmount: totalAmount,
              goodsAmount: totalAmount,
              creatorId: req.user.id,
              details: {
                create: itemsData
              }
            },
            include: {
              order: {
                select: {
                  id: true,
                  orderNo: true,
                  customer: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                },
              },
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
              warehouse: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
              details: {
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

          // 扣减库存
          for (const detail of itemsData) {
            const inventory = await tx.inventoryItem.findFirst({
              where: buildBatchNoWhere({
                tenantId,
                productId: detail.productId,
                warehouseId: firstItem.warehouseId,
              }, detail.batchNo),
            });

            if (!inventory || inventory.quantity < detail.quantity) {
              throw new Error(`商品库存不足: ${detail.productId}，当前库存: ${inventory?.quantity || 0}，需要: ${detail.quantity}`);
            }

            await tx.inventoryItem.update({
              where: { id: inventory.id },
              data: {
                quantity: inventory.quantity - detail.quantity,
              },
            });

            // 记录库存变动日志
            await tx.inventoryLog.create({
              data: {
                tenantId,
                productId: detail.productId,
                warehouseId: firstItem.warehouseId,
                batchNo: detail.batchNo,
                changeType: 'sales_outbound',
                changeQty: -detail.quantity,
                beforeQty: inventory.quantity,
                afterQty: inventory.quantity - detail.quantity,
                relatedOrderNo: outboundNo,
                remark: `销售出库: ${outboundNo}`,
              },
            });

            // 如果关联销售订单，更新订单明细的已出库数量
            if (firstItem.orderId) {
              const orderItem = await tx.salesOrderItem.findFirst({
                where: {
                  orderId: firstItem.orderId,
                  productId: detail.productId,
                },
              });

              if (orderItem) {
                const newShippedQty = orderItem.shippedQty + detail.quantity;
                const newStatus = newShippedQty >= orderItem.quantity ? 'completed' : 'partial';

                await tx.salesOrderItem.update({
                  where: { id: orderItem.id },
                  data: {
                    shippedQty: newShippedQty,
                    status: newStatus,
                  },
                });

                const pendingItems = await tx.salesOrderItem.findMany({
                  where: {
                    orderId: firstItem.orderId,
                    status: { not: 'completed' },
                  },
                });

                if (pendingItems.length === 0) {
                  await tx.salesOrder.update({
                    where: { id: firstItem.orderId },
                    data: { status: 'completed' },
                  });
                } else {
                  await tx.salesOrder.update({
                    where: { id: firstItem.orderId },
                    data: { status: 'partial' },
                  });
                }
              }
            }
          }

          return newOutbound;
        });

        successItems.push(outbound);
      } catch (error) {
        console.error(`创建出库单 ${outboundNo} 失败:`, error);
        // 找到这个出库单的所有行号
        const affectedRows = items.map((item, index) => 
          item.outboundNo === outboundNo ? index + 1 : -1
        ).filter(row => row > 0);
        
        affectedRows.forEach(row => {
          errors.push({ row, message: `出库单 ${outboundNo} 创建失败: ${error instanceof Error ? error.message : '未知错误'}` });
        });
      }
    }

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'import',
      module: 'sales_outbound',
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
        successCount: successItems.length,
        failCount: errors.length,
        errors
      }
    });
  } catch (error) {
    console.error('导入销售出库单失败:', error);
    res.status(500).json({
      success: false,
      message: '导入销售出库单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

export default {
  getSalesOutbounds,
  getSalesOutboundById,
  createSalesOutbound,
  updateSalesOutbound,
  confirmSalesOutbound,
  unconfirmSalesOutbound,
  deleteSalesOutbound,
  importSalesOutbounds,
};