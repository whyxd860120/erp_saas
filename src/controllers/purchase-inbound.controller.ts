import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog, getAuditLogs } from '../utils/audit.util';
import { parseDateStart, parseDateEnd } from '../utils/date.util';

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
 * 获取采购入库单列表
 * GET /api/v1/purchase-inbounds
 */
export const getPurchaseInbounds = async (req: Request, res: Response) => {
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
      supplierId,
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

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (startDate || endDate) {
      where.inboundDate = {};
      if (startDate) {
        where.inboundDate.gte = parseDateStart(startDate as string);
      }
      if (endDate) {
        where.inboundDate.lte = parseDateEnd(endDate as string);
      }
    }

    if (search) {
      where.OR = [
        { inboundNo: { contains: search as string } },
        { remark: { contains: search as string } },
      ];
    }

    // 查询入库单列表
    const [inbounds, total] = await Promise.all([
      prisma.purchaseInbound.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              supplier: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          supplier: {
            select: {
              id: true,
              code: true,
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
      prisma.purchaseInbound.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: inbounds,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取采购入库单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取采购入库单列表失败',
    });
  }
};

/**
 * 获取采购入库单详情
 * GET /api/v1/purchase-inbounds/:id
 */
export const getPurchaseInboundById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const inbound = await prisma.purchaseInbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            supplier: {
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
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            contact: true,
            phone: true,
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

    if (!inbound) {
      return res.status(404).json({
        success: false,
        message: '采购入库单不存在',
      });
    }

    // 获取操作记录
    const auditLogs = await getAuditLogs({
      tenantId: req.user.tenantId,
      module: 'purchase_inbound',
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

    const inboundWithLogs = {
      ...inbound,
      logs: formattedLogs,
    };

    return res.json({
      success: true,
      data: inboundWithLogs,
    });
  } catch (error) {
    console.error('获取采购入库单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取采购入库单详情失败',
    });
  }
};

/**
 * 获取操作文本
 */
function getActionText(action: string): string {
  const actionMap: Record<string, string> = {
    create: '创建入库单',
    update: '更新入库单',
    delete: '删除入库单',
    confirm: '确认入库单',
    cancel: '取消入库单',
  };
  return actionMap[action] || action;
}

/**
 * 创建采购入库单
 * POST /api/v1/purchase-inbounds
 */
export const createPurchaseInbound = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      inboundNo,
      orderId,
      supplierId,
      warehouseId,
      inboundDate = new Date(),
      remark,
      logisticsCost = 0,
      details,
    } = req.body;

    // 验证参数（仓库和明细必填）
    if (!warehouseId || !details || !Array.isArray(details) || details.length === 0) {
      return res.status(400).json({
        success: false,
        message: '仓库和明细不能为空',
      });
    }

    // 如果没有传入编号，尝试自动生成
    let generatedInboundNo = inboundNo;
    if (!generatedInboundNo) {
      try {
        // 查找采购入库的编码规则
        const rule = await prisma.numberingRule.findFirst({
          where: {
            tenantId: req.user.tenantId,
            businessType: 'purchase_inbound',
            status: 'active',
          },
        });

        if (rule) {
          // 生成编号
          const now = new Date();
          const dateStr = formatDateForRule(now, rule.dateFormat);
          const sequenceStr = String(rule.currentNumber + 1).padStart(rule.sequenceLength, '0');
          generatedInboundNo = `${rule.prefix}${rule.separator}${dateStr}${rule.separator}${sequenceStr}`;

          // 更新序号
          await prisma.numberingRule.update({
            where: { id: rule.id },
            data: { currentNumber: rule.currentNumber + 1 },
          });
        } else {
          // 没有规则，生成简单编号
          generatedInboundNo = `PI-${Date.now()}`;
        }
      } catch (numError) {
        console.error('生成编号失败:', numError);
        generatedInboundNo = `PI-${Date.now()}`;
      }
    }

    // 检查入库单编号是否已存在（同一租户内）
    const existingInbound = await prisma.purchaseInbound.findFirst({
      where: {
        tenantId: req.user.tenantId,
        inboundNo: generatedInboundNo,
      },
    });

    if (existingInbound) {
      return res.status(400).json({
        success: false,
        message: '入库单编号已存在，请重新生成',
      });
    }

    // 如果关联采购订单，检查是否存在
    if (orderId) {
      const order = await prisma.purchaseOrder.findFirst({
        where: {
          id: orderId,
          tenantId: req.user.tenantId,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: '采购订单不存在',
        });
      }

      // 检查订单状态
      if (order.status !== 'confirmed' && order.status !== 'partial') {
        return res.status(400).json({
          success: false,
          message: '只有已确认或部分入库的订单可以入库',
        });
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

    // 验证明细
    for (const detail of details) {
      if (!detail.productId || !detail.quantity || !detail.unitPrice) {
        return res.status(400).json({
          success: false,
          message: '入库明细必须包含商品ID、数量和单价',
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

    // 计算总金额（包含物流费用）
    const totalAmount = details.reduce((sum: number, detail: any) => sum + detail.amount, 0) + (logisticsCost || 0);

    // 创建入库单（事务）
    const inbound = await prisma.$transaction(async (tx) => {
      // 创建入库单主表 - 初始状态为草稿
      const newInbound = await tx.purchaseInbound.create({
        data: {
          tenantId: req.user!.tenantId!,
          inboundNo: generatedInboundNo,
          orderId,
          supplierId: supplierId || undefined,
          warehouseId,
          inboundDate: new Date(inboundDate),
          totalAmount,
          logisticsCost,
          status: 'draft',
          remark,
          creatorId: req.user.id,
        },
      });

      // 创建入库单明细
      for (const detail of details) {
        await tx.purchaseInboundDetail.create({
          data: {
            inboundId: newInbound.id,
            productId: detail.productId,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            amount: detail.amount,
            batchNo: detail.batchNo,
            productionDate: detail.productionDate ? new Date(detail.productionDate) : null,
            expiryDate: detail.expiryDate ? new Date(detail.expiryDate) : null,
          },
        });
      }

      return newInbound;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'purchase_inbound',
      resource: inbound.id,
      detail: JSON.stringify({ inboundNo, orderId, warehouseId, totalAmount }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的入库单信息
    const createdInbound = await prisma.purchaseInbound.findUnique({
      where: { id: inbound.id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            supplier: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
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
      data: createdInbound,
      message: '采购入库单创建成功',
    });
  } catch (error) {
    console.error('创建采购入库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建采购入库单失败',
    });
  }
};

/**
 * 确认采购入库单（草稿 → 已确认，同时更新库存）
 * POST /api/v1/purchase-inbounds/:id/confirm
 */
export const confirmPurchaseInbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查入库单是否存在
    const existingInbound = await prisma.purchaseInbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        details: true,
        warehouse: true,
      },
    });

    if (!existingInbound) {
      return res.status(404).json({
        success: false,
        message: '采购入库单不存在',
      });
    }

    // 只有草稿状态可以确认
    if (existingInbound.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以确认',
      });
    }

    // 确认入库单（事务：更新状态 + 更新库存 + 更新订单已入库数量）
    const confirmedInbound = await prisma.$transaction(async (tx) => {
      // 1. 更新入库单状态
      const updatedInbound = await tx.purchaseInbound.update({
        where: { id },
        data: { status: 'confirmed' },
      });

      // 2. 更新库存
      for (const detail of existingInbound.details) {
        // 查找库存记录
        const existingInventory = await tx.inventoryItem.findFirst({
          where: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingInbound.warehouseId,
            batchNo: detail.batchNo || null,
          },
        });

        if (existingInventory) {
          // 更新现有库存 - 使用正确的加权平均成本价公式
          // 总成本 = 单价 × 数量（不是 receivedQty × unitCost）
          const totalCost = detail.unitPrice * detail.quantity;
          const newCostPrice = (existingInventory.costPrice * existingInventory.quantity + totalCost) / (existingInventory.quantity + detail.quantity);
          await tx.inventoryItem.update({
            where: { id: existingInventory.id },
            data: {
              quantity: existingInventory.quantity + detail.quantity,
              costPrice: newCostPrice,
            },
          });
        } else {
          // 使用 upsert 避免并发时的唯一约束冲突
          const totalCost = detail.unitPrice * detail.quantity;
          await tx.inventoryItem.upsert({
            where: {
              tenantId_productId_warehouseId_batchNo: {
                tenantId: req.user!.tenantId!,
                productId: detail.productId,
                warehouseId: existingInbound.warehouseId,
                batchNo: detail.batchNo || '',
              },
            },
            update: {
              quantity: { increment: detail.quantity },
              costPrice: totalCost, // 简化为当前单价，后续可通过重算校正
            },
            create: {
              tenantId: req.user!.tenantId!,
              productId: detail.productId,
              warehouseId: existingInbound.warehouseId,
              batchNo: detail.batchNo,
              quantity: detail.quantity,
              costPrice: detail.unitPrice,
            },
          });
        }

        // 3. 记录库存变动日志
        await tx.inventoryLog.create({
          data: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingInbound.warehouseId,
            batchNo: detail.batchNo,
            changeType: 'purchase_inbound',
            changeQty: detail.quantity,
            beforeQty: existingInventory ? existingInventory.quantity : 0,
            afterQty: existingInventory ? existingInventory.quantity + detail.quantity : detail.quantity,
            relatedOrderNo: existingInbound.inboundNo,
            remark: `采购入库: ${existingInbound.inboundNo}`,
          },
        });

        // 4. 如果关联采购订单，更新订单明细的已入库数量
        if (existingInbound.orderId) {
          const orderItem = await tx.purchaseOrderItem.findFirst({
            where: {
              orderId: existingInbound.orderId,
              productId: detail.productId,
            },
          });

          if (orderItem) {
            const newReceivedQty = orderItem.receivedQty + detail.quantity;
            const newStatus = newReceivedQty >= orderItem.quantity ? 'completed' : 'partial';

            await tx.purchaseOrderItem.update({
              where: { id: orderItem.id },
              data: {
                receivedQty: newReceivedQty,
                status: newStatus,
              },
            });

            // 检查订单所有明细是否都已完成
            const pendingItems = await tx.purchaseOrderItem.findMany({
              where: {
                orderId: existingInbound.orderId,
                status: { not: 'completed' },
              },
            });

            // 如果所有明细都已完成，更新订单状态
            if (pendingItems.length === 0) {
              await tx.purchaseOrder.update({
                where: { id: existingInbound.orderId },
                data: { status: 'completed' },
              });
            } else {
              await tx.purchaseOrder.update({
                where: { id: existingInbound.orderId },
                data: { status: 'partial' },
              });
            }
          }
        }
      }

      return updatedInbound;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'purchase_inbound',
      resource: id,
      detail: JSON.stringify({ action: 'confirm', status: 'confirmed' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: confirmedInbound,
      message: '采购入库单确认成功，库存已更新',
    });
  } catch (error) {
    console.error('确认采购入库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '确认采购入库单失败',
    });
  }
};

/**
 * 反确认采购入库单（已确认 → 草稿，同时扣减库存）
 * POST /api/v1/purchase-inbounds/:id/unconfirm
 */
export const unconfirmPurchaseInbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查入库单是否存在
    const existingInbound = await prisma.purchaseInbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        details: true,
        warehouse: true,
      },
    });

    if (!existingInbound) {
      return res.status(404).json({
        success: false,
        message: '采购入库单不存在',
      });
    }

    // 只有已确认状态可以反确认
    if (existingInbound.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: '只有已确认状态可以反确认',
      });
    }

    // 反确认入库单（事务：更新状态 + 扣减库存 + 更新订单已入库数量）
    const unconfirmedInbound = await prisma.$transaction(async (tx) => {
      // 1. 更新入库单状态为草稿
      const updatedInbound = await tx.purchaseInbound.update({
        where: { id },
        data: { status: 'draft' },
      });

      // 2. 扣减库存
      for (const detail of existingInbound.details) {
        // 查找库存记录
        const existingInventory = await tx.inventoryItem.findFirst({
          where: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingInbound.warehouseId,
            batchNo: detail.batchNo || null,
          },
        });

        if (existingInventory) {
          // 扣减库存
          const newQty = existingInventory.quantity - detail.quantity;
          await tx.inventoryItem.update({
            where: { id: existingInventory.id },
            data: {
              quantity: newQty > 0 ? newQty : 0,
            },
          });

          // 如果库存为0，删除库存记录
          if (newQty <= 0) {
            await tx.inventoryItem.delete({
              where: { id: existingInventory.id },
            });
          }
        }

        // 3. 记录库存变动日志（负数表示减少）
        await tx.inventoryLog.create({
          data: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingInbound.warehouseId,
            batchNo: detail.batchNo,
            changeType: 'purchase_inbound_unconfirm',
            changeQty: -detail.quantity,
            beforeQty: existingInventory ? existingInventory.quantity : 0,
            afterQty: existingInventory ? Math.max(0, existingInventory.quantity - detail.quantity) : 0,
            relatedOrderNo: existingInbound.inboundNo,
            remark: `反确认入库: ${existingInbound.inboundNo}`,
          },
        });

        // 4. 如果关联采购订单，更新订单明细的已入库数量
        if (existingInbound.orderId) {
          const orderItem = await tx.purchaseOrderItem.findFirst({
            where: {
              orderId: existingInbound.orderId,
              productId: detail.productId,
            },
          });

          if (orderItem) {
            const newReceivedQty = Math.max(0, orderItem.receivedQty - detail.quantity);
            const newStatus = newReceivedQty === 0 ? 'draft' : (newReceivedQty >= orderItem.quantity ? 'completed' : 'partial');

            await tx.purchaseOrderItem.update({
              where: { id: orderItem.id },
              data: {
                receivedQty: newReceivedQty,
                status: newStatus,
              },
            });

            // 检查并更新订单状态
            const pendingItems = await tx.purchaseOrderItem.findMany({
              where: {
                orderId: existingInbound.orderId,
                status: { in: ['confirmed', 'partial'] },
              },
            });

            // 如果有部分入库的明细，更新订单状态
            if (pendingItems.length > 0 || newReceivedQty > 0) {
              await tx.purchaseOrder.update({
                where: { id: existingInbound.orderId },
                data: { status: 'partial' },
              });
            } else {
              await tx.purchaseOrder.update({
                where: { id: existingInbound.orderId },
                data: { status: 'confirmed' },
              });
            }
          }
        }
      }

      return updatedInbound;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'purchase_inbound',
      resource: id,
      detail: JSON.stringify({ action: 'unconfirm', status: 'draft' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: unconfirmedInbound,
      message: '采购入库单反确认成功，库存已扣减',
    });
  } catch (error) {
    console.error('反确认采购入库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '反确认采购入库单失败',
    });
  }
};

/**
 * 更新采购入库单（仅草稿状态）
 * PUT /api/v1/purchase-inbounds/:id
 */
export const updatePurchaseInbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      inboundNo,
      orderId,
      supplierId,
      warehouseId,
      inboundDate,
      remark,
      logisticsCost,
      details,
    } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查入库单是否存在
    const existingInbound = await prisma.purchaseInbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        details: true,
      },
    });

    if (!existingInbound) {
      return res.status(404).json({
        success: false,
        message: '采购入库单不存在',
      });
    }

    // 只有草稿状态可以修改
    if (existingInbound.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以修改',
      });
    }

    // 如果修改入库单编号，检查是否已存在
    if (inboundNo && inboundNo !== existingInbound.inboundNo) {
      const inboundNoExists = await prisma.purchaseInbound.findFirst({
        where: {
          tenantId: req.user.tenantId,
          inboundNo,
          id: { not: id },
        },
      });

      if (inboundNoExists) {
        return res.status(400).json({
          success: false,
          message: '入库单编号已存在',
        });
      }
    }

    // 如果修改关联订单，检查是否存在
    if (orderId && orderId !== existingInbound.orderId) {
      const order = await prisma.purchaseOrder.findFirst({
        where: {
          id: orderId,
          tenantId: req.user.tenantId,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: '采购订单不存在',
        });
      }
    }

    // 如果修改仓库，检查是否存在
    if (warehouseId && warehouseId !== existingInbound.warehouseId) {
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
    if (inboundNo !== undefined) updateData.inboundNo = inboundNo;
    if (orderId !== undefined) updateData.orderId = orderId;
    if (supplierId !== undefined) updateData.supplierId = supplierId;
    if (warehouseId !== undefined) updateData.warehouseId = warehouseId;
    if (inboundDate !== undefined) updateData.inboundDate = new Date(inboundDate);
    if (remark !== undefined) updateData.remark = remark;
    if (logisticsCost !== undefined) updateData.logisticsCost = logisticsCost;

    // 如果有明细，更新明细
    if (details && Array.isArray(details)) {
      // 验证明细并计算金额
      for (const detail of details) {
        if (!detail.productId || !detail.quantity || !detail.unitPrice) {
          return res.status(400).json({
            success: false,
            message: '入库明细必须包含商品ID、数量和单价',
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
      const finalLogisticsCost = logisticsCost !== undefined ? logisticsCost : existingInbound.logisticsCost || 0;
      const totalAmount = details.reduce((sum: number, detail: any) => sum + detail.amount, 0) + finalLogisticsCost;
      
      updateData.totalAmount = totalAmount;

      // 更新入库单和明细（事务）
      await prisma.$transaction(async (tx) => {
        // 更新入库单主表
        await tx.purchaseInbound.update({
          where: { id },
          data: updateData,
        });

        // 删除旧明细
        await tx.purchaseInboundDetail.deleteMany({
          where: { inboundId: id },
        });

        // 创建新明细
        for (const detail of details) {
          await tx.purchaseInboundDetail.create({
            data: {
              inboundId: id,
              productId: detail.productId,
              quantity: detail.quantity,
              unitPrice: detail.unitPrice,
              amount: detail.amount,
              batchNo: detail.batchNo,
              productionDate: detail.productionDate ? new Date(detail.productionDate) : null,
              expiryDate: detail.expiryDate ? new Date(detail.expiryDate) : null,
            },
          });
        }
      });
    } else {
      // 只更新主表
      await prisma.purchaseInbound.update({
        where: { id },
        data: updateData,
      });
    }

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'purchase_inbound',
      resource: id,
      detail: JSON.stringify({ inboundNo, orderId, warehouseId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的入库单信息
    const updatedInbound = await prisma.purchaseInbound.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            supplier: {
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
      data: updatedInbound,
      message: '采购入库单更新成功',
    });
  } catch (error) {
    console.error('更新采购入库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新采购入库单失败',
    });
  }
};

/**
 * 删除采购入库单（仅草稿状态）
 * DELETE /api/v1/purchase-inbounds/:id
 */
export const deletePurchaseInbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查入库单是否存在
    const existingInbound = await prisma.purchaseInbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingInbound) {
      return res.status(404).json({
        success: false,
        message: '采购入库单不存在',
      });
    }

    // 只有草稿状态可以删除
    if (existingInbound.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以删除',
      });
    }

    // 删除入库单（级联删除明细）
    await prisma.purchaseInbound.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'purchase_inbound',
      resource: id,
      detail: JSON.stringify({ inboundNo: existingInbound.inboundNo, orderId: existingInbound.orderId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '采购入库单删除成功',
    });
  } catch (error) {
    console.error('删除采购入库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除采购入库单失败',
    });
  }
};

/**
 * 导入采购入库单
 * POST /api/v1/purchase-inbounds/import
 */
export const importPurchaseInbounds = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const items = req.body as any[];
    console.log('导入采购入库单 - 接收到的数据:', JSON.stringify(items, null, 2));

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: '数据格式错误，期望数组格式' });
    }

    const errors: Array<{ row: number; message: string }> = [];
    const successItems: any[] = [];

    // 按入库单号分组
    const inboundGroups = new Map<string, any[]>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      console.log(`处理第${row}行数据:`, JSON.stringify(item, null, 2));

      if (item.warehouseError) rowErrors.push(item.warehouseError);
      if (item.productError) rowErrors.push(item.productError);
      if (item.orderError) rowErrors.push(item.orderError);

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      if (!item.warehouseId) rowErrors.push('仓库不能为空');
      if (!item.productId) rowErrors.push('物料不能为空');
      if (!item.quantity) rowErrors.push('数量不能为空');
      if (!item.inboundNo) rowErrors.push('入库单号不能为空');
      if (!item.inboundDate) rowErrors.push('入库日期不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      const inboundNo = item.inboundNo || `PI${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // 按入库单号分组
      if (!inboundGroups.has(inboundNo)) {
        inboundGroups.set(inboundNo, []);
      }
      inboundGroups.get(inboundNo)!.push(item);
    }

    // 为每个入库单组创建入库单
    for (const [inboundNo, inboundItems] of inboundGroups.entries()) {
      try {
        const firstItem = inboundItems[0];
        const inboundDate = firstItem.inboundDate ? new Date(firstItem.inboundDate) : new Date();

        console.log(`创建入库单 ${inboundNo}, 仓库ID: ${firstItem.warehouseId}, 明细数量: ${inboundItems.length}`);

        // 检查入库单号是否已存在
        const existingInbound = await prisma.purchaseInbound.findFirst({
          where: {
            tenantId,
            inboundNo,
          },
          include: {
            details: true
          }
        });

        if (existingInbound) {
          console.log(`入库单号 ${inboundNo} 已存在，尝试合并明细`);
          
          try {
            // 计算新明细的金额（优先使用前端传入的金额）
            let newTotalAmount = 0;
            const newItemsData = inboundItems.map(item => {
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
                productionDate: item.productionDate ? new Date(item.productionDate) : null,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              };
            });

            // 计算现有入库单的明细金额
            const existingTotalAmount = existingInbound.details.reduce((sum, item) => {
              return sum + Number(item.amount);
            }, 0);

            // 更新入库单，添加新明细，并确保状态为已确认（事务：更新单据 + 更新库存）
            const updatedInbound = await prisma.$transaction(async (tx) => {
              const result = await tx.purchaseInbound.update({
                where: { id: existingInbound.id },
                data: {
                  totalAmount: existingTotalAmount + newTotalAmount,
                  status: 'confirmed',
                  creatorId: req.user.id,
                  details: {
                    create: newItemsData
                  }
                },
                include: {
                  order: {
                    select: {
                      id: true,
                      orderNo: true,
                      supplier: {
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

              // 只对新合并的明细更新库存
              for (const item of newItemsData) {
                const existingInventory = await tx.inventoryItem.findFirst({
                  where: {
                    tenantId,
                    productId: item.productId,
                    warehouseId: existingInbound.warehouseId,
                    batchNo: item.batchNo || null,
                  },
                });

                if (existingInventory) {
                  const totalCost = item.unitPrice * item.quantity;
                  const newCostPrice = (existingInventory.costPrice * existingInventory.quantity + totalCost) / (existingInventory.quantity + item.quantity);
                  await tx.inventoryItem.update({
                    where: { id: existingInventory.id },
                    data: {
                      quantity: existingInventory.quantity + item.quantity,
                      costPrice: newCostPrice,
                    },
                  });
                } else {
                  // 使用 upsert 避免并发时的唯一约束冲突
                  const totalCost = item.unitPrice * item.quantity;
                  await tx.inventoryItem.upsert({
                    where: {
                      tenantId_productId_warehouseId_batchNo: {
                        tenantId,
                        productId: item.productId,
                        warehouseId: existingInbound.warehouseId,
                        batchNo: item.batchNo || '',
                      },
                    },
                    update: {
                      quantity: { increment: item.quantity },
                      costPrice: totalCost,
                    },
                    create: {
                      tenantId,
                      productId: item.productId,
                      warehouseId: existingInbound.warehouseId,
                      batchNo: item.batchNo,
                      quantity: item.quantity,
                      costPrice: item.unitPrice,
                    },
                  });
                }

                // 记录库存变动日志
                await tx.inventoryLog.create({
                  data: {
                    tenantId,
                    productId: item.productId,
                    warehouseId: existingInbound.warehouseId,
                    batchNo: item.batchNo,
                    changeType: 'purchase_inbound',
                    changeQty: item.quantity,
                    beforeQty: existingInventory ? existingInventory.quantity : 0,
                    afterQty: existingInventory ? existingInventory.quantity + item.quantity : item.quantity,
                    relatedOrderNo: inboundNo,
                    remark: `采购入库(导入合并): ${inboundNo}`,
                  },
                });

                // 如果关联采购订单，更新订单明细的已入库数量
                if (existingInbound.orderId) {
                  const orderItem = await tx.purchaseOrderItem.findFirst({
                    where: {
                      orderId: existingInbound.orderId,
                      productId: item.productId,
                    },
                  });

                  if (orderItem) {
                    const newReceivedQty = orderItem.receivedQty + item.quantity;
                    const newStatus = newReceivedQty >= orderItem.quantity ? 'completed' : 'partial';

                    await tx.purchaseOrderItem.update({
                      where: { id: orderItem.id },
                      data: {
                        receivedQty: newReceivedQty,
                        status: newStatus,
                      },
                    });

                    const pendingItems = await tx.purchaseOrderItem.findMany({
                      where: {
                        orderId: existingInbound.orderId,
                        status: { not: 'completed' },
                      },
                    });

                    if (pendingItems.length === 0) {
                      await tx.purchaseOrder.update({
                        where: { id: existingInbound.orderId },
                        data: { status: 'completed' },
                      });
                    } else {
                      await tx.purchaseOrder.update({
                        where: { id: existingInbound.orderId },
                        data: { status: 'partial' },
                      });
                    }
                  }
                }
              }

              return result;
            });

            successItems.push(updatedInbound);
            console.log(`入库单 ${inboundNo} 明细合并成功`);
            continue;
          } catch (mergeError) {
            console.error(`合并入库单 ${inboundNo} 明细失败:`, mergeError);
            // 找到这个入库单的所有行号
            const affectedRows = items.map((item, index) => 
              item.inboundNo === inboundNo ? index + 1 : -1
            ).filter(row => row > 0);
            
            affectedRows.forEach(row => {
              errors.push({ row, message: `合并入库单 ${inboundNo} 明细失败: ${mergeError instanceof Error ? mergeError.message : '未知错误'}` });
            });
            continue;
          }
        }

        // 计算总金额（优先使用前端传入的金额）
        let totalAmount = 0;
        const itemsData = inboundItems.map(item => {
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
            productionDate: item.productionDate ? new Date(item.productionDate) : null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          };
        });

        // 使用事务：创建入库单 + 更新库存 + 记录日志 + 更新订单
        const inbound = await prisma.$transaction(async (tx) => {
          const newInbound = await tx.purchaseInbound.create({
            data: {
              tenantId,
              inboundNo,
              orderId: firstItem.orderId,
              supplierId: firstItem.supplierId || undefined,
              warehouseId: firstItem.warehouseId,
              inboundDate,
              remark: firstItem.remark || '',
              status: 'confirmed',
              totalAmount: totalAmount,
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
                  supplier: {
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

          // 更新库存
          for (const detail of itemsData) {
            const existingInventory = await tx.inventoryItem.findFirst({
              where: {
                tenantId,
                productId: detail.productId,
                warehouseId: firstItem.warehouseId,
                batchNo: detail.batchNo || null,
              },
            });

            if (existingInventory) {
              const totalCost = detail.unitPrice * detail.quantity;
              const newCostPrice = (existingInventory.costPrice * existingInventory.quantity + totalCost) / (existingInventory.quantity + detail.quantity);
              await tx.inventoryItem.update({
                where: { id: existingInventory.id },
                data: {
                  quantity: existingInventory.quantity + detail.quantity,
                  costPrice: newCostPrice,
                },
              });
            } else {
              // 使用 upsert 避免并发时的唯一约束冲突
              const totalCost = detail.unitPrice * detail.quantity;
              await tx.inventoryItem.upsert({
                where: {
                  tenantId_productId_warehouseId_batchNo: {
                    tenantId,
                    productId: detail.productId,
                    warehouseId: firstItem.warehouseId,
                    batchNo: detail.batchNo || '',
                  },
                },
                update: {
                  quantity: { increment: detail.quantity },
                  costPrice: totalCost,
                },
                create: {
                  tenantId,
                  productId: detail.productId,
                  warehouseId: firstItem.warehouseId,
                  batchNo: detail.batchNo,
                  quantity: detail.quantity,
                  costPrice: detail.unitPrice,
                },
              });
            }

            // 记录库存变动日志
            await tx.inventoryLog.create({
              data: {
                tenantId,
                productId: detail.productId,
                warehouseId: firstItem.warehouseId,
                batchNo: detail.batchNo,
                changeType: 'purchase_inbound',
                changeQty: detail.quantity,
                beforeQty: existingInventory ? existingInventory.quantity : 0,
                afterQty: existingInventory ? existingInventory.quantity + detail.quantity : detail.quantity,
                relatedOrderNo: inboundNo,
                remark: `采购入库: ${inboundNo}`,
              },
            });

            // 如果关联采购订单，更新订单明细的已入库数量
            if (firstItem.orderId) {
              const orderItem = await tx.purchaseOrderItem.findFirst({
                where: {
                  orderId: firstItem.orderId,
                  productId: detail.productId,
                },
              });

              if (orderItem) {
                const newReceivedQty = orderItem.receivedQty + detail.quantity;
                const newStatus = newReceivedQty >= orderItem.quantity ? 'completed' : 'partial';

                await tx.purchaseOrderItem.update({
                  where: { id: orderItem.id },
                  data: {
                    receivedQty: newReceivedQty,
                    status: newStatus,
                  },
                });

                const pendingItems = await tx.purchaseOrderItem.findMany({
                  where: {
                    orderId: firstItem.orderId,
                    status: { not: 'completed' },
                  },
                });

                if (pendingItems.length === 0) {
                  await tx.purchaseOrder.update({
                    where: { id: firstItem.orderId },
                    data: { status: 'completed' },
                  });
                } else {
                  await tx.purchaseOrder.update({
                    where: { id: firstItem.orderId },
                    data: { status: 'partial' },
                  });
                }
              }
            }
          }

          return newInbound;
        });

        successItems.push(inbound);
      } catch (error) {
        console.error(`创建入库单 ${inboundNo} 失败:`, error);
        // 找到这个入库单的所有行号
        const affectedRows = items.map((item, index) => 
          item.inboundNo === inboundNo ? index + 1 : -1
        ).filter(row => row > 0);
        
        affectedRows.forEach(row => {
          errors.push({ row, message: `入库单 ${inboundNo} 创建失败: ${error instanceof Error ? error.message : '未知错误'}` });
        });
      }
    }

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'import',
      module: 'purchase_inbound',
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
    console.error('导入采购入库单失败:', error);
    res.status(500).json({
      success: false,
      message: '导入采购入库单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
};

export default {
  getPurchaseInbounds,
  getPurchaseInboundById,
  createPurchaseInbound,
  updatePurchaseInbound,
  confirmPurchaseInbound,
  unconfirmPurchaseInbound,
  deletePurchaseInbound,
  importPurchaseInbounds,
};