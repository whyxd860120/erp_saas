const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPurchaseOrderStatus() {
  console.log('🔧 修复采购订单入库状态...\n');

  try {
    // 查找所有采购订单
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        items: {
          include: {
            product: true
          }
        },
        inbounds: {
          include: {
            details: true
          }
        }
      }
    });

    console.log(`📋 找到 ${orders.length} 个采购订单\n`);

    let fixedOrders = 0;
    let fixedItems = 0;

    for (const order of orders) {
      console.log(`\n📦 处理订单: ${order.orderNo}`);
      console.log(`   当前状态: ${order.status}`);

      let hasChanges = false;
      let completedItemsCount = 0;
      let totalItems = order.items.length;

      // 修复每个订单明细的状态
      for (const item of order.items) {
        // 计算该明细的实际已入库数量（从所有已确认的入库单汇总）
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

        // 判断正确的状态
        let correctStatus = 'pending';
        if (actualReceivedQty > 0 && actualReceivedQty < item.quantity) {
          correctStatus = 'partial';
        } else if (actualReceivedQty >= item.quantity) {
          correctStatus = 'completed';
        }

        // 更新明细的receivedQty和status
        if (item.receivedQty !== actualReceivedQty || item.status !== correctStatus) {
          await prisma.purchaseOrderItem.update({
            where: { id: item.id },
            data: {
              receivedQty: actualReceivedQty,
              status: correctStatus
            }
          });
          
          console.log(`   ✓ 更新明细 ${item.product.code}: receivedQty=${actualReceivedQty}, status=${correctStatus} (原: receivedQty=${item.receivedQty}, status=${item.status})`);
          fixedItems++;
          hasChanges = true;
        }

        if (correctStatus === 'completed') {
          completedItemsCount++;
        }
      }

      // 根据明细状态判断订单的正确状态
      let correctOrderStatus = 'pending';
      if (completedItemsCount === totalItems && totalItems > 0) {
        correctOrderStatus = 'completed';
      } else if (completedItemsCount > 0 || order.items.some(i => (i.receivedQty || 0) > 0)) {
        correctOrderStatus = 'partial';
      } else if (order.status === 'confirmed') {
        correctOrderStatus = 'confirmed';
      }

      // 更新订单状态
      if (order.status !== correctOrderStatus) {
        await prisma.purchaseOrder.update({
          where: { id: order.id },
          data: {
            status: correctOrderStatus
          }
        });
        
        console.log(`   ✓ 更新订单状态: ${correctOrderStatus} (原: ${order.status})`);
        fixedOrders++;
        hasChanges = true;
      }

      if (!hasChanges) {
        console.log(`   ✅ 状态正确，无需修改`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 修复完成！');
    console.log(`   修复订单数: ${fixedOrders}`);
    console.log(`   修复明细数: ${fixedItems}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPurchaseOrderStatus();
