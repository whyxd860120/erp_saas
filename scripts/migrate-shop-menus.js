/**
 * 迁移脚本：将微信商城菜单插入到已有数据库
 * 
 * 使用方式：
 *   node scripts/migrate-shop-menus.js
 * 
 * 说明：因为 initPermissions() 只在数据库为空时执行，
 * 所以已有数据的系统需要单独运行此脚本。
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 要添加的商城菜单
const shopMenus = [
  { name: '微信商城', code: 'shop', type: 'menu', icon: 'ShoppingBag', sortOrder: 55 },
  { name: '商城商品', code: 'shop_product', type: 'menu', path: '/shop-products', icon: 'Goods', parentCode: 'shop', sortOrder: 1 },
  { name: '商城订单', code: 'shop_order', type: 'menu', path: '/shop-orders', icon: 'Tickets', parentCode: 'shop', sortOrder: 2 },
  { name: '商城用户', code: 'shop_user', type: 'menu', path: '/shop-users', icon: 'UserFilled', parentCode: 'shop', sortOrder: 3 },
];

async function main() {
  console.log('=== 开始迁移微信商城菜单 ===\n');

  let created = 0;
  let skipped = 0;

  for (const menu of shopMenus) {
    // 检查是否已存在
    const existing = await prisma.permission.findUnique({
      where: { code: menu.code },
    });

    if (existing) {
      console.log(`⏭ 跳过已存在: ${menu.name} (${menu.code})`);
      skipped++;
      continue;
    }

    // 查找父菜单
    let parentId = null;
    if (menu.parentCode) {
      const parent = await prisma.permission.findUnique({
        where: { code: menu.parentCode },
      });
      if (parent) {
        parentId = parent.id;
      } else {
        console.error(`❌ 找不到父菜单: ${menu.parentCode}，跳过 ${menu.name}`);
        continue;
      }
    }

    await prisma.permission.create({
      data: {
        name: menu.name,
        code: menu.code,
        type: menu.type,
        parentId,
        path: menu.path || null,
        icon: menu.icon || null,
        sortOrder: menu.sortOrder,
        isSystem: true,
      },
    });

    console.log(`✅ 已创建: ${menu.name} (${menu.code})`);
    created++;
  }

  console.log(`\n=== 迁移完成: 创建 ${created} 个，跳过 ${skipped} 个 ===`);
}

main()
  .catch((e) => {
    console.error('迁移失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
