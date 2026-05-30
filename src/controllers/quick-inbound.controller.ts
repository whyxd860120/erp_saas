import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 生成下一个编号
 * @param businessType 业务类型
 * @param tenantId 租户ID
 * @returns 生成的编号
 */
async function generateNextNumber(businessType: string, tenantId: string): Promise<string> {
  // 查找规则
  const rule = await prisma.numberingRule.findFirst({
    where: {
      tenantId,
      businessType,
      status: 'active',
    },
  });

  if (!rule) {
    // 如果没有规则，使用默认格式
    const date = new Date();
    const prefix = businessType === 'purchase_inbound' ? 'RK' : 'CG';
    const seq = await prisma.numberingRule.count({
      where: { tenantId, businessType },
    });
    return `${prefix}${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(seq + 1).padStart(4, '0')}`;
  }

  // 更新序号
  const updatedRule = await prisma.numberingRule.update({
    where: { id: rule.id },
    data: {
      currentNumber: {
        increment: 1,
      },
    },
  });

  // 生成编号
  const date = new Date();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(updatedRule.currentNumber).padStart(rule.sequenceLength, '0');

  // 根据日期格式构建编号
  let datePart = '';
  if (rule.dateFormat === 'YYYYMMDD') {
    datePart = `${year}${month}${day}`;
  } else if (rule.dateFormat === 'YYYYMM') {
    datePart = `${year}${month}`;
  } else if (rule.dateFormat === 'YYYY') {
    datePart = `${year}`;
  } else {
    datePart = `${year}${month}${day}`;
  }

  const number = `${rule.prefix}${rule.separator}${datePart}${rule.separator}${seq}`;
  return number;
}

/**
 * 快速入库 - 根据采购订单直接创建入库单
 * POST /api/v1/purchase-orders/:id/quick-inbound
 */
export const quickInbound = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { warehouseId, inboundDate, remark, items } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: '请选择入库仓库',
      });
    }

    // 查询采购订单
    const order = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        items: {
          include: {
            product: true,
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

    // 检查订单状态
    if (order.status === 'draft') {
      return res.status(400).json({
        success: false,
        message: '草稿状态的订单不能入库，请先确认订单',
      });
    }

    if (order.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '该订单已全部入库完成',
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '已取消的订单不能入库',
      });
    }

    // 检查是否已有已确认的入库单覆盖了所有订单物料（防止重复入库）
    const existingConfirmedInbounds = await prisma.purchaseInboundDetail.findMany({
      where: {
        inbound: {
          orderId: id,
          status: 'confirmed',
          tenantId: req.user.tenantId,
        },
      },
    });

    if (existingConfirmedInbounds.length > 0) {
      // 按 productId 汇总已入库数量
      const inboundByProduct = new Map<string, number>();
      for (const d of existingConfirmedInbounds) {
        inboundByProduct.set(d.productId, (inboundByProduct.get(d.productId) || 0) + (d.quantity || 0));
      }

      // 检查是否所有物料都已完全入库
      const allReceived = order.items.every(item => {
        const received = inboundByProduct.get(item.productId) || 0;
        return received >= (item.quantity || 0);
      });

      if (allReceived) {
        return res.status(400).json({
          success: false,
          message: '该订单所有物料已全部入库，无需重复入库',
        });
      }
    }

    // 验证仓库
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

    // 生成入库单号
    const inboundNo = await generateNextNumber('purchase_inbound', req.user.tenantId);

    // 构建入库明细
    let inboundDetails: any[] = [];

    if (items && Array.isArray(items) && items.length > 0) {
      // 使用传入的入库数量
      inboundDetails = items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
        batchNo: item.batchNo,
        productionDate: item.productionDate,
        expiryDate: item.expiryDate,
      }));
    } else {
      // 默认全部入库
      inboundDetails = order.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      }));
    }

    // 计算入库总金额
    const totalAmount = inboundDetails.reduce((sum: number, item: any) => sum + item.amount, 0);

    // 创建入库单（事务）
    const result = await prisma.$transaction(async (tx) => {
      // 创建入库单
      const inbound = await tx.purchaseInbound.create({
        data: {
          tenantId: req.user!.tenantId!,
          inboundNo,
          orderId: id,
          warehouseId,
          inboundDate: inboundDate ? new Date(inboundDate) : new Date(),
          totalAmount,
          remark: remark || '快速入库',
          status: 'confirmed', // 快速入库直接确认
          details: {
            create: inboundDetails.map((detail: any) => ({
              productId: detail.productId,
              quantity: detail.quantity,
              unitPrice: detail.unitPrice,
              amount: detail.amount,
              batchNo: detail.batchNo,
              productionDate: detail.productionDate,
              expiryDate: detail.expiryDate,
            })),
          },
        },
        include: {
          details: {
            include: {
              product: true,
            },
          },
        },
      });

      // 更新库存
      for (const detail of inboundDetails) {
        // 查找或创建库存记录
        const existingInventory = await tx.inventoryItem.findFirst({
          where: {
            productId: detail.productId,
            warehouseId,
            tenantId: req.user!.tenantId!,
          },
        });

        if (existingInventory) {
          // 更新库存数量
          await tx.inventoryItem.update({
            where: { id: existingInventory.id },
            data: {
              quantity: {
                increment: detail.quantity,
              },
            },
          });
        } else {
          // 使用 upsert 避免并发时的唯一约束冲突
          await tx.inventoryItem.upsert({
            where: {
              tenantId_productId_warehouseId_batchNo: {
                tenantId: req.user!.tenantId!,
                productId: detail.productId,
                warehouseId,
                batchNo: '',
              },
            },
            update: {
              quantity: { increment: detail.quantity },
            },
            create: {
              tenantId: req.user!.tenantId!,
              productId: detail.productId,
              warehouseId,
              quantity: detail.quantity,
            },
          });
        }
      }

      // 更新采购订单入库状态（按明细行逐行比较）
      const allInboundDetails = await tx.purchaseInboundDetail.findMany({
        where: {
          inbound: {
            orderId: id,
            tenantId: req.user!.tenantId!,
          },
        },
      });

      // 按 productId 汇总每个物料的已入库数量
      const inboundByProduct = new Map<string, number>();
      for (const d of allInboundDetails) {
        inboundByProduct.set(d.productId, (inboundByProduct.get(d.productId) || 0) + (d.quantity || 0));
      }

      let allCompleted = order.items.length > 0;
      let anyInbound = false;

      for (const item of order.items) {
        const received = inboundByProduct.get(item.productId) || 0;
        if (received > 0) anyInbound = true;
        if (received < (item.quantity || 0)) {
          allCompleted = false;
        }
      }

      let newStatus = order.status;
      if (allCompleted && order.items.length > 0) {
        newStatus = 'completed';
      } else if (anyInbound) {
        newStatus = 'partial';
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
        },
      });

      return inbound;
    });

    return res.json({
      success: true,
      message: '快速入库成功',
      data: result,
    });
  } catch (error: any) {
    console.error('快速入库错误:', error);
    return res.status(500).json({
      success: false,
      message: '快速入库失败: ' + (error.message || '未知错误'),
      error: error.message,
    });
  }
};
