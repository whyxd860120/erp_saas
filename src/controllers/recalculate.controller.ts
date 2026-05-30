import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 处理批次号：根据物料是否启用批次管理来规范化
 * - enableBatch=true  → batchNo 必须有值，空值用 '__DEFAULT__' 替代
 * - enableBatch=false → batchNo 统一为 null
 */
const normalizeBatchNo = (batchNo: string | null | undefined, enableBatch: boolean): string | null => {
  if (!enableBatch) return null;
  if (!batchNo || batchNo.trim() === '') return '__DEFAULT__';
  return batchNo.trim();
};

/**
 * 重算库存（全量重建：先清空库存表，再根据所有已确认单据重新计算）
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

    // ===== 第一步：先加载所有物料的批次管理属性 =====
    const allProducts = await prisma.product.findMany({
      where: { tenantId },
      select: { id: true, enableBatch: true, code: true, name: true },
    });
    const productBatchMap = new Map<string, boolean>();
    for (const p of allProducts) {
      productBatchMap.set(p.id, p.enableBatch);
    }
    console.log(`[重算库存] 加载物料 ${allProducts.length} 个，启用批次: ${allProducts.filter(p => p.enableBatch).length} 个`);

    // ===== 第二步：收集所有单据明细，汇总库存变动 =====
    // Map: key = `${productId}|${warehouseId}|${normalizedBatchNo}`
    const adjustments: Map<string, number> = new Map();

    const makeKey = (productId: string, whId: string, batchNo: string | null) =>
      `${productId}|${whId}|${batchNo ?? '__NULL__'}`;

    const warehouseFilter = warehouseId ? { warehouseId } : {};

    // 辅助函数：获取物料的批次管理属性
    const isBatchProduct = (productId: string) => productBatchMap.get(productId) ?? false;

    // 辅助函数：处理明细列表，累加/扣减数量
    const processDetails = (
      details: Array<{ productId: string; batchNo?: string | null; quantity: number }>,
      warehouseId: string,
      multiplier: 1 | -1,
      sourceLabel: string,
    ) => {
      let count = 0;
      for (const detail of details) {
        const enableBatch = isBatchProduct(detail.productId);
        const normalizedBatchNo = normalizeBatchNo(detail.batchNo, enableBatch);
        const key = makeKey(detail.productId, warehouseId, normalizedBatchNo);
        adjustments.set(key, (adjustments.get(key) || 0) + detail.quantity * multiplier);
        count++;
      }
      return count;
    };

    // 1. 采购入库（confirmed） +入库
    const purchaseInbounds = await prisma.purchaseInbound.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    let detailTotal = 0;
    for (const inbound of purchaseInbounds) {
      detailTotal += processDetails(inbound.details, inbound.warehouseId, 1, '采购入库');
    }
    console.log(`[重算库存] 采购入库: ${purchaseInbounds.length} 单, ${detailTotal} 条明细`);

    // 2. 其他入库（confirmed） +入库
    const otherInbounds = await prisma.otherInbound.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    detailTotal = 0;
    for (const inbound of otherInbounds) {
      detailTotal += processDetails(inbound.details, inbound.warehouseId, 1, '其他入库');
    }
    console.log(`[重算库存] 其他入库: ${otherInbounds.length} 单, ${detailTotal} 条明细`);

    // 3. 销售出库（confirmed） -出库
    const salesOutbounds = await prisma.salesOutbound.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    detailTotal = 0;
    for (const outbound of salesOutbounds) {
      detailTotal += processDetails(outbound.details, outbound.warehouseId, -1, '销售出库');
    }
    console.log(`[重算库存] 销售出库: ${salesOutbounds.length} 单, ${detailTotal} 条明细`);

    // 4. 其他出库（confirmed） -出库
    const otherOutbounds = await prisma.otherOutbound.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    detailTotal = 0;
    for (const outbound of otherOutbounds) {
      detailTotal += processDetails(outbound.details, outbound.warehouseId, -1, '其他出库');
    }
    console.log(`[重算库存] 其他出库: ${otherOutbounds.length} 单, ${detailTotal} 条明细`);

    // 5. 盘点单（confirmed） - 盘点差异
    const stockTakes = await prisma.stockTake.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    detailTotal = 0;
    for (const take of stockTakes) {
      for (const detail of take.details) {
        const enableBatch = isBatchProduct(detail.productId);
        const normalizedBatchNo = normalizeBatchNo(detail.batchNo, enableBatch);
        const key = makeKey(detail.productId, take.warehouseId, normalizedBatchNo);
        const diffQty = (detail.actualQty || 0) - (detail.bookQty || 0);
        adjustments.set(key, (adjustments.get(key) || 0) + diffQty);
        detailTotal++;
      }
    }
    console.log(`[重算库存] 盘点单: ${stockTakes.length} 单, ${detailTotal} 条明细`);

    // 6. 库存调整单（confirmed）
    const stockAdjustments = await prisma.stockAdjustment.findMany({
      where: { tenantId, status: 'confirmed', ...warehouseFilter },
      include: { details: true },
    });
    detailTotal = 0;
    for (const adj of stockAdjustments) {
      for (const detail of adj.details) {
        const enableBatch = isBatchProduct(detail.productId);
        const normalizedBatchNo = normalizeBatchNo(detail.batchNo, enableBatch);
        const key = makeKey(detail.productId, adj.warehouseId, normalizedBatchNo);
        adjustments.set(key, (adjustments.get(key) || 0) + detail.quantity);
        detailTotal++;
      }
    }
    console.log(`[重算库存] 调整单: ${stockAdjustments.length} 单, ${detailTotal} 条明细`);

    // 7. 调拨单（confirmed） - 调出扣减，调入增加
    const stockTransfers = await prisma.stockTransfer.findMany({
      where: { tenantId, status: 'confirmed' },
      include: { details: true },
    });
    detailTotal = 0;
    for (const transfer of stockTransfers) {
      for (const detail of transfer.details) {
        const enableBatch = isBatchProduct(detail.productId);
        const normalizedBatchNo = normalizeBatchNo(detail.batchNo, enableBatch);
        // 调出仓库：扣减
        const outKey = makeKey(detail.productId, transfer.fromWarehouseId, normalizedBatchNo);
        adjustments.set(outKey, (adjustments.get(outKey) || 0) - detail.quantity);
        // 调入仓库：增加
        const inKey = makeKey(detail.productId, transfer.toWarehouseId, normalizedBatchNo);
        adjustments.set(inKey, (adjustments.get(inKey) || 0) + detail.quantity);
        detailTotal++;
      }
    }
    console.log(`[重算库存] 调拨单: ${stockTransfers.length} 单, ${detailTotal} 条明细`);

    console.log(`[重算库存] 汇总完成，共 ${adjustments.size} 个库存维度`);

    // ===== 第三步：在事务中全量重建库存表 =====
    let createdCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;

    await prisma.$transaction(async (tx) => {
      // 先清空当前租户（及指定仓库）的所有库存记录
      const deleteWhere: any = { tenantId };
      if (warehouseId) {
        deleteWhere.warehouseId = warehouseId;
      }
      const deleteResult = await tx.inventoryItem.deleteMany({ where: deleteWhere });
      deletedCount = deleteResult.count;
      console.log(`[重算库存] 已清空 ${deletedCount} 条旧库存记录`);

      // 再逐条写入新计算的库存（只写入库存 > 0 的记录）
      for (const [key, targetQty] of adjustments.entries()) {
        if (targetQty <= 0) {
          skippedCount++;
          continue;
        }

        const [productId, whId, batchNoStr] = key.split('|');
        const batchNo = batchNoStr === '__NULL__' ? null : batchNoStr;

        await tx.inventoryItem.create({
          data: {
            tenantId,
            productId,
            warehouseId: whId,
            batchNo,
            quantity: targetQty,
            costPrice: 0,
            status: 'normal',
          },
        });
        createdCount++;
      }
    });

    console.log(`[重算库存] 写入 ${createdCount} 条，跳过(<=0) ${skippedCount} 条`);

    // 记录审计日志
    await auditLog({
      tenantId,
      userId: req.user.id,
      action: 'recalculate',
      module: 'inventory',
      resource: null,
      detail: JSON.stringify({
        warehouseId: warehouseId || 'all',
        deletedCount,
        createdCount,
        skippedCount,
        totalDimensions: adjustments.size,
        batchProducts: allProducts.filter(p => p.enableBatch).length,
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: `库存重算完成（全量重建）：删除旧记录 ${deletedCount} 条，写入新记录 ${createdCount} 条，跳过(<=0) ${skippedCount} 个维度`,
      data: {
        deletedCount,
        createdCount,
        skippedCount,
        totalDimensions: adjustments.size,
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
