const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 检查菜单API和数据...\n');

  try {
    // 1. 查询所有菜单类型的权限
    const menus = await prisma.permission.findMany({
      where: { type: 'menu' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });

    console.log(`📊 数据库中的菜单数量: ${menus.length}\n`);

    if (menus.length === 0) {
      console.log('⚠️  没有找到菜单数据！');
      console.log('\n需要初始化菜单数据...');

      // 导入并运行初始化
      const { initPermissions } = require('../src/controllers/permission.controller');
      await initPermissions();

      // 重新查询
      const newMenus = await prisma.permission.findMany({
        where: { type: 'menu' },
        orderBy: [{ sortOrder: 'asc' }]
      });

      console.log(`\n✅ 初始化后菜单数量: ${newMenus.length}`);
    } else {
      console.log('✅ 数据库中已有菜单数据\n');
      console.log('菜单列表：');
      menus.forEach((menu, index) => {
        console.log(`  ${index + 1}. ${menu.name} (${menu.code}) - 父级: ${menu.parentId || '无'}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('数据库配置检查:');
    console.log(`  数据库: erpnext_db`);
    console.log(`  表: permissions`);
    console.log(`  菜单总数: ${menus.length}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
