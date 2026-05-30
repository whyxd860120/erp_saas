const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const additionalMenus = [
  // 帮助与支持
  { name: '帮助与支持', code: 'help', type: 'menu', path: '/help', icon: 'QuestionFilled', sortOrder: 90, parentCode: null }
];

async function addAdditionalMenus() {
  console.log('🚀 检查并添加缺失的菜单...\n');

  try {
    // 获取所有现有菜单
    const existingMenus = await prisma.permission.findMany({
      where: { type: 'menu' }
    });

    console.log(`📊 数据库中已有 ${existingMenus.length} 个菜单\n`);

    // 创建菜单映射表（code -> menu）
    const menuMap = new Map();
    existingMenus.forEach(menu => {
      menuMap.set(menu.code, menu);
    });

    let created = 0;
    let skipped = 0;

    // 按顺序创建菜单
    for (const menuData of additionalMenus) {
      const existingMenu = menuMap.get(menuData.code);

      if (existingMenu) {
        skipped++;
        console.log(`  ⏭️  跳过: [${menuData.code}] ${menuData.name} (已存在)`);
        continue;
      }

      // 查找父菜单ID
      const parentId = menuData.parentCode ? menuMap.get(menuData.parentCode)?.id : null;

      // 如果有父菜单但找不到父菜单ID，跳过
      if (menuData.parentCode && !parentId) {
        skipped++;
        console.log(`  ⚠️  跳过: [${menuData.code}] ${menuData.name} (找不到父菜单 ${menuData.parentCode})`);
        continue;
      }

      // 创建新菜单
      const newMenu = await prisma.permission.create({
        data: {
          name: menuData.name,
          code: menuData.code,
          type: menuData.type,
          path: menuData.path,
          icon: menuData.icon,
          parentId: parentId,
          sortOrder: menuData.sortOrder,
          isSystem: true,
        }
      });

      // 更新映射表
      menuMap.set(menuData.code, newMenu);

      created++;
      console.log(`  🆕 创建: [${menuData.code}] ${menuData.name}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 菜单添加完成！');
    console.log(`   创建: ${created} 个`);
    console.log(`   跳过: ${skipped} 个`);
    console.log('='.repeat(80));

    // 显示最终菜单树
    console.log('\n📋 完整菜单结构：\n');
    const allMenus = await prisma.permission.findMany({
      where: { type: 'menu' },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    const buildTree = (items, parentId = null, level = 0) => {
      const children = items.filter(m => m.parentId === parentId);
      children.forEach(menu => {
        const indent = '  '.repeat(level);
        const prefix = level > 0 ? (level === 1 ? '├── ' : '│   ') : '';
        const hasChildren = items.some(m => m.parentId === menu.id);
        const childMarker = hasChildren ? ' 📁' : '';
        const pathInfo = menu.path ? ` (${menu.path})` : '';
        console.log(`${indent}${prefix}${menu.name}${childMarker}${pathInfo} [${menu.code}]`);
        buildTree(items, menu.id, level + 1);
      });
    };

    buildTree(allMenus);

    console.log('\n💡 提示：共 ' + allMenus.length + ' 个菜单，请刷新前端查看！');

  } catch (error) {
    console.error('\n❌ 添加菜单失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAdditionalMenus();
