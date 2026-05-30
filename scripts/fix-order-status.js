const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPurchaseOrderStatus() {
  console.log('🔧 修复采购订单入库状态...\n');

  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        items: { include: { product: true } },
        inbounds: { include: { details: true } }
      }
    });

    console.log(`📋 找到 ${orders.length} 个采购订单\n`);

    let fixedOrders = 0, fixedItems = 0;

    for (const order of orders) {
      console.log(`📦 订单: ${order.orderNo} (状态: ${order.status})`);
      let hasChanges = false, completedItemsCount = 0, totalItems = order.items.length;

      for (const item of order.items) {
        let actualReceivedQty = 0;
        for (const inbound of order.inbounds) {
          if (inbound.status === 'confirmed') {
            for (const detail of inbound.details) {
              if (detail.productId === item.productId) {
                actualReceivedQty += detail.quantity || 0;
              }
            }
          }
        }

        let correctStatus = 'pending';
        if (actualReceivedQty > 0 && actualReceivedQty < item.quantity) correctStatus = 'partial';
        else if (actualReceivedQty >= item.quantity) correctStatus = 'completed';

        if (item.receivedQty !== actualReceivedQty || item.status !== correctStatus) {
          await prisma.purchaseOrderItem.update({
            where: { id: item.id },
            data: { receivedQty: actualReceivedQty, status: correctStatus }
          });
          console.log(`   ✓ 明细 ${item.product.code}: receivedQty=${actualReceivedQty}, status=${correctStatus}`);
          fixedItems++;
          hasChanges = true;
        }

        if (correctStatus === 'completed') completedItemsCount++;
      }

      let correctOrderStatus = 'pending';
      if (completedItemsCount === totalItems && totalItems > 0) correctOrderStatus = 'completed';
      else if (completedItemsCount > 0 || order.items.some(i => (i.receivedQty || 0) > 0)) correctOrderStatus = 'partial';
      else if (order.status === 'confirmed') correctOrderStatus = 'confirmed';

      if (order.status !== correctOrderStatus) {
        await prisma.purchaseOrder.update({
          where: { id: order.id },
          data: { status: correctOrderStatus }
        });
        console.log(`   ✓ 订单状态: ${correctOrderStatus} (原: ${order.status})`);
        fixedOrders++;
        hasChanges = true;
      }

      if (!hasChanges) console.log(`   ✅ 状态正确`);
    }

    console.log(`\n✅ 采购订单修复完成 - 订单: ${fixedOrders}, 明细: ${fixedItems}\n`);
  } catch (error) {
    console.error('❌ 采购订单修复失败:', error);
  }
}

async function fixSalesOrderStatus() {
  console.log('🔧 修复销售订单出库状态...\n');

  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        items: { include: { product: true } },
        outbounds: { include: { details: true } }
      }
    });

    console.log(`📋 找到 ${orders.length} 个销售订单\n`);

    let fixedOrders = 0, fixedItems = 0;

    for (const order of orders) {
      console.log(`📦 订单: ${order.orderNo} (状态: ${order.status})`);
      let hasChanges = false, completedItemsCount = 0, totalItems = order.items.length;

      for (const item of order.items) {
        let actualShippedQty = 0;
        for (const outbound of order.outbounds) {
          if (outbound.status === 'confirmed') {
            for (const detail of outbound.details) {
              if (detail.productId === item.productId) {
                actualShippedQty += detail.quantity || 0;
              }
            }
          }
        }

        let correctStatus = 'pending';
        if (actualShippedQty > 0 && actualShippedQty < item.quantity) correctStatus = 'partial';
        else if (actualShippedQty >= item.quantity) correctStatus = 'completed';

        if (item.shippedQty !== actualShippedQty || item.status !== correctStatus) {
          await prisma.salesOrderItem.update({
            where: { id: item.id },
            data: { shippedQty: actualShippedQty, status: correctStatus }
          });
          console.log(`   ✓ 明细 ${item.product.code}: shippedQty=${actualShippedQty}, status=${correctStatus}`);
          fixedItems++;
          hasChanges = true;
        }

        if (correctStatus === 'completed') completedItemsCount++;
      }

      let correctOrderStatus = 'pending';
      if (completedItemsCount === totalItems && totalItems > 0) correctOrderStatus = 'completed';
      else if (completedItemsCount > 0 || order.items.some(i => (i.shippedQty || 0) > 0)) correctOrderStatus = 'partial';
      else if (order.status === 'confirmed') correctOrderStatus = 'confirmed';

      if (order.status !== correctOrderStatus) {
        await prisma.salesOrder.update({
          where: { id: order.id },
          data: { status: correctOrderStatus }
        });
        console.log(`   ✓ 订单状态: ${correctOrderStatus} (原: ${order.status})`);
        fixedOrders++;
        hasChanges = true;
      }

      if (!hasChanges) console.log(`   ✅ 状态正确`);
    }

    console.log(`\n✅ 销售订单修复完成 - 订单: ${fixedOrders}, 明细: ${fixedItems}\n`);
  } catch (error) {
    console.error('❌ 销售订单修复失败:', error);
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('📋 订单状态修复工具');
  console.log('='.repeat(80) + '\n');

  await fixPurchaseOrderStatus();
  await fixSalesOrderStatus();

  console.log('='.repeat(80));
  console.log('🎉 所有订单状态修复完成！');
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

main();
