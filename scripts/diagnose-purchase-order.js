const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnosePurchaseOrder() {
  console.log('🔍 诊断采购订单入库状态...\n');

  try {
    // 查找所有采购订单
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        items: {
          include: {
            product: {
              select: {
                code: true,
                name: true
              }
            }
          }
        },
        inbounds: {
          include: {
            details: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`📋 共找到 ${orders.length} 个采购订单\n`);

    for (const order of orders) {
      console.log('='.repeat(80));
      console.log(`\n📦 订单号: ${order.orderNo}`);
      console.log(`   订单状态: ${order.status}`);
      console.log(`   订单金额: ¥${order.totalAmount}`);
      console.log(`   订单明细数: ${order.items.length}`);
      console.log(`   关联入库单数: ${order.inbounds.length}`);

      // 计算入库情况
      let totalOrderedQty = 0;
      let totalReceivedQty = 0;
      let completedItems = 0;
      let partialItems = 0;
      let pendingItems = 0;

      console.log('\n   📋 订单明细:');
      for (const item of order.items) {
        totalOrderedQty += item.quantity || 0;
        totalReceivedQty += item.receivedQty || 0;
        
        const itemStatus = item.status || 'unknown';
        if (itemStatus === 'completed') {
          completedItems++;
        } else if (itemStatus === 'partial') {
          partialItems++;
        } else {
          pendingItems++;
        }

        const progress = item.quantity > 0 ? Math.round((item.receivedQty / item.quantity) * 100) : 0;
        console.log(`      - ${item.product.code} ${item.product.name}: 订单${item.quantity}, 已入库${item.receivedQty} (${progress}%) [状态: ${itemStatus}]`);
      }

      // 计算入库单汇总
      let inboundAmount = 0;
      let confirmedInboundQty = 0;
      for (const inbound of order.inbounds) {
        if (inbound.status === 'confirmed') {
          inboundAmount += Number(inbound.totalAmount);
          confirmedInboundQty += inbound.details.reduce((sum, d) => sum + (d.quantity || 0), 0);
        }
      }

      const overallProgress = totalOrderedQty > 0 ? Math.round((totalReceivedQty / totalOrderedQty) * 100) : 0;
      
      console.log('\n   📊 入库汇总:');
      console.log(`      总订数量: ${totalOrderedQty}`);
      console.log(`      总已入库: ${totalReceivedQty} (${overallProgress}%)`);
      console.log(`      入库金额: ¥${inboundAmount} / ¥${order.totalAmount}`);
      console.log(`      确认入库数量: ${confirmedInboundQty}`);
      
      console.log('\n   📈 明细状态统计:');
      console.log(`      已完成: ${completedItems}, 部分入库: ${partialItems}, 待入库: ${pendingItems}`);

      // 判断状态是否正确
      const allCompleted = completedItems === order.items.length;
      const hasPartial = partialItems > 0;
      const hasPending = pendingItems > 0;
      
      let expectedStatus = 'unknown';
      if (allCompleted) {
        expectedStatus = 'completed';
      } else if (hasPartial || hasPending) {
        expectedStatus = 'partial';
      }

      console.log('\n   🔍 状态诊断:');
      console.log(`      预期状态: ${expectedStatus}`);
      console.log(`      实际状态: ${order.status}`);
      if (order.status !== expectedStatus) {
        console.log(`      ⚠️  状态不匹配！`);
      } else {
        console.log(`      ✅ 状态正确`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 提示:');
    console.log('   - 如果"预期状态"与"实际状态"不匹配，说明入库状态计算有误');
    console.log('   - 常见原因:');
    console.log('     1. 多个入库单确认时状态被覆盖');
    console.log('     2. 明细的status字段没有正确更新');
    console.log('     3. 订单主status没有根据明细汇总重新计算');

  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePurchaseOrder();
