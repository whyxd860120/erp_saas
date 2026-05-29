import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
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
 * 获取调拨单列表
 * GET /api/v1/stock-transfers
 */
export const getStockTransfers = async (req: Request, res: Response) => {
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
      fromWarehouseId,
      toWarehouseId,
      transferNo,
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

    if (status) {
      where.status = status;
    }

    if (fromWarehouseId) {
      where.fromWarehouseId = fromWarehouseId;
    }

    if (toWarehouseId) {
      where.toWarehouseId = toWarehouseId;
    }

    if (transferNo) {
      where.transferNo = { contains: transferNo as string };
    }

    if (startDate || endDate) {
      where.transferDate = {};
      if (startDate) {
        where.transferDate.gte = parseDateStart(startDate as string);
      }
      if (endDate) {
        where.transferDate.lte = parseDateEnd(endDate as string);
      }
    }

    // 查询调拨单列表
    const [transfers, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        where,
        include: {
          fromWarehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          toWarehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
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
        orderBy: { transferDate: 'desc' },
      }),
      prisma.stockTransfer.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: transfers,
        total,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('获取调拨单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取调拨单列表失败',
    });
  }
};

/**
 * 获取调拨单详情
 * GET /api/v1/stock-transfers/:id
 */
export const getStockTransferById = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { id } = req.params;

    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        createdBy: {
          select: {
            id: true,
            username: true,
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

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: '调拨单不存在',
      });
    }

    return res.json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    console.error('获取调拨单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取调拨单详情失败',
    });
  }
};

/**
 * 创建调拨单
 * POST /api/v1/stock-transfers
 */
export const createStockTransfer = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      transferNo,
      fromWarehouseId,
      toWarehouseId,
      transferDate = new Date(),
      remark,
      details,
    } = req.body;

    // 如果没有传入编号，自动生成
    let generatedTransferNo = transferNo;
    if (!generatedTransferNo) {
      try {
        // 查找编码规则
        const rule = await prisma.numberingRule.findFirst({
          where: {
            tenantId: req.user.tenantId,
            businessType: 'stock_transfer',
            status: 'active',
          },
        });

        if (rule) {
          // 生成编号
          const now = new Date();
          const dateStr = formatDateForRule(now, rule.dateFormat);
          const sequenceStr = String(rule.currentNumber + 1).padStart(rule.sequenceLength, '0');
          generatedTransferNo = `${rule.prefix}${rule.separator}${dateStr}${rule.separator}${sequenceStr}`;

          // 更新序号
          await prisma.numberingRule.update({
            where: { id: rule.id },
            data: { currentNumber: rule.currentNumber + 1 },
          });
        } else {
          // 没有规则，生成简单编号
          generatedTransferNo = `ST-${Date.now()}`;
        }
      } catch (numError) {
        console.error('生成编号失败:', numError);
        generatedTransferNo = `ST-${Date.now()}`;
      }
    }

    // 验证参数
    if (!fromWarehouseId || !toWarehouseId) {
      return res.status(400).json({
        success: false,
        message: '请选择调出仓库和调入仓库',
      });
    }

    if (fromWarehouseId === toWarehouseId) {
      return res.status(400).json({
        success: false,
        message: '调出仓库和调入仓库不能相同',
      });
    }

    if (!details || !Array.isArray(details) || details.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请至少添加一条调拨明细',
      });
    }

    // 检查单据编号是否已存在（同一租户内）
    const existingTransfer = await prisma.stockTransfer.findFirst({
      where: {
        tenantId: req.user.tenantId,
        transferNo: generatedTransferNo,
      },
    });

    if (existingTransfer) {
      return res.status(400).json({
        success: false,
        message: '调拨单编号已存在',
      });
    }

    // 检查仓库是否存在
    const [fromWarehouse, toWarehouse] = await Promise.all([
      prisma.warehouse.findFirst({
        where: {
          id: fromWarehouseId,
          tenantId: req.user.tenantId,
        },
      }),
      prisma.warehouse.findFirst({
        where: {
          id: toWarehouseId,
          tenantId: req.user.tenantId,
        },
      }),
    ]);

    if (!fromWarehouse) {
      return res.status(404).json({
        success: false,
        message: '调出仓库不存在',
      });
    }

    if (!toWarehouse) {
      return res.status(404).json({
        success: false,
        message: '调入仓库不存在',
      });
    }

    // 验证明细
    let totalQty = 0;
    let totalAmount = 0;

    for (const detail of details) {
      if (!detail.productId || !detail.quantity || detail.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: '调拨明细必须包含商品ID和数量',
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
      detail.amount = detail.quantity * (detail.unitCost || 0);
      totalQty += detail.quantity;
      totalAmount += detail.amount;
    }

    // 创建调拨单（事务）
    const transfer = await prisma.$transaction(async (tx) => {
      // 创建调拨单主表
      const newTransfer = await tx.stockTransfer.create({
        data: {
          tenantId: req.user!.tenantId!,
          transferNo: generatedTransferNo,
          fromWarehouseId,
          toWarehouseId,
          transferDate: new Date(transferDate),
          totalQty,
          totalAmount,
          status: 'draft',
          remark,
          createdById: req.user?.id,
        },
      });

      // 创建调拨单明细
      for (const detail of details) {
        await tx.stockTransferDetail.create({
          data: {
            transferId: newTransfer.id,
            productId: detail.productId,
            quantity: detail.quantity,
            unitCost: detail.unitCost || 0,
            amount: detail.amount,
            batchNo: detail.batchNo,
          },
        });
      }

      return newTransfer;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'stock_transfer',
      resource: transfer.id,
      detail: JSON.stringify({ transferNo: generatedTransferNo, fromWarehouseId, toWarehouseId, totalQty, totalAmount }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的调拨单信息
    const createdTransfer = await prisma.stockTransfer.findUnique({
      where: { id: transfer.id },
      include: {
        fromWarehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        toWarehouse: {
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
      message: '创建成功',
      data: createdTransfer,
    });
  } catch (error) {
    console.error('创建调拨单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建调拨单失败',
    });
  }
};

/**
 * 确认调拨单
 * POST /api/v1/stock-transfers/:id/confirm
 */
export const confirmStockTransfer = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { id } = req.params;

    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        details: true,
      },
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: '调拨单不存在',
      });
    }

    if (transfer.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态的调拨单可以确认',
      });
    }

    // 更新库存（调出仓库减库存，调入仓库加库存）
    await prisma.$transaction(async (tx) => {
      // 更新调拨单状态
      await tx.stockTransfer.update({
        where: { id },
        data: { status: 'confirmed' },
      });

      // 处理每个明细的库存
      for (const detail of transfer.details) {
        // 批次号处理：统一使用 NULL 作为空值
        const batchNo = detail.batchNo || null;

        // 1. 从调出仓库扣减库存
        const fromInventory = await tx.inventoryItem.findFirst({
          where: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: transfer.fromWarehouseId,
            OR: [
              { batchNo: batchNo },
              { batchNo: { equals: batchNo } },
            ],
          },
        });

        // P0-2: 校验库存是否充足（防止库存扣成负数）
        let fromQty = 0;
        if (fromInventory) {
          if (fromInventory.quantity < detail.quantity) {
            throw new Error(`调出仓库库存不足，商品ID: ${detail.productId}，可用库存: ${fromInventory.quantity}，需求数量: ${detail.quantity}`);
          }
          fromQty = fromInventory.quantity;
          await tx.inventoryItem.update({
            where: { id: fromInventory.id },
            data: { quantity: fromInventory.quantity - detail.quantity },
          });
        } else {
          // 如果没有批次，先查找或创建默认批次
          const defaultFrom = await tx.inventoryItem.findFirst({
            where: {
              tenantId: req.user!.tenantId!,
              productId: detail.productId,
              warehouseId: transfer.fromWarehouseId,
              batchNo: null,
            },
          });

          if (!defaultFrom) {
            throw new Error(`调出仓库不存在该商品库存，商品ID: ${detail.productId}`);
          }
          if (defaultFrom.quantity < detail.quantity) {
            throw new Error(`调出仓库库存不足，商品ID: ${detail.productId}，可用库存: ${defaultFrom.quantity}，需求数量: ${detail.quantity}`);
          }
          fromQty = defaultFrom.quantity;
          await tx.inventoryItem.update({
            where: { id: defaultFrom.id },
            data: { quantity: defaultFrom.quantity - detail.quantity },
          });
        }

        // 2. 添加库存变动日志（出库）
        await tx.inventoryLog.create({
          data: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: transfer.fromWarehouseId,
            batchNo: detail.batchNo,
            changeType: 'transfer_out',
            changeQty: -detail.quantity,
            beforeQty: fromQty,
            afterQty: fromQty - detail.quantity,
            relatedOrderNo: transfer.transferNo,
          },
        });

        // 3. 向调入仓库添加库存
        const toInventory = await tx.inventoryItem.findFirst({
          where: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: transfer.toWarehouseId,
            OR: [
              { batchNo: batchNo },
              { batchNo: { equals: batchNo } },
            ],
          },
        });

        let toBeforeQty = 0;
        if (toInventory) {
          toBeforeQty = toInventory.quantity;
          await tx.inventoryItem.update({
            where: { id: toInventory.id },
            data: { quantity: toInventory.quantity + detail.quantity },
          });
        } else {
          // 使用 upsert 避免并发时的唯一约束冲突
          await tx.inventoryItem.upsert({
            where: {
              tenantId_productId_warehouseId_batchNo: {
                tenantId: req.user!.tenantId!,
                productId: detail.productId,
                warehouseId: transfer.toWarehouseId,
                batchNo: batchNo || '',
              },
            },
            update: {
              quantity: { increment: detail.quantity },
            },
            create: {
              tenantId: req.user!.tenantId!,
              productId: detail.productId,
              warehouseId: transfer.toWarehouseId,
              batchNo: batchNo,
              quantity: detail.quantity,
              costPrice: detail.unitCost,
            },
          });
        }

        // 4. 添加库存变动日志（入库）
        await tx.inventoryLog.create({
          data: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: transfer.toWarehouseId,
            batchNo: detail.batchNo,
            changeType: 'transfer_in',
            changeQty: detail.quantity,
            beforeQty: toBeforeQty,
            afterQty: toBeforeQty + detail.quantity,
            relatedOrderNo: transfer.transferNo,
          },
        });
      }
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'confirm',
      module: 'stock_transfer',
      resource: id,
      detail: JSON.stringify({ transferNo: transfer.transferNo }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '确认成功，库存已调整',
    });
  } catch (error) {
    console.error('确认调拨单错误:', error);
    return res.status(500).json({
      success: false,
      message: '确认调拨单失败',
    });
  }
};

/**
 * 取消调拨单
 * POST /api/v1/stock-transfers/:id/cancel
 */
export const cancelStockTransfer = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { id } = req.params;

    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: '调拨单不存在',
      });
    }

    if (transfer.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '调拨单已取消',
      });
    }

    // 更新状态
    await prisma.stockTransfer.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'cancel',
      module: 'stock_transfer',
      resource: id,
      detail: JSON.stringify({ transferNo: transfer.transferNo }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '取消成功',
    });
  } catch (error) {
    console.error('取消调拨单错误:', error);
    return res.status(500).json({
      success: false,
      message: '取消调拨单失败',
    });
  }
};

/**
 * 删除调拨单
 * DELETE /api/v1/stock-transfers/:id
 */
export const deleteStockTransfer = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { id } = req.params;

    const transfer = await prisma.stockTransfer.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: '调拨单不存在',
      });
    }

    if (transfer.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: '已确认的调拨单不能删除',
      });
    }

    // 删除调拨单（级联删除明细）
    await prisma.stockTransfer.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'stock_transfer',
      resource: id,
      detail: JSON.stringify({ transferNo: transfer.transferNo }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除调拨单错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除调拨单失败',
    });
  }
};