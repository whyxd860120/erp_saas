import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 重算库存（根据所有已确认单据重新计算库存数量）
 * POST /api/v1/recalculate/inventory
 */
export const recalculateInventory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { warehouseId } = req.body;
    console.log(`[重算库存] 开始，租户: ${tenantId}${warehouseId ? ', 仓库: ' + warehouseId : ''}`);

    // 统计各来源的库存变动
    const adjustments: Map<string, number> = new Map();
    // key = `${productId}|${warehouseId}|${batchNo || '__NULL__'}`
    const makeKey = (productId: string, whId: string, batchNo?: string | null) =>
      `${productId}|${whId}|${batchNo || '__NULL__'}`;

    const warehouseFilter = warehouseId ? { warehouseId } : {};

    // 1. 采购入库（confirmed）
    const purchaseInbounds = await prisma.purchaseInbound.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    for (const inbound of purchaseInbounds) {
      for (const detail of inbound.details) {
        const key = makeKey(detail.productId, inbound.warehouseId, detail.batchNo);
        adjustments.set(key, (adjustments.get(key) || 0) + detail.quantity);
      }
    }
    console.log(`[重算库存] 采购入库: ${purchaseInbounds.length} 单`);

    // 2. 其他入库（confirmed）
    const otherInbounds = await prisma.otherInbound.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    for (const inbound of otherInbounds) {
      for (const detail of inbound.details) {
        const key = makeKey(detail.productId, inbound.warehouseId, detail.batchNo);
        adjustments.set(key, (adjustments.get(key) || 0) + detail.quantity);
      }
    }
    console.log(`[重算库存] 其他入库: ${otherInbounds.length} 单`);

    // 3. 销售出库（confirmed）- 扣减
    const salesOutbounds = await prisma.salesOutbound.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    for (const outbound of salesOutbounds) {
      for (const detail of outbound.details) {
        const key = makeKey(detail.productId, outbound.warehouseId, detail.batchNo);
        adjustments.set(key, (adjustments.get(key) || 0) - detail.quantity);
      }
    }
    console.log(`[重算库存] 销售出库: ${salesOutbounds.length} 单`);

    // 4. 其他出库（confirmed）- 扣减
    const otherOutbounds = await prisma.otherOutbound.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    for (const outbound of otherOutbounds) {
      for (const detail of outbound.details) {
        const key = makeKey(detail.productId, outbound.warehouseId, detail.batchNo);
        adjustments.set(key, (adjustments.get(key) || 0) - detail.quantity);
      }
    }
    console.log(`[重算库存] 其他出库: ${otherOutbounds.length} 单`);

    // 5. 盘点单（confirmed）- 直接覆盖差异
    const stockTakes = await prisma.stockTake.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    for (const take of stockTakes) {
      for (const detail of take.details) {
        const key = makeKey(detail.productId, take.warehouseId, detail.batchNo);
        // 盘点差异：actualQty - bookQty
        const diffQty = (detail.actualQty || 0) - (detail.bookQty || 0);
        adjustments.set(key, (adjustments.get(key) || 0) + diffQty);
      }
    }
    console.log(`[重算库存] 盘点单: ${stockTakes.length} 单`);

    // 6. 库存调整单（confirmed）
    const stockAdjustments = await prisma.stockAdjustment.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    for (const adjustment of stockAdjustments) {
      for (const detail of adjustment.details) {
        const key = makeKey(detail.productId, adjustment.warehouseId, detail.batchNo);
        adjustments.set(key, (adjustments.get(key) || 0) + detail.quantity);
      }
    }
    console.log(`[重算库存] 调整单: ${stockAdjustments.length} 单`);

    // 7. 调拨单（confirmed）- 调出仓库扣减，调入仓库增加
    const stockTransfers = await prisma.stockTransfer.findMany({
      where: { tenantId, status: 'confirmed' },
      include: { details: true },
    });
    for (const transfer of stockTransfers) {
      for (const detail of transfer.details) {
        // 调出仓库：扣减
        const outKey = makeKey(detail.productId, transfer.fromWarehouseId, detail.batchNo);
        adjustments.set(outKey, (adjustments.get(outKey) || 0) - detail.quantity);
        // 调入仓库：增加
        const inKey = makeKey(detail.productId, transfer.toWarehouseId, detail.batchNo);
        adjustments.set(inKey, (adjustments.get(inKey) || 0) + detail.quantity);
      }
    }
    console.log(`[重算库存] 调拨单: ${stockTransfers.length} 单`);

    // 8. 收款单确认时不涉及库存，跳过
    // 9. 付款单确认时不涉及库存，跳过

    // 汇总计算
    let updatedCount = 0;
    let createdCount = 0;
    let zeroCount = 0;
    const details: Array<{
      productId: string;
      warehouseId: string;
      batchNo: string | null;
      oldQty: number;
      newQty: number;
      diff: number;
    }> = [];

    // 使用事务批量更新
    await prisma.$transaction(async (tx) => {
      for (const [key, targetQty] of adjustments.entries()) {
        const [productId, whId, batchNoStr] = key.split('|');
        const batchNo = batchNoStr === '__NULL__' ? null : batchNoStr;

        // 查找现有库存
        const existing = await tx.inventoryItem.findFirst({
          where: { tenantId, productId, warehouseId: whId, batchNo },
        });

        const oldQty = existing ? existing.quantity : 0;

        if (targetQty === 0) {
          // 库存归零，删除记录
          if (existing) {
            await tx.inventoryItem.delete({ where: { id: existing.id } });
            zeroCount++;
          }
          details.push({ productId, warehouseId: whId, batchNo, oldQty, newQty: 0, diff: -oldQty });
        } else if (existing) {
          if (existing.quantity !== targetQty) {
            await tx.inventoryItem.update({
              where: { id: existing.id },
              data: { quantity: targetQty },
            });
            updatedCount++;
          }
          details.push({ productId, warehouseId: whId, batchNo, oldQty, newQty: targetQty, diff: targetQty - oldQty });
        } else {
          await tx.inventoryItem.create({
            data: {
              tenantId,
              productId,
              warehouseId: whId,
              batchNo,
              quantity: targetQty,
              costPrice: 0,
            },
          });
          createdCount++;
          details.push({ productId, warehouseId: whId, batchNo, oldQty: 0, newQty: targetQty, diff: targetQty });
        }
      }
    });

    // 记录审计日志
    await auditLog({
      tenantId,
      userId: req.user.id,
      action: 'recalculate',
      module: 'inventory',
      resource: null,
      detail: JSON.stringify({
        warehouseId: warehouseId || 'all',
        updatedCount,
        createdCount,
        zeroCount,
        totalKeys: adjustments.size,
        changedItems: details.filter(d => d.diff !== 0).length,
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const changedItems = details.filter(d => d.diff !== 0);

    res.json({
      success: true,
      message: `库存重算完成：更新 ${updatedCount} 条，新建 ${createdCount} 条，归零删除 ${zeroCount} 条，共 ${adjustments.size} 个库存维度，${changedItems.length} 项发生变化`,
      data: {
        updatedCount,
        createdCount,
        zeroCount,
        totalKeys: adjustments.size,
        changedCount: changedItems.length,
        changes: changedItems.slice(0, 100), // 最多返回前100条变化
      },
    });
  } catch (error) {
    console.error('重算库存错误:', error);
    res.status(500).json({
      success: false,
      message: '重算库存失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

/**
 * 重算账户余额（根据所有已确认的收款单/付款单重新计算每个账户的余额）
 * POST /api/v1/recalculate/account-balance
 */
export const recalculateAccountBalance = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    console.log(`[重算账户余额] 开始，租户: ${tenantId}`);

    // 获取所有活跃账户
    const accounts = await prisma.account.findMany({
      where: { tenantId, status: 'active' },
    });

    // 计算每个账户应收到的金额（confirmed 收款单）
    const receipts = await prisma.paymentReceipt.groupBy({
      by: ['accountId'],
      where: { tenantId, status: 'confirmed' },
      _sum: { amount: true },
    });

    // 计算每个账户应支出的金额（confirmed 付款单）
    const payments = await prisma.paymentPayment.groupBy({
      by: ['accountId'],
      where: { tenantId, status: 'confirmed' },
      _sum: { amount: true },
    });

    // 汇总
    const balanceMap = new Map<string, number>();
    for (const r of receipts) {
      balanceMap.set(r.accountId, (balanceMap.get(r.accountId) || 0) + Number(r._sum.amount || 0));
    }
    for (const p of payments) {
      balanceMap.set(p.accountId, (balanceMap.get(p.accountId) || 0) - Number(p._sum.amount || 0));
    }

    let updatedCount = 0;
    let unchangedCount = 0;
    const details: Array<{
      accountId: string;
      accountName: string;
      oldBalance: number;
      newBalance: number;
      diff: number;
    }> = [];

    // 使用事务批量更新
    await prisma.$transaction(async (tx) => {
      for (const account of accounts) {
        const targetBalance = balanceMap.get(account.id) || 0;
        const oldBalance = Number(account.balance);

        if (Math.abs(oldBalance - targetBalance) > 0.001) {
          await tx.account.update({
            where: { id: account.id },
            data: { balance: targetBalance },
          });
          updatedCount++;
          details.push({
            accountId: account.id,
            accountName: account.name,
            oldBalance,
            newBalance: targetBalance,
            diff: targetBalance - oldBalance,
          });
        } else {
          unchangedCount++;
        }
      }
    });

    // 记录审计日志
    await auditLog({
      tenantId,
      userId: req.user.id,
      action: 'recalculate',
      module: 'account_balance',
      resource: null,
      detail: JSON.stringify({
        totalAccounts: accounts.length,
        updatedCount,
        unchangedCount,
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: `账户余额重算完成：更新 ${updatedCount} 个账户，${unchangedCount} 个账户余额一致`,
      data: {
        updatedCount,
        unchangedCount,
        totalAccounts: accounts.length,
        details,
      },
    });
  } catch (error) {
    console.error('重算账户余额错误:', error);
    res.status(500).json({
      success: false,
      message: '重算账户余额失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

/**
 * 重算应收应付（根据所有已确认的收款单/付款单重新计算订单的已收/已付金额）
 * POST /api/v1/recalculate/order-payments
 */
export const recalculateOrderPayments = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    console.log(`[重算应收应付] 开始，租户: ${tenantId}`);

    let salesUpdated = 0;
    let salesUnchanged = 0;
    let purchaseUpdated = 0;
    let purchaseUnchanged = 0;
    const salesDetails: Array<{ orderId: string; orderNo: string; oldPaidAmount: number; newPaidAmount: number }> = [];
    const purchaseDetails: Array<{ orderId: string; orderNo: string; oldPaidAmount: number; newPaidAmount: number }> = [];

    // ===== 重算销售订单 paidAmount（应收） =====
    // 按 orderId 汇总所有 confirmed 收款单金额
    const receiptGroups = await prisma.paymentReceipt.groupBy({
      by: ['orderId'],
      where: { tenantId, status: 'confirmed', orderId: { not: null } },
      _sum: { amount: true },
    });

    const receiptAmountMap = new Map<string, number>();
    for (const g of receiptGroups) {
      receiptAmountMap.set(g.orderId!, Number(g._sum.amount || 0));
    }

    // 获取所有有收款单的销售订单
    const orderIds = [...receiptAmountMap.keys()];
    if (orderIds.length > 0) {
      const salesOrders = await prisma.salesOrder.findMany({
        where: { tenantId, id: { in: orderIds } },
      });

      await prisma.$transaction(async (tx) => {
        for (const order of salesOrders) {
          const targetPaid = receiptAmountMap.get(order.id) || 0;
          const oldPaid = Number(order.paidAmount || 0);

          if (Math.abs(oldPaid - targetPaid) > 0.001) {
            await tx.salesOrder.update({
              where: { id: order.id },
              data: { paidAmount: targetPaid },
            });
            salesUpdated++;
            salesDetails.push({ orderId: order.id, orderNo: order.orderNo, oldPaidAmount: oldPaid, newPaidAmount: targetPaid });
          } else {
            salesUnchanged++;
          }
        }
      });
    }

    // 同时处理没有收款单的订单（paidAmount 应该为 0 但可能残留了数据）
    const ordersWithWrongPaid = await prisma.salesOrder.findMany({
      where: {
        tenantId,
        paidAmount: { gt: 0 },
        id: { notIn: orderIds.length > 0 ? orderIds : ['__none__'] },
      },
    });

    if (ordersWithWrongPaid.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const order of ordersWithWrongPaid) {
          await tx.salesOrder.update({
            where: { id: order.id },
            data: { paidAmount: 0 },
          });
          salesUpdated++;
          salesDetails.push({ orderId: order.id, orderNo: order.orderNo, oldPaidAmount: Number(order.paidAmount), newPaidAmount: 0 });
        }
      });
    }

    // ===== 重算采购订单 paidAmount（应付） =====
    const paymentGroups = await prisma.paymentPayment.groupBy({
      by: ['orderId'],
      where: { tenantId, status: 'confirmed', orderId: { not: null } },
      _sum: { amount: true },
    });

    const paymentAmountMap = new Map<string, number>();
    for (const g of paymentGroups) {
      paymentAmountMap.set(g.orderId!, Number(g._sum.amount || 0));
    }

    const purchaseOrderIds = [...paymentAmountMap.keys()];
    if (purchaseOrderIds.length > 0) {
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: { tenantId, id: { in: purchaseOrderIds } },
      });

      await prisma.$transaction(async (tx) => {
        for (const order of purchaseOrders) {
          const targetPaid = paymentAmountMap.get(order.id) || 0;
          const oldPaid = Number(order.paidAmount || 0);

          if (Math.abs(oldPaid - targetPaid) > 0.001) {
            await tx.purchaseOrder.update({
              where: { id: order.id },
              data: { paidAmount: targetPaid },
            });
            purchaseUpdated++;
            purchaseDetails.push({ orderId: order.id, orderNo: order.orderNo, oldPaidAmount: oldPaid, newPaidAmount: targetPaid });
          } else {
            purchaseUnchanged++;
          }
        }
      });
    }

    // 同时处理没有付款单但 paidAmount > 0 的采购订单
    const purchaseOrdersWrongPaid = await prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        paidAmount: { gt: 0 },
        id: { notIn: purchaseOrderIds.length > 0 ? purchaseOrderIds : ['__none__'] },
      },
    });

    if (purchaseOrdersWrongPaid.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const order of purchaseOrdersWrongPaid) {
          await tx.purchaseOrder.update({
            where: { id: order.id },
            data: { paidAmount: 0 },
          });
          purchaseUpdated++;
          purchaseDetails.push({ orderId: order.id, orderNo: order.orderNo, oldPaidAmount: Number(order.paidAmount), newPaidAmount: 0 });
        }
      });
    }

    // 记录审计日志
    await auditLog({
      tenantId,
      userId: req.user.id,
      action: 'recalculate',
      module: 'order_payments',
      resource: null,
      detail: JSON.stringify({
        salesUpdated,
        salesUnchanged,
        purchaseUpdated,
        purchaseUnchanged,
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: `应收应付重算完成：销售订单更新 ${salesUpdated} 个（${salesUnchanged} 个一致），采购订单更新 ${purchaseUpdated} 个（${purchaseUnchanged} 个一致）`,
      data: {
        sales: { updated: salesUpdated, unchanged: salesUnchanged, details: salesDetails },
        purchase: { updated: purchaseUpdated, unchanged: purchaseUnchanged, details: purchaseDetails },
      },
    });
  } catch (error) {
    console.error('重算应收应付错误:', error);
    res.status(500).json({
      success: false,
      message: '重算应收应付失败',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
};

export default {
  recalculateInventory,
  recalculateAccountBalance,
  recalculateOrderPayments,
};
