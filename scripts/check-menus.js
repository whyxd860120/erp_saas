const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMenus() {
  try {
    console.log('🔍 检查数据库中的菜单数据...\n');

    const menus = await prisma.permission.findMany({
      where: { type: 'menu' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        parent: {
          select: { id: true, name: true, code: true }
        },
        children: {
          where: { type: 'menu' },
          select: { id: true, name: true, code: true }
        }
      }
    });

    console.log(`📊 共找到 ${menus.length} 个菜单\n`);

    // 按层级分类显示
    const level1 = menus.filter(m => !m.parentId);
    console.log('=== 一级菜单 ===');
    level1.forEach(menu => {
      console.log(`  [${menu.code}] ${menu.name} (排序: ${menu.sortOrder}, 系统: ${menu.isSystem})`);
      if (menu.children && menu.children.length > 0) {
        menu.children.forEach(child => {
          console.log(`    └── [${child.code}] ${child.name}`);
        });
      }
    });

    const level2 = menus.filter(m => m.parentId && !menus.find(p => p.id === m.parentId && !p.parentId));
    const level3 = menus.filter(m => {
      if (!m.parentId) return false;
      const parent = menus.find(p => p.id === m.parentId);
      return parent && parent.parentId;
    });

    if (level2.length > 0) {
      console.log('\n=== 二级菜单（无父菜单）===');
      level2.forEach(menu => {
        console.log(`  [${menu.code}] ${menu.name} (父ID: ${menu.parentId})`);
      });
    }

    // 统计
    const stats = {
      total: menus.length,
      level1: level1.length,
      level2: menus.filter(m => m.parentId && !m.children?.length).length,
      level3: menus.filter(m => m.children?.length > 0).length,
      systemMenus: menus.filter(m => m.isSystem).length,
      customMenus: menus.filter(m => !m.isSystem).length
    };

    console.log('\n📈 统计信息:');
    console.log(`  总菜单数: ${stats.total}`);
    console.log(`  一级菜单: ${stats.level1}`);
    console.log(`  二级菜单: ${stats.level2}`);
    console.log(`  三级菜单: ${stats.level3}`);
    console.log(`  系统菜单: ${stats.systemMenus}`);
    console.log(`  自定义菜单: ${stats.customMenus}`);

  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMenus();
