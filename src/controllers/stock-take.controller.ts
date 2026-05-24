import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
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
 * 获取盘点单列表
 * GET /api/v1/stock-take
 */
export const getStockTakes = async (req: Request, res: Response) => {
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
      warehouseId,
      takeNo,
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

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (takeNo) {
      where.takeNo = { contains: takeNo as string };
    }

    if (startDate || endDate) {
      where.takeDate = {};
      if (startDate) {
        where.takeDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.takeDate.lte = new Date(endDate as string);
      }
    }

    // 查询盘点单列表
    const [stockTakes, total] = await Promise.all([
      prisma.stockTake.findMany({
        where,
        include: {
          warehouse: {
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
        orderBy: { takeDate: 'desc' },
      }),
      prisma.stockTake.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: stockTakes,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取盘点单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取盘点单列表失败',
    });
  }
};

/**
 * 获取盘点单详情
 * GET /api/v1/stock-take/:id
 */
export const getStockTakeDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const stockTake = await prisma.stockTake.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        warehouse: {
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
        confirmedBy: {
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
                enableBatch: true,
                enableExpiry: true,
                enableSN: true,
              },
            },
          },
        },
      },
    });

    if (!stockTake) {
      return res.status(404).json({
        success: false,
        message: '盘点单不存在',
      });
    }

    // 解析SN码列表
    const detailsWithParsedSN = stockTake.details.map(detail => {
      return {
        ...detail,
        productCode: detail.product.code,
        productName: detail.product.name,
        serialNumbers: detail.serialNumbersList ? JSON.parse(detail.serialNumbersList as string) : [],
      };
    });

    return res.json({
      success: true,
      data: {
        stockTake,
        details: detailsWithParsedSN,
      },
    });
  } catch (error) {
    console.error('获取盘点单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取盘点单详情失败',
    });
  }
};

/**
 * 创建盘点单
 * POST /api/v1/stock-take
 */
export const createStockTake = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      takeNo,
      warehouseId,
      takeDate = new Date(),
      remark,
      details,
    } = req.body;

    // 如果没有传入编号，自动生成
    let generatedTakeNo = takeNo;
    if (!generatedTakeNo) {
      try {
        // 查找编码规则
        const rule = await prisma.numberingRule.findFirst({
          where: {
            tenantId: req.user.tenantId,
            businessType: 'stock_take',
            status: 'active',
          },
        });

        if (rule) {
          // 生成编号
          const now = new Date();
          const dateStr = formatDateForRule(now, rule.dateFormat);
          const sequenceStr = String(rule.currentNumber + 1).padStart(rule.sequenceLength, '0');
          generatedTakeNo = `${rule.prefix}${rule.separator}${dateStr}${rule.separator}${sequenceStr}`;

          // 更新序号
          await prisma.numberingRule.update({
            where: { id: rule.id },
            data: { currentNumber: rule.currentNumber + 1 },
          });
        } else {
          // 没有规则，生成简单编号
          generatedTakeNo = `ST-${Date.now()}`;
        }
      } catch (numError) {
        console.error('生成编号失败:', numError);
        generatedTakeNo = `ST-${Date.now()}`;
      }
    }

    // 验证参数（仓库和明细必填）
    if (!warehouseId || !details || !Array.isArray(details) || details.length === 0) {
      return res.status(400).json({
        success: false,
        message: '仓库和明细不能为空',
      });
    }

    // 检查盘点单编号是否已存在（同一租户内）
    const existingTake = await prisma.stockTake.findFirst({
      where: {
        tenantId: req.user.tenantId,
        takeNo: generatedTakeNo,
      },
    });

    if (existingTake) {
      return res.status(400).json({
        success: false,
        message: '盘点单编号已存在',
      });
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
      if (!detail.productId || detail.bookQty === undefined || detail.actualQty === undefined) {
        return res.status(400).json({
          success: false,
          message: '盘点明细必须包含商品ID、账面数量和实际数量',
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

      // 验证批次管理
      if (product.enableBatch && !detail.batchNo) {
        return res.status(400).json({
          success: false,
          message: `商品「${product.name}」启用了批次管理，必须填写批次号`,
        });
      }

      // 验证保质期管理
      if (product.enableExpiry && (!detail.productionDate || !detail.expiryDate)) {
        return res.status(400).json({
          success: false,
          message: `商品「${product.name}」启用了保质期管理，必须填写生产日期和有效期`,
        });
      }

      // 验证SN码管理
      if (product.enableSN) {
        if (!detail.serialNumbers || !Array.isArray(detail.serialNumbers) || detail.serialNumbers.length === 0) {
          return res.status(400).json({
            success: false,
            message: `商品「${product.name}」启用了SN码管理，必须填写SN码`,
          });
        }

        // SN码数量必须等于实际数量
        if (detail.serialNumbers.length !== detail.actualQty) {
          return res.status(400).json({
            success: false,
            message: `商品「${product.name}」的SN码数量(${detail.serialNumbers.length})必须等于实际数量(${detail.actualQty})`,
          });
        }

        // 检查SN码是否重复
        const snSet = new Set(detail.serialNumbers);
        if (snSet.size !== detail.serialNumbers.length) {
          return res.status(400).json({
            success: false,
            message: `商品「${product.name}」存在重复的SN码`,
          });
        }
      }

      // 计算差异数量和金额
      detail.diffQty = detail.actualQty - detail.bookQty;
      detail.diffCost = detail.diffQty * (detail.unitCost || 0);
      detail.snCount = detail.serialNumbers ? detail.serialNumbers.length : 0;
    }

    // 计算总差异数量和金额
    const totalDiffQty = details.reduce((sum: number, detail: any) => sum + detail.diffQty, 0);
    const totalDiffCost = details.reduce((sum: number, detail: any) => sum + detail.diffCost, 0);

    // 创建盘点单（事务）
    const stockTake = await prisma.$transaction(async (tx) => {
      // 创建盘点单主表
      const newTake = await tx.stockTake.create({
        data: {
          tenantId: req.user!.tenantId!,
          takeNo: generatedTakeNo,
          warehouseId,
          takeDate: new Date(takeDate),
          status: 'draft',
          totalDiffQty,
          totalDiffCost,
          remark,
          createdById: req.user!.id,
        },
      });

      // 创建盘点单明细
      for (const detail of details) {
        // 获取当前库存记录，获取单位成本
        let unitCost = detail.unitCost || 0;
        if (unitCost === 0) {
          const inventory = await tx.inventoryItem.findFirst({
            where: {
              tenantId: req.user!.tenantId!,
              productId: detail.productId,
              warehouseId,
              batchNo: detail.batchNo || null,
            },
          });
          if (inventory) {
            unitCost = parseFloat(inventory.costPrice.toString());
          }
        }

        const diffQty = detail.actualQty - detail.bookQty;
        const diffCost = diffQty * unitCost;

        await tx.stockTakeDetail.create({
          data: {
            tenantId: req.user!.tenantId!,
            takeId: newTake.id,
            productId: detail.productId,
            batchNo: detail.batchNo,
            bookQty: detail.bookQty,
            actualQty: detail.actualQty,
            diffQty,
            unitCost,
            diffCost,
            productionDate: detail.productionDate ? new Date(detail.productionDate) : null,
            expiryDate: detail.expiryDate ? new Date(detail.expiryDate) : null,
            serialNumbersList: detail.serialNumbers ? JSON.stringify(detail.serialNumbers) : null,
            snCount: detail.serialNumbers ? detail.serialNumbers.length : 0,
          },
        });
      }

      return newTake;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'stock_take',
      resource: stockTake.id,
      detail: JSON.stringify({ takeNo, warehouseId, totalDiffQty, totalDiffCost }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的盘点单信息
    const createdTake = await getStockTakeDetailData(stockTake.id, req.user.tenantId);

    return res.status(201).json({
      success: true,
      data: createdTake,
      message: '盘点单创建成功',
    });
  } catch (error) {
    console.error('创建盘点单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建盘点单失败',
    });
  }
};

/**
 * 确认盘点单（草稿 → 已确认，同时调整库存）
 * POST /api/v1/stock-take/:id/confirm
 */
export const confirmStockTake = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查盘点单是否存在
    const existingTake = await prisma.stockTake.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        details: {
          include: {
            product: true,
          },
        },
        warehouse: true,
      },
    });

    if (!existingTake) {
      return res.status(404).json({
        success: false,
        message: '盘点单不存在',
      });
    }

    // 只有草稿状态可以确认
    if (existingTake.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以确认',
      });
    }

    // 确认盘点单（事务：更新状态 + 调整库存）
    const confirmedTake = await prisma.$transaction(async (tx) => {
      // 1. 更新盘点单状态
      const updatedTake = await tx.stockTake.update({
        where: { id },
        data: {
          status: 'confirmed',
          confirmedById: req.user!.id,
          confirmedAt: new Date(),
        },
      });

      // 2. 根据盘盈盘亏调整库存
      for (const detail of existingTake.details) {
        if (detail.diffQty === 0) {
          continue; // 无差异，跳过
        }

        // 查找库存记录
        const existingInventory = await tx.inventoryItem.findFirst({
          where: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingTake.warehouseId,
            batchNo: detail.batchNo || null,
          },
        });

        const changeType = detail.diffQty > 0 ? 'stock_take_profit' : 'stock_take_loss';

        if (existingInventory) {
          // 盘盈：增加库存；盘亏：减少库存
          const newQty = existingInventory.quantity + detail.diffQty;

          if (newQty < 0) {
            throw new Error(`商品「${detail.product.name}」库存不足，无法盘亏${Math.abs(detail.diffQty)}个`);
          }

          await tx.inventoryItem.update({
            where: { id: existingInventory.id },
            data: {
              quantity: newQty,
            },
          });

          // 记录库存变动日志
          await tx.inventoryLog.create({
            data: {
              tenantId: req.user!.tenantId!,
              productId: detail.productId,
              warehouseId: existingTake.warehouseId,
              batchNo: detail.batchNo,
              changeType,
              changeQty: detail.diffQty,
              beforeQty: existingInventory.quantity,
              afterQty: newQty,
              relatedOrderNo: existingTake.takeNo,
              remark: `盘点${detail.diffQty > 0 ? '盘盈' : '盘亏'}: ${existingTake.takeNo}`,
            },
          });
        } else {
          // 没有库存记录，如果是盘盈则创建新记录
          if (detail.diffQty > 0) {
            await tx.inventoryItem.create({
              data: {
                tenantId: req.user!.tenantId!,
                productId: detail.productId,
                warehouseId: existingTake.warehouseId,
                batchNo: detail.batchNo,
                quantity: detail.diffQty,
                costPrice: detail.unitCost,
                productionDate: detail.productionDate,
                expiryDate: detail.expiryDate,
              },
            });

            // 记录库存变动日志
            await tx.inventoryLog.create({
              data: {
                tenantId: req.user!.tenantId!,
                productId: detail.productId,
                warehouseId: existingTake.warehouseId,
                batchNo: detail.batchNo,
                changeType,
                changeQty: detail.diffQty,
                beforeQty: 0,
                afterQty: detail.diffQty,
                relatedOrderNo: existingTake.takeNo,
                remark: `盘点盘盈: ${existingTake.takeNo}`,
              },
            });
          } else {
            // 没有库存记录且是盘亏，抛出错误
            throw new Error(`商品「${detail.product.name}」不存在库存记录，无法盘亏${Math.abs(detail.diffQty)}个`);
          }
        }

        // 3. 处理SN码
        if (detail.product.enableSN && detail.serialNumbersList && detail.serialNumbersList.length > 0) {
          const serialNumbers = JSON.parse(detail.serialNumbersList as string);
          for (const sn of serialNumbers) {
            const existingSN = await tx.serialNumber.findFirst({
              where: {
                tenantId: req.user!.tenantId!,
                serialNumber: sn,
                productId: detail.productId,
                warehouseId: existingTake.warehouseId,
                status: 'in_stock',
              },
            });

            if (detail.diffQty > 0) {
              // 盘盈：创建SN码记录
              if (!existingSN) {
                await tx.serialNumber.create({
                  data: {
                    tenantId: req.user!.tenantId!,
                    productId: detail.productId,
                    warehouseId: existingTake.warehouseId,
                    serialNumber: sn,
                    status: 'in_stock',
                    batchNo: detail.batchNo,
                    productionDate: detail.productionDate,
                    expiryDate: detail.expiryDate,
                  },
                });
              }
            } else {
              // 盘亏：更新SN码状态
              if (existingSN) {
                await tx.serialNumber.update({
                  where: { id: existingSN.id },
                  data: {
                    status: 'out_stock',
                    outboundDetailId: id, // 关联到盘点单
                    outboundDate: new Date(),
                  },
                });
              }
            }
          }
        }
      }

      return updatedTake;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'stock_take',
      resource: id,
      detail: JSON.stringify({ action: 'confirm', status: 'confirmed' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: confirmedTake,
      message: '盘点单确认成功，库存已调整',
    });
  } catch (error: any) {
    console.error('确认盘点单错误:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '确认盘点单失败',
    });
  }
};

/**
 * 取消盘点单（仅草稿状态）
 * POST /api/v1/stock-take/:id/cancel
 */
export const cancelStockTake = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查盘点单是否存在
    const existingTake = await prisma.stockTake.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingTake) {
      return res.status(404).json({
        success: false,
        message: '盘点单不存在',
      });
    }

    // 只有草稿状态可以取消
    if (existingTake.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以取消',
      });
    }

    // 更新状态为已取消
    await prisma.stockTake.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'stock_take',
      resource: id,
      detail: JSON.stringify({ action: 'cancel', status: 'cancelled' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '盘点单取消成功',
    });
  } catch (error) {
    console.error('取消盘点单错误:', error);
    return res.status(500).json({
      success: false,
      message: '取消盘点单失败',
    });
  }
};

/**
 * 删除盘点单（仅草稿或已取消状态）
 * DELETE /api/v1/stock-take/:id
 */
export const deleteStockTake = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查盘点单是否存在
    const existingTake = await prisma.stockTake.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingTake) {
      return res.status(404).json({
        success: false,
        message: '盘点单不存在',
      });
    }

    // 只有草稿或已取消状态可以删除
    if (existingTake.status !== 'draft' && existingTake.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '只有草稿或已取消状态可以删除',
      });
    }

    // 删除盘点单（级联删除明细）
    await prisma.stockTake.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'stock_take',
      resource: id,
      detail: JSON.stringify({ takeNo: existingTake.takeNo, warehouseId: existingTake.warehouseId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '盘点单删除成功',
    });
  } catch (error) {
    console.error('删除盘点单错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除盘点单失败',
    });
  }
};

/**
 * 获取仓库当前库存（用于盘点参考）
 * GET /api/v1/inventory/warehouse/:warehouseId
 */
export const getWarehouseInventory = async (req: Request, res: Response) => {
  try {
    const { warehouseId } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { productId, batchNo } = req.query;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
      warehouseId,
    };

    if (productId) {
      where.productId = productId;
    }

    if (batchNo) {
      where.batchNo = batchNo;
    }

    // 查询库存
    const inventoryItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            spec: true,
            unit: true,
            enableBatch: true,
            enableExpiry: true,
            enableSN: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 为每个库存项统计SN码数量
    const itemsWithSNCount = await Promise.all(
      inventoryItems.map(async (item) => {
        const snCount = await prisma.serialNumber.count({
          where: {
            tenantId: req.user!.tenantId,
            productId: item.productId,
            warehouseId,
            status: 'in_stock',
            ...(item.batchNo ? { batchNo: item.batchNo } : {}),
          },
        });

        return {
          ...item,
          snCount,
        };
      })
    );

    return res.json({
      success: true,
      data: itemsWithSNCount,
    });
  } catch (error) {
    console.error('获取仓库库存错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取仓库库存失败',
    });
  }
};

/**
 * 辅助函数：获取盘点单详情数据
 */
async function getStockTakeDetailData(id: string, tenantId: string) {
  const stockTake = await prisma.stockTake.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      warehouse: {
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
      confirmedBy: {
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
              enableBatch: true,
              enableExpiry: true,
              enableSN: true,
            },
          },
        },
      },
    },
  });

  if (!stockTake) {
    return null;
  }

  // 解析SN码列表
  const detailsWithParsedSN = stockTake.details.map(detail => {
    return {
      ...detail,
      productCode: detail.product.code,
      productName: detail.product.name,
      serialNumbers: detail.serialNumbers ? JSON.parse(detail.serialNumbers as string) : [],
    };
  });

  return {
    stockTake,
    details: detailsWithParsedSN,
  };
}

export default {
  getStockTakes,
  getStockTakeDetail,
  createStockTake,
  confirmStockTake,
  cancelStockTake,
  deleteStockTake,
  getWarehouseInventory,
};