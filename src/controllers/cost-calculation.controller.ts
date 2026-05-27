import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 入库成本核算
 * 汇总所有入库产品的数量和金额，计算加权平均成本
 * POST /api/v1/cost-calculation/inbound
 */
export const calculateInboundCost = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { startDate, endDate, warehouseId } = req.body;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
      status: 'confirmed',
      type: 'blue', // 只统计正常入库，不包括退货
    };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (startDate || endDate) {
      where.inboundDate = {};
      if (startDate) {
        where.inboundDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.inboundDate.lte = new Date(endDate);
      }
    }

    // 查询所有入库单明细
    const inboundDetails = await prisma.purchaseInbound.findMany({
      where,
      include: {
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
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        inboundDate: 'asc',
      },
    });

    // 按产品汇总入库数据
    const productMap = new Map();

    for (const inbound of inboundDetails) {
      for (const detail of inbound.details) {
        const productId = detail.productId;
        
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            productId,
            productCode: detail.product?.code,
            productName: detail.product?.name,
            productSpec: detail.product?.spec,
            unit: detail.product?.unit,
            totalQuantity: 0,
            totalAmount: 0,
            avgUnitPrice: 0,
            inboundCount: 0,
            details: [],
          });
        }

        const product = productMap.get(productId);
        const quantity = Number(detail.quantity) || 0;
        const unitPrice = Number(detail.unitPrice) || 0;
        const amount = quantity * unitPrice;

        product.totalQuantity += quantity;
        product.totalAmount += amount;
        product.inboundCount += 1;
        product.details.push({
          inboundNo: inbound.inboundNo,
          inboundDate: inbound.inboundDate,
          warehouseName: inbound.warehouse?.name,
          quantity,
          unitPrice,
          amount,
        });
      }
    }

    // 计算加权平均单价
    const result = Array.from(productMap.values()).map(product => ({
      ...product,
      avgUnitPrice: product.totalQuantity > 0 ? product.totalAmount / product.totalQuantity : 0,
    }));

    // 按产品编码排序
    result.sort((a, b) => a.productCode?.localeCompare(b.productCode));

    return res.json({
      success: true,
      data: {
        items: result,
        totalProducts: result.length,
        totalQuantity: result.reduce((sum, item) => sum + item.totalQuantity, 0),
        totalAmount: result.reduce((sum, item) => sum + item.totalAmount, 0),
      },
    });
  } catch (error) {
    console.error('入库成本核算错误:', error);
    return res.status(500).json({
      success: false,
      message: '入库成本核算失败',
    });
  }
};

/**
 * 存货出库核算
 * 根据期初库存 + 本期入库，按加权平均法计算出库成本
 * POST /api/v1/cost-calculation/outbound
 */
export const calculateOutboundCost = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { startDate, endDate, warehouseId, productId } = req.body;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (productId) {
      where.productId = productId;
    }

    // 查询库存记录
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
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 查询期间内的入库记录（用于计算加权平均成本）
    const inboundWhere: any = {
      tenantId: req.user.tenantId,
      status: 'confirmed',
      type: 'blue',
    };

    if (warehouseId) {
      inboundWhere.warehouseId = warehouseId;
    }

    if (startDate || endDate) {
      inboundWhere.inboundDate = {};
      if (startDate) {
        inboundWhere.inboundDate.gte = new Date(startDate);
      }
      if (endDate) {
        inboundWhere.inboundDate.lte = new Date(endDate);
      }
    }

    const inboundDetails = await prisma.purchaseInbound.findMany({
      where: inboundWhere,
      include: {
        details: true,
      },
    });

    // 查询期间内的出库记录
    const outboundWhere: any = {
      tenantId: req.user.tenantId,
      status: 'confirmed',
      type: 'blue',
    };

    if (warehouseId) {
      outboundWhere.warehouseId = warehouseId;
    }

    if (startDate || endDate) {
      outboundWhere.outboundDate = {};
      if (startDate) {
        outboundWhere.outboundDate.gte = new Date(startDate);
      }
      if (endDate) {
        outboundWhere.outboundDate.lte = new Date(endDate);
      }
    }

    const outboundDetails = await prisma.salesOutbound.findMany({
      where: outboundWhere,
      include: {
        details: true,
      },
    });

    // 按产品计算成本
    const productCostMap = new Map();

    // 处理每个库存项
    for (const item of inventoryItems) {
      const pid = item.productId;
      const wid = item.warehouseId;
      const key = `${pid}_${wid}`;

      if (!productCostMap.has(key)) {
        productCostMap.set(key, {
          productId: pid,
          productCode: item.product?.code,
          productName: item.product?.name,
          productSpec: item.product?.spec,
          unit: item.product?.unit,
          warehouseId: wid,
          warehouseName: item.warehouse?.name,
          beginningQty: 0,
          beginningCost: 0,
          inboundQty: 0,
          inboundAmount: 0,
          outboundQty: 0,
          outboundCost: 0,
          endingQty: 0,
          endingCost: 0,
          weightedAvgCost: 0,
        });
      }

      const costItem = productCostMap.get(key);
      // 当前库存作为期末库存
      costItem.endingQty = item.quantity;
      costItem.endingCost = Number(item.costPrice) * item.quantity;
    }

    // 统计入库数量
    for (const inbound of inboundDetails) {
      for (const detail of inbound.details) {
        const key = `${detail.productId}_${inbound.warehouseId}`;
        if (productCostMap.has(key)) {
          const costItem = productCostMap.get(key);
          costItem.inboundQty += Number(detail.quantity) || 0;
          costItem.inboundAmount += (Number(detail.quantity) || 0) * (Number(detail.unitPrice) || 0);
        }
      }
    }

    // 统计出库数量
    for (const outbound of outboundDetails) {
      for (const detail of outbound.details) {
        const key = `${detail.productId}_${outbound.warehouseId}`;
        if (productCostMap.has(key)) {
          const costItem = productCostMap.get(key);
          costItem.outboundQty += Number(detail.quantity) || 0;
        }
      }
    }

    // 计算期初和加权平均成本
    const result = Array.from(productCostMap.values()).map(item => {
      // 期初 = 期末 - 入库 + 出库
      item.beginningQty = item.endingQty - item.inboundQty + item.outboundQty;
      
      // 计算加权平均成本
      const totalQty = item.beginningQty + item.inboundQty;
      const totalAmount = item.beginningCost + item.inboundAmount;
      item.weightedAvgCost = totalQty > 0 ? totalAmount / totalQty : 0;
      
      // 计算出库成本
      item.outboundCost = item.outboundQty * item.weightedAvgCost;
      
      // 计算期初成本（倒推）
      item.beginningCost = item.beginningQty * item.weightedAvgCost;

      return item;
    });

    // 过滤掉没有出入库记录的产品
    const filteredResult = result.filter(item => 
      item.inboundQty > 0 || item.outboundQty > 0 || item.beginningQty > 0
    );

    // 按产品编码排序
    filteredResult.sort((a, b) => a.productCode?.localeCompare(b.productCode));

    return res.json({
      success: true,
      data: {
        items: filteredResult,
        totalProducts: filteredResult.length,
        totalBeginningQty: filteredResult.reduce((sum, item) => sum + item.beginningQty, 0),
        totalBeginningCost: filteredResult.reduce((sum, item) => sum + item.beginningCost, 0),
        totalInboundQty: filteredResult.reduce((sum, item) => sum + item.inboundQty, 0),
        totalInboundAmount: filteredResult.reduce((sum, item) => sum + item.inboundAmount, 0),
        totalOutboundQty: filteredResult.reduce((sum, item) => sum + item.outboundQty, 0),
        totalOutboundCost: filteredResult.reduce((sum, item) => sum + item.outboundCost, 0),
        totalEndingQty: filteredResult.reduce((sum, item) => sum + item.endingQty, 0),
        totalEndingCost: filteredResult.reduce((sum, item) => sum + item.endingCost, 0),
      },
    });
  } catch (error) {
    console.error('存货出库核算错误:', error);
    return res.status(500).json({
      success: false,
      message: '存货出库核算失败',
    });
  }
};

/**
 * 异常成本核算
 * 找出成本为0但数量不为0，或成本不为0但数量为0的库存记录
 * POST /api/v1/cost-calculation/abnormal
 */
export const calculateAbnormalCost = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { warehouseId, productId } = req.body;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (productId) {
      where.productId = productId;
    }

    // 查询所有库存记录
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
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 找出异常记录
    const abnormalItems = [];

    for (const item of inventoryItems) {
      const quantity = item.quantity;
      const costPrice = Number(item.costPrice) || 0;
      const totalCost = quantity * costPrice;

      // 异常类型1：数量不为0，但成本为0
      if (quantity !== 0 && costPrice === 0) {
        abnormalItems.push({
          id: item.id,
          productId: item.productId,
          productCode: item.product?.code,
          productName: item.product?.name,
          productSpec: item.product?.spec,
          unit: item.product?.unit,
          warehouseId: item.warehouseId,
          warehouseName: item.warehouse?.name,
          quantity,
          costPrice,
          totalCost,
          abnormalType: 'zero_cost',
          abnormalDesc: '数量不为0但成本为0',
          suggestedCost: null,
        });
      }
      // 异常类型2：成本不为0，但数量为0
      else if (quantity === 0 && costPrice !== 0) {
        abnormalItems.push({
          id: item.id,
          productId: item.productId,
          productCode: item.product?.code,
          productName: item.product?.name,
          productSpec: item.product?.spec,
          unit: item.product?.unit,
          warehouseId: item.warehouseId,
          warehouseName: item.warehouse?.name,
          quantity,
          costPrice,
          totalCost,
          abnormalType: 'zero_quantity',
          abnormalDesc: '成本不为0但数量为0',
          suggestedCost: 0,
        });
      }
    }

    // 对于成本为0的异常，尝试从历史入库记录中计算建议成本
    for (const item of abnormalItems) {
      if (item.abnormalType === 'zero_cost') {
        // 查询该产品的历史入库记录
        const inboundDetails = await prisma.purchaseInboundDetail.findMany({
          where: {
            productId: item.productId,
            inbound: {
              tenantId: req.user.tenantId,
              warehouseId: item.warehouseId,
              status: 'confirmed',
            },
          },
          orderBy: {
            inbound: {
              inboundDate: 'desc',
            },
          },
          take: 5, // 最近5次入库
        });

        if (inboundDetails.length > 0) {
          // 计算加权平均成本
          let totalQty = 0;
          let totalAmount = 0;
          for (const detail of inboundDetails) {
            totalQty += Number(detail.quantity) || 0;
            totalAmount += (Number(detail.quantity) || 0) * (Number(detail.unitPrice) || 0);
          }
          item.suggestedCost = totalQty > 0 ? totalAmount / totalQty : 0;
        }
      }
    }

    // 按产品编码排序
    abnormalItems.sort((a, b) => a.productCode?.localeCompare(b.productCode));

    return res.json({
      success: true,
      data: {
        items: abnormalItems,
        totalCount: abnormalItems.length,
        zeroCostCount: abnormalItems.filter(i => i.abnormalType === 'zero_cost').length,
        zeroQuantityCount: abnormalItems.filter(i => i.abnormalType === 'zero_quantity').length,
      },
    });
  } catch (error) {
    console.error('异常成本核算错误:', error);
    return res.status(500).json({
      success: false,
      message: '异常成本核算失败',
    });
  }
};

/**
 * 修复异常成本
 * 将异常库存记录的成本修复为建议成本
 * POST /api/v1/cost-calculation/fix-abnormal
 */
export const fixAbnormalCost = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { items } = req.body; // [{ inventoryItemId, newCostPrice }]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供需要修复的库存记录',
      });
    }

    // 验证所有记录是否属于当前租户
    const inventoryIds = items.map(i => i.inventoryItemId);
    const existingItems = await prisma.inventoryItem.findMany({
      where: {
        id: { in: inventoryIds },
        tenantId: req.user.tenantId,
      },
    });

    if (existingItems.length !== items.length) {
      return res.status(400).json({
        success: false,
        message: '部分库存记录不存在或无权限',
      });
    }

    // 批量更新成本
    const updatePromises = items.map(item =>
      prisma.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data: { costPrice: item.newCostPrice },
      })
    );

    await Promise.all(updatePromises);

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'cost_calculation',
      resource: 'abnormal_fix',
      detail: JSON.stringify({ fixedCount: items.length }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: `成功修复 ${items.length} 条异常记录`,
    });
  } catch (error) {
    console.error('修复异常成本错误:', error);
    return res.status(500).json({
      success: false,
      message: '修复异常成本失败',
    });
  }
};

export default {
  calculateInboundCost,
  calculateOutboundCost,
  calculateAbnormalCost,
  fixAbnormalCost,
};
