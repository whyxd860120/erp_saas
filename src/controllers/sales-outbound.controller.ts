import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';

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

    if (!outbound) {
      return res.status(404).json({
        success: false,
        message: '销售出库单不存在',
      });
    }

    return res.json({
      success: true,
      data: outbound,
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
      warehouseId,
      outboundDate = new Date(),
      remark,
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

    // 如果关联销售订单，检查是否存在
    if (orderId) {
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

      // 检查订单状态
      if (order.status !== 'confirmed' && order.status !== 'partial') {
        return res.status(400).json({
          success: false,
          message: '只有已确认或部分出库的订单可以出库',
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

    // 计算总金额
    const totalAmount = details.reduce((sum: number, detail: any) => sum + detail.amount, 0);

    // 创建出库单（事务）
    const outbound = await prisma.$transaction(async (tx) => {
      // 创建出库单主表
      const newOutbound = await tx.salesOutbound.create({
        data: {
          tenantId: req.user!.tenantId!,
          outboundNo: generatedOutboundNo,
          orderId,
          warehouseId,
          outboundDate: new Date(outboundDate),
          totalAmount,
          status: 'draft',
          remark,
        },
      });

      // 创建出库单明细
      for (const detail of details) {
        await tx.salesOutboundDetail.create({
          data: {
            tenantId: req.user!.tenantId!,
            outboundId: newOutbound.id,
            productId: detail.productId,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            amount: detail.amount,
            batchNo: detail.batchNo,
          },
        });
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
      detail: JSON.stringify({ outboundNo, orderId, warehouseId, totalAmount }),
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
          where: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingOutbound.warehouseId,
            batchNo: detail.batchNo || null,
          },
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

export default {
  getSalesOutbounds,
  getSalesOutboundById,
  createSalesOutbound,
  confirmSalesOutbound,
  deleteSalesOutbound,
};
