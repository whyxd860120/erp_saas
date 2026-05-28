import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';
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
          warehouse: {
            select: {
              id: true,
              code: true,
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

    if (!inbound) {
      return res.status(404).json({
        success: false,
        message: '采购入库单不存在',
      });
    }

    return res.json({
      success: true,
      data: inbound,
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

    // 计算总金额
    const totalAmount = details.reduce((sum: number, detail: any) => sum + detail.amount, 0);

    // 创建入库单（事务）
    const inbound = await prisma.$transaction(async (tx) => {
      // 创建入库单主表
      const newInbound = await tx.purchaseInbound.create({
        data: {
          tenantId: req.user!.tenantId!,
          inboundNo: generatedInboundNo,
          orderId,
          warehouseId,
          inboundDate: new Date(inboundDate),
          totalAmount,
          logisticsCost,
          status: 'draft',
          remark,
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
          // 创建新库存记录
          await tx.inventoryItem.create({
            data: {
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

export default {
  getPurchaseInbounds,
  getPurchaseInboundById,
  createPurchaseInbound,
  confirmPurchaseInbound,
  deletePurchaseInbound,
};