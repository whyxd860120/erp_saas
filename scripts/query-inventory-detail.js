/**
 * 查询指定物料在指定仓库下的所有库存记录（含批次号）
 * 用于诊断"同一仓库同一物料出现多条记录"的问题
 * 
 * 使用方式：
 *   1. 确保 .env 文件中 DATABASE_URL 配置正确
 *   2. 运行：node scripts/query-inventory-detail.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('=== 库存记录诊断 ===\n')

  // 查询所有存在重复的 (仓库+物料) 组合
  const allItems = await prisma.inventoryItem.findMany({
    where: {},
    select: {
      id: true,
      tenantId: true,
      productId: true,
      warehouseId: true,
      batchNo: true,
      quantity: true,
      costPrice: true,
      status: true,
      product: { select: { code: true, name: true } },
      warehouse: { select: { code: true, name: true } },
    },
    orderBy: [
      { warehouseId: 'asc' },
      { productId: 'asc' },
      { batchNo: 'asc' },
    ],
  })

  // 按 (warehouseId, productId) 分组
  const groups = {}
  for (const item of allItems) {
    const key = `${item.warehouseId}|${item.productId}`
    if (!groups[key]) {
      groups[key] = {
        warehouse: item.warehouse,
        product: item.product,
        items: [],
      }
    }
    groups[key].items.push(item)
  }

  // 找出有重复的组（>=2条记录）
  console.log(`总共 ${allItems.length} 条库存记录\n`)
  console.log('--- 同一仓库+物料出现多条记录的情况 ---\n')

  let duplicateCount = 0
  for (const [key, group] of Object.entries(groups)) {
    if (group.items.length >= 2) {
      duplicateCount++
      console.log(`[${duplicateCount}] 仓库: ${group.warehouse.name} | 物料: ${group.product.code} ${group.product.name}`)
      console.log(`    共 ${group.items.length} 条记录:`)
      for (const item of group.items) {
        console.log(`    • ID:${item.id} | 批次号:${item.batchNo ?? '(空)'} | 库存:${item.quantity} | 状态:${item.status}`)
      }
      console.log('')
    }
  }

  if (duplicateCount === 0) {
    console.log('没有发现重复记录，每个(仓库+物料)组合只有1条。')
  } else {
    console.log(`共发现 ${duplicateCount} 组重复记录。\n`)
    
    // 额外统计：库存为0且batchNo为空的记录
    const zeroEmptyBatch = allItems.filter(i => i.quantity === 0 && (!i.batchNo || i.batchNo === ''))
    console.log(`其中库存=0且批次号为空的脏数据: ${zeroEmptyBatch.length} 条`)
    if (zeroEmptyBatch.length > 0) {
      console.log('详情:')
      for (const item of zeroEmptyBatch) {
        console.log(`  ID:${item.id} | ${item.warehouse.name} | ${item.product.code} ${item.product.name}`)
      }
    }
  }
}

main()
  .catch(e => {
    console.error('查询失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
