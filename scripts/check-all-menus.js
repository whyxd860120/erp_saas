const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllMenus() {
  console.log('📋 检查数据库中的所有菜单...\n');

  try {
    // 获取所有菜单
    const allMenus = await prisma.permission.findMany({
      where: { type: 'menu' },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    console.log(`🔍 数据库中共有 ${allMenus.length} 个菜单\n`);

    // 打印所有菜单列表
    console.log('📋 所有菜单列表：\n');
    allMenus.forEach((menu, index) => {
      console.log(`${index + 1}. [${menu.code}] ${menu.name} (path: ${menu.path || 'NULL'}, parentId: ${menu.parentId || 'NULL'})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('📁 菜单树形结构：\n');

    // 构建菜单树
    const buildTree = (items, parentId = null, level = 0) => {
      const children = items.filter(item => item.parentId === parentId);
      children.forEach(item => {
        const indent = '  '.repeat(level);
        const prefix = level > 0 ? (level === 1 ? '├── ' : '│   ') : '';
        const hasChildren = items.some(i => i.parentId === item.id);
        const childMarker = hasChildren ? ' 📁' : '';
        const pathInfo = item.path ? ` (${item.path})` : '';
        console.log(`${indent}${prefix}${item.name}${childMarker}${pathInfo} [${item.code}]`);
        buildTree(items, item.id, level + 1);
      });
    };

    buildTree(allMenus);

    console.log('\n' + '='.repeat(80));
    console.log('✅ 检查完成！');

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllMenus();
