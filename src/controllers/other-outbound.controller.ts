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
 * 获取其他出库单列表
 * GET /api/v1/other-outbound
 */
export const getOtherOutbounds = async (req: Request, res: Response) => {
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
      outboundType,
      outboundNo,
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

    if (outboundType) {
      where.outboundType = outboundType;
    }

    if (outboundNo) {
      where.outboundNo = { contains: outboundNo as string };
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

    // 查询出库单列表
    const [outbounds, total] = await Promise.all([
      prisma.otherOutbound.findMany({
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
        orderBy: { outboundDate: 'desc' },
      }),
      prisma.otherOutbound.count({ where }),
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
    console.error('获取其他出库单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取其他出库单列表失败',
    });
  }
};

/**
 * 获取其他出库单详情
 * GET /api/v1/other-outbound/:id
 */
export const getOtherOutboundDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const outbound = await prisma.otherOutbound.findFirst({
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

    if (!outbound) {
      return res.status(404).json({
        success: false,
        message: '其他出库单不存在',
      });
    }

    // 解析SN码列表
    const detailsWithParsedSN = outbound.details.map(detail => {
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
        outbound,
        details: detailsWithParsedSN,
      },
    });
  } catch (error) {
    console.error('获取其他出库单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取其他出库单详情失败',
    });
  }
};

/**
 * 创建其他出库单
 * POST /api/v1/other-outbound
 */
export const createOtherOutbound = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      outboundNo,
      warehouseId,
      outboundType = 'other',
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
            businessType: 'other_outbound',
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
          generatedOutboundNo = `OO-${Date.now()}`;
        }
      } catch (numError) {
        console.error('生成编号失败:', numError);
        generatedOutboundNo = `OO-${Date.now()}`;
      }
    }

    // 验证参数（仓库和明细必填）
    if (!warehouseId || !details || !Array.isArray(details) || details.length === 0) {
      return res.status(400).json({
        success: false,
        message: '仓库和明细不能为空',
      });
    }

    // 检查单据编号是否已存在（同一租户内）
    const existingOutbound = await prisma.otherOutbound.findFirst({
      where: {
        tenantId: req.user.tenantId,
        outboundNo: generatedOutboundNo,
      },
    });

    if (existingOutbound) {
      return res.status(400).json({
        success: false,
        message: '单据编号已存在',
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
    let totalQty = 0;
    let totalAmount = 0;

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

        // SN码数量必须等于出库数量
        if (detail.serialNumbers.length !== detail.quantity) {
          return res.status(400).json({
            success: false,
            message: `商品「${product.name}」的SN码数量(${detail.serialNumbers.length})必须等于出库数量(${detail.quantity})`,
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

        // 检查SN码是否存在且可用
        for (const sn of detail.serialNumbers) {
          const existingSN = await prisma.serialNumber.findFirst({
            where: {
              tenantId: req.user.tenantId,
              serialNumber: sn,
              productId: detail.productId,
              warehouseId,
              status: 'in_stock',
            },
          });

          if (!existingSN) {
            return res.status(400).json({
              success: false,
              message: `SN码「${sn}」不存在或已出库`,
            });
          }

          // 如果启用了批次管理，验证SN码的批次是否匹配
          if (product.enableBatch && detail.batchNo && existingSN.batchNo !== detail.batchNo) {
            return res.status(400).json({
              success: false,
              message: `SN码「${sn}」的批次不匹配`,
            });
          }
        }
      }

      // 计算金额
      detail.amount = detail.quantity * detail.unitPrice;
      detail.snCount = detail.serialNumbers ? detail.serialNumbers.length : 0;
      totalQty += detail.quantity;
      totalAmount += detail.amount;
    }

    // 创建出库单（事务）
    const outbound = await prisma.$transaction(async (tx) => {
      // 创建出库单主表
      const newOutbound = await tx.otherOutbound.create({
        data: {
          tenantId: req.user!.tenantId!,
          outboundNo: generatedOutboundNo,
          warehouseId,
          outboundType,
          outboundDate: new Date(outboundDate),
          totalQty,
          totalAmount,
          status: 'draft',
          remark,
          createdById: req.user!.id,
        },
      });

      // 创建出库单明细
      for (const detail of details) {
        await tx.otherOutboundDetail.create({
          data: {
            tenantId: req.user!.tenantId!,
            outboundId: newOutbound.id,
            productId: detail.productId,
            batchNo: detail.batchNo,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            amount: detail.amount,
            productionDate: detail.productionDate ? new Date(detail.productionDate) : null,
            expiryDate: detail.expiryDate ? new Date(detail.expiryDate) : null,
            serialNumbersList: detail.serialNumbers ? JSON.stringify(detail.serialNumbers) : null,
            snCount: detail.snCount,
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
      module: 'other_outbound',
      resource: outbound.id,
      detail: JSON.stringify({ outboundNo, warehouseId, outboundType, totalQty, totalAmount }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的出库单信息
    const createdOutbound = await getOtherOutboundDetailData(outbound.id, req.user.tenantId);

    return res.status(201).json({
      success: true,
      data: createdOutbound,
      message: '其他出库单创建成功',
    });
  } catch (error) {
    console.error('创建其他出库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建其他出库单失败',
    });
  }
};

/**
 * 确认其他出库单（草稿 → 已确认，同时减少库存）
 * POST /api/v1/other-outbound/:id/confirm
 */
export const confirmOtherOutbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查出库单是否存在
    const existingOutbound = await prisma.otherOutbound.findFirst({
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

    if (!existingOutbound) {
      return res.status(404).json({
        success: false,
        message: '其他出库单不存在',
      });
    }

    // 只有草稿状态可以确认
    if (existingOutbound.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以确认',
      });
    }

    // 确认出库单（事务：更新状态 + 减少库存）
    const confirmedOutbound = await prisma.$transaction(async (tx) => {
      // 1. 更新出库单状态
      const updatedOutbound = await tx.otherOutbound.update({
        where: { id },
        data: {
          status: 'confirmed',
          confirmedById: req.user!.id,
          confirmedAt: new Date(),
        },
      });

      // 2. 减少库存
      for (const detail of existingOutbound.details) {
        // 查找库存记录
        const existingInventory = await tx.inventoryItem.findFirst({
          where: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingOutbound.warehouseId,
            batchNo: detail.batchNo || null,
          },
        });

        if (!existingInventory) {
          throw new Error(`商品「${detail.product.name}」不存在库存记录`);
        }

        // 检查库存是否足够
        if (existingInventory.quantity < detail.quantity) {
          throw new Error(`商品「${detail.product.name}」库存不足，当前库存：${existingInventory.quantity}，需要出库：${detail.quantity}`);
        }

        // 更新库存
        const newQty = existingInventory.quantity - detail.quantity;

        await tx.inventoryItem.update({
          where: { id: existingInventory.id },
          data: {
            quantity: newQty,
          },
        });

        // 3. 记录库存变动日志
        await tx.inventoryLog.create({
          data: {
            tenantId: req.user!.tenantId!,
            productId: detail.productId,
            warehouseId: existingOutbound.warehouseId,
            batchNo: detail.batchNo,
            changeType: 'other_outbound',
            changeQty: -detail.quantity,
            beforeQty: existingInventory.quantity,
            afterQty: newQty,
            relatedOrderNo: existingOutbound.outboundNo,
            remark: `其他出库(${getOutboundTypeText(existingOutbound.outboundType)}): ${existingOutbound.outboundNo}`,
          },
        });

        // 4. 处理SN码
        if (detail.product.enableSN && detail.serialNumbersList && detail.serialNumbersList.length > 0) {
          const serialNumbers = JSON.parse(detail.serialNumbersList as string);
          for (const sn of serialNumbers) {
            await tx.serialNumber.updateMany({
              where: {
                tenantId: req.user!.tenantId!,
                serialNumber: sn,
                productId: detail.productId,
                warehouseId: existingOutbound.warehouseId,
                status: 'in_stock',
              },
              data: {
                status: 'out_stock',
                outboundDetailId: detail.id,
                outboundDate: new Date(),
              },
            });
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
      module: 'other_outbound',
      resource: id,
      detail: JSON.stringify({ action: 'confirm', status: 'confirmed' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: confirmedOutbound,
      message: '其他出库单确认成功，库存已减少',
    });
  } catch (error: any) {
    console.error('确认其他出库单错误:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '确认其他出库单失败',
    });
  }
};

/**
 * 取消其他出库单（仅草稿状态）
 * POST /api/v1/other-outbound/:id/cancel
 */
export const cancelOtherOutbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查出库单是否存在
    const existingOutbound = await prisma.otherOutbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingOutbound) {
      return res.status(404).json({
        success: false,
        message: '其他出库单不存在',
      });
    }

    // 只有草稿状态可以取消
    if (existingOutbound.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以取消',
      });
    }

    // 更新状态为已取消
    await prisma.otherOutbound.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'other_outbound',
      resource: id,
      detail: JSON.stringify({ action: 'cancel', status: 'cancelled' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '其他出库单取消成功',
    });
  } catch (error) {
    console.error('取消其他出库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '取消其他出库单失败',
    });
  }
};

/**
 * 删除其他出库单（仅草稿或已取消状态）
 * DELETE /api/v1/other-outbound/:id
 */
export const deleteOtherOutbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查出库单是否存在
    const existingOutbound = await prisma.otherOutbound.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingOutbound) {
      return res.status(404).json({
        success: false,
        message: '其他出库单不存在',
      });
    }

    // 只有草稿或已取消状态可以删除
    if (existingOutbound.status !== 'draft' && existingOutbound.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '只有草稿或已取消状态可以删除',
      });
    }

    // 删除出库单（级联删除明细）
    await prisma.otherOutbound.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'other_outbound',
      resource: id,
      detail: JSON.stringify({ outboundNo: existingOutbound.outboundNo, warehouseId: existingOutbound.warehouseId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '其他出库单删除成功',
    });
  } catch (error) {
    console.error('删除其他出库单错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除其他出库单失败',
    });
  }
};

/**
 * 辅助函数：获取出库类型文本
 */
function getOutboundTypeText(type: string): string {
  const map: Record<string, string> = {
    return: '退货出库',
    transfer: '调拨出库',
    consumption: '领用出库',
    loss: '报损出库',
    other: '其他出库',
  };
  return map[type] || type;
}

/**
 * 辅助函数：获取其他出库单详情数据
 */
async function getOtherOutboundDetailData(id: string, tenantId: string) {
  const outbound = await prisma.otherOutbound.findFirst({
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

  if (!outbound) {
    return null;
  }

  // 解析SN码列表
  const detailsWithParsedSN = outbound.details.map(detail => {
    return {
      ...detail,
      productCode: detail.product.code,
      productName: detail.product.name,
      serialNumbers: detail.serialNumbersList ? JSON.parse(detail.serialNumbersList as string) : [],
    };
  });

  return {
    outbound,
    details: detailsWithParsedSN,
  };
}

export default {
  getOtherOutbounds,
  getOtherOutboundDetail,
  createOtherOutbound,
  confirmOtherOutbound,
  cancelOtherOutbound,
  deleteOtherOutbound,
};