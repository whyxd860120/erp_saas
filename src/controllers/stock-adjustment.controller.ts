import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 创建库存调整单
 */
export const createStockAdjustment = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { warehouseId, type, reason, remark, details } = req.body;

    // 生成调整单号
    const adjustmentNo = `ST${Date.now().toString().slice(-10)}`;

    // 创建调整单
    const adjustment = await prisma.$transaction(async (tx) => {
      const newAdjustment = await tx.stockAdjustment.create({
        data: {
          tenantId: req.user.tenantId,
          adjustmentNo,
          warehouseId,
          type,
          adjustmentDate: new Date(),
          status: 'draft',
          reason,
          remark
        }
      });

      // 创建明细
      if (details && details.length > 0) {
        await tx.stockAdjustmentDetail.createMany({
          data: details.map(detail => ({
            adjustmentId: newAdjustment.id,
            productId: detail.productId,
            batchNo: detail.batchNo,
            adjustQty: detail.quantity,
            adjustType: detail.quantity >= 0 ? 'increase' : 'decrease',
            unitPrice: detail.unitPrice || 0,
            amount: Math.abs(detail.quantity) * (detail.unitPrice || 0),
            remark: detail.remark
          }))
        });
      }

      return newAdjustment;
    });

    return res.status(201).json({
      success: true,
      data: adjustment,
      message: '库存调整单创建成功'
    });
  } catch (error) {
    console.error('创建库存调整单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建库存调整单失败'
    });
  }
};

/**
 * 确认库存调整单（实际扣减/增加库存）
 */
export const confirmStockAdjustment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
      include: { details: true }
    });

    if (!adjustment) {
      return res.status(404).json({ success: false, message: '调整单不存在' });
    }

    if (adjustment.status !== 'draft') {
      return res.status(400).json({ success: false, message: '只能确认草稿状态的调整单' });
    }

    // 更新库存
    await prisma.$transaction(async (tx) => {
      for (const detail of adjustment.details) {
        const inventory = await tx.inventoryItem.findFirst({
          where: {
            tenantId: adjustment.tenantId,
            productId: detail.productId,
            warehouseId: adjustment.warehouseId,
            batchNo: detail.batchNo
          }
        });

        if (inventory) {
          await tx.inventoryItem.update({
            where: { id: inventory.id },
            data: {
              quantity: { increment: detail.adjustQty }
            }
          });

          // 检查是否需要标记为过期
          if (inventory.expiryDate && inventory.expiryDate < new Date()) {
            await tx.inventoryItem.update({
              where: { id: inventory.id },
              data: { status: 'expired' }
            });
          }
        } else if (detail.adjustQty > 0) {
          // 新增库存 - 使用 upsert 避免并发时的唯一约束冲突
          await tx.inventoryItem.upsert({
            where: {
              tenantId_productId_warehouseId_batchNo: {
                tenantId: adjustment.tenantId,
                productId: detail.productId,
                warehouseId: adjustment.warehouseId,
                batchNo: detail.batchNo || '',
              },
            },
            update: {
              quantity: { increment: detail.adjustQty },
            },
            create: {
              tenantId: adjustment.tenantId,
              productId: detail.productId,
              warehouseId: adjustment.warehouseId,
              batchNo: detail.batchNo,
              quantity: detail.adjustQty,
              costPrice: detail.unitPrice,
              status: 'normal'
            }
          });
        }
      }

      // 更新调整单状态
      await tx.stockAdjustment.update({
        where: { id },
        data: { status: 'confirmed' }
      });
    });

    return res.json({
      success: true,
      message: '库存调整确认成功'
    });
  } catch (error) {
    console.error('确认库存调整错误:', error);
    return res.status(500).json({
      success: false,
      message: '确认库存调整失败'
    });
  }
};

export const getStockAdjustments = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { page = '1', limit = '10', type, status } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const where: any = { tenantId: req.user.tenantId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [adjustments, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        include: {
          warehouse: { select: { name: true } },
          details: {
            include: { product: { select: { name: true, code: true } } }
          }
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.stockAdjustment.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        items: adjustments,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('获取库存调整列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取库存调整列表失败'
    });
  }
};

export default {
  createStockAdjustment,
  confirmStockAdjustment,
  getStockAdjustments
};