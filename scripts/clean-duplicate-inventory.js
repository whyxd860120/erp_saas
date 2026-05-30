/**
 * 清理库存脏数据：同一仓库+同一物料下，库存为0且batchNo为空的记录
 * 
 * 使用方式：
 *   1. 确保 .env 文件中 DATABASE_URL 配置正确
 *   2. 运行：node scripts/clean-duplicate-inventory.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('=== 开始清理库存脏数据 ===\n')

  // 1. 查询所有库存为0且batchNo为空（null或''）的记录
  const dirtyItems = await prisma.inventoryItem.findMany({
    where: {
      quantity: 0,
      OR: [
        { batchNo: null },
        { batchNo: '' },
      ],
    },
    include: {
      product: { select: { id: true, code: true, name: true } },
      warehouse: { select: { id: true, code: true, name: true } },
    },
    orderBy: [
      { warehouseId: 'asc' },
      { productId: 'asc' },
    ],
  })

  console.log(`找到 ${dirtyItems.length} 条库存为0且无批次号的记录\n`)

  if (dirtyItems.length === 0) {
    console.log('没有需要清理的脏数据。')
    return
  }

  // 2. 检查每条记录：同一仓库+同一物料是否还有另一条有效记录
  const toDelete = []
  const toKeep = []

  for (const item of dirtyItems) {
    // 查找同一仓库+同一物料下的其他库存记录
    const otherItems = await prisma.inventoryItem.findMany({
      where: {
        tenantId: item.tenantId,
        productId: item.productId,
        warehouseId: item.warehouseId,
        id: { not: item.id },
      },
    })

    if (otherItems.length > 0) {
      // 有其他记录（不管库存多少），这条0库存空批次的可以删
      toDelete.push(item)
    } else {
      // 没有其他记录，保留这条（虽然库存为0，但是唯一的记录）
      toKeep.push(item)
    }
  }

  console.log(`可安全删除: ${toDelete.length} 条`)
  console.log(`保留（无其他记录）: ${toKeep.length} 条\n`)

  // 3. 打印待删除记录
  if (toDelete.length > 0) {
    console.log('--- 待删除记录 ---')
    toDelete.forEach(item => {
      console.log(`  ID: ${item.id}`)
      console.log(`  仓库: ${item.warehouse.name} | 物料: ${item.product.code} ${item.product.name}`)
      console.log(`  库存: ${item.quantity} | 批次号: ${item.batchNo ?? '(空)'}`)
      console.log('  ---')
    })
  }

  // 4. 确认删除
  if (toDelete.length > 0) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const answer = await new Promise(resolve => {
      readline.question(`\n确认删除以上 ${toDelete.length} 条记录？(y/n): `, resolve)
    })
    readline.close()

    if (answer.toLowerCase() === 'y') {
      const ids = toDelete.map(item => item.id)
      const result = await prisma.inventoryItem.deleteMany({
        where: { id: { in: ids } },
      })
      console.log(`\n✅ 已删除 ${result.count} 条脏数据`)
    } else {
      console.log('\n❌ 已取消删除')
    }
  }

  console.log('\n=== 清理完成 ===')
}

main()
  .catch(e => {
    console.error('清理失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
