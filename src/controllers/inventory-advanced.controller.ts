import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 创建序列号
 */
export const createSerialNumber = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { sn, productId, batchNo, warehouseId, warrantyExpireDate, remark } = req.body;

    // 检查SN码是否已存在
    const existing = await prisma.serialNumber.findFirst({
      where: {
        tenantId: req.user.tenantId,
        sn
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '序列号已存在' });
    }

    const serialNumber = await prisma.serialNumber.create({
      data: {
        tenantId: req.user.tenantId,
        sn,
        productId,
        batchNo,
        warehouseId,
        status: 'in_stock',
        warrantyExpireDate: warrantyExpireDate ? new Date(warrantyExpireDate) : null,
        remark
      }
    });

    return res.status(201).json({
      success: true,
      data: serialNumber,
      message: '序列号创建成功'
    });
  } catch (error) {
    console.error('创建序列号错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建序列号失败'
    });
  }
};

/**
 * 批量创建序列号
 */
export const batchCreateSerialNumbers = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { productId, batchNo, warehouseId, prefix, startNo, count, warrantyExpireDate } = req.body;

    const serialNumbers = [];
    
    for (let i = 0; i < count; i++) {
      const sn = `${prefix}${String(parseInt(startNo) + i).padStart(6, '0')}`;
      serialNumbers.push({
        tenantId: req.user.tenantId,
        sn,
        productId,
        batchNo,
        warehouseId,
        status: 'in_stock',
        warrantyExpireDate: warrantyExpireDate ? new Date(warrantyExpireDate) : null
      });
    }

    await prisma.serialNumber.createMany({
      data: serialNumbers
    });

    return res.status(201).json({
      success: true,
      message: `成功创建${count}个序列号`
    });
  } catch (error) {
    console.error('批量创建序列号错误:', error);
    return res.status(500).json({
      success: false,
      message: '批量创建序列号失败'
    });
  }
};

/**
 * 查询序列号
 */
export const getSerialNumbers = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { sn, productId, batchNo, status, warehouseId } = req.query;

    const where: any = { tenantId: req.user.tenantId };
    if (sn) where.sn = { contains: sn as string };
    if (productId) where.productId = productId;
    if (batchNo) where.batchNo = batchNo;
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;

    const serialNumbers = await prisma.serialNumber.findMany({
      where,
      include: {
        product: { select: { name: true, code: true, enableSN: true } },
        warehouse: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: serialNumbers
    });
  } catch (error) {
    console.error('查询序列号错误:', error);
    return res.status(500).json({
      success: false,
      message: '查询序列号失败'
    });
  }
};

/**
 * 更新序列号状态（出库、退货等）
 */
export const updateSerialNumberStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, outboundId, saleDate } = req.body;

    const updateData: any = { status };
    if (outboundId) updateData.outboundId = outboundId;
    if (saleDate) updateData.saleDate = new Date(saleDate);

    const serialNumber = await prisma.serialNumber.update({
      where: { id },
      data: updateData
    });

    return res.json({
      success: true,
      data: serialNumber,
      message: '序列号状态更新成功'
    });
  } catch (error) {
    console.error('更新序列号状态错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新序列号状态失败'
    });
  }
};

/**
 * 保质期预警查询
 */
export const getExpiryWarnings = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { warningDays = 90 } = req.query;
    
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + parseInt(warningDays as string));

    // 查询即将过期的库存
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        expiryDate: { lte: warningDate },
        tenantId: req.user.tenantId
      },
      include: {
        product: { select: { name: true, code: true } },
        warehouse: { select: { name: true } }
      }
    });

    const warnings = inventoryItems.map(item => {
      const daysToExpiry = Math.floor((item.expiryDate!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...item,
        daysToExpiry,
        warningType: daysToExpiry < 0 ? 'expired' : 'warning'
      };
    });

    return res.json({
      success: true,
      data: warnings,
      total: warnings.length
    });
  } catch (error) {
    console.error('查询保质期预警错误:', error);
    return res.status(500).json({
      success: false,
      message: '查询保质期预警失败'
    });
  }
};

/**
 * 供应商绩效计算
 */
export const calculateSupplierPerformance = async (req: Request, res: Response) => {
  try {
    const { supplierId, period = 'monthly' } = req.params;

    // 计算采购订单完成情况
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        status: { in: ['completed', 'partial'] }
      },
      include: {
        items: true,
        inbounds: true
      }
    });

    // 计算评分
    let totalOrders = purchaseOrders.length;
    let onTimeOrders = 0;
    let totalScore = 0;
    let qualityScore = 80; // 默认分
    let deliveryScore = 80; // 默认分
    let serviceScore = 80; // 默认分
    let priceScore = 80; // 默认分

    for (const order of purchaseOrders) {
      // 准时率
      if (order.status === 'completed') {
        onTimeOrders++;
      }

      // 质量评分（基于退货率）
      // TODO: 从退货入库单计算
    }

    const onTimeRate = totalOrders > 0 ? (onTimeOrders / totalOrders) * 100 : 0;
    deliveryScore = Math.min(100, onTimeRate + 20);

    totalScore = (qualityScore + deliveryScore + serviceScore + priceScore) / 4;

    return res.json({
      success: true,
      data: {
        supplierId,
        totalOrders,
        onTimeRate,
        qualityScore,
        deliveryScore,
        serviceScore,
        priceScore,
        totalScore
      }
    });
  } catch (error) {
    console.error('计算供应商绩效错误:', error);
    return res.status(500).json({
      success: false,
      message: '计算供应商绩效失败'
    });
  }
};

export default {
  createSerialNumber,
  batchCreateSerialNumbers,
  getSerialNumbers,
  updateSerialNumberStatus,
  getExpiryWarnings,
  calculateSupplierPerformance
};