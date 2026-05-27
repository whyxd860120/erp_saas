const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseMenus() {
  console.log('🔍 菜单数据诊断报告\n');
  console.log('='.repeat(60));

  try {
    // 1. 查询所有权限数据
    const allPermissions = await prisma.permission.findMany({
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    console.log(`\n1. 数据库中总权限数: ${allPermissions.length}`);

    // 2. 分类统计
    const menus = allPermissions.filter(p => p.type === 'menu');
    const buttons = allPermissions.filter(p => p.type === 'button');
    const apis = allPermissions.filter(p => p.type === 'api');

    console.log(`   - 菜单: ${menus.length}`);
    console.log(`   - 按钮: ${buttons.length}`);
    console.log(`   - API: ${apis.length}`);

    // 3. 检查菜单数据
    if (menus.length === 0) {
      console.log('\n⚠️  数据库中没有菜单数据！');
      console.log('\n💡 解决方案：');
      console.log('   运行初始化脚本: 双击 "初始化菜单数据.bat"');
      console.log('   或重启后端服务器，后端会自动初始化权限数据');
    } else {
      console.log('\n✅ 数据库中有菜单数据\n');

      // 4. 显示菜单树
      console.log('📋 菜单结构：\n');

      const buildTree = (items, parentId = null, level = 0) => {
        const children = items.filter(m => m.parentId === parentId);
        children.forEach(menu => {
          const indent = '  '.repeat(level);
          const prefix = level > 0 ? (level === 1 ? '├── ' : '│   ') : '';
          const hasChildren = items.some(m => m.parentId === menu.id);
          const childMarker = hasChildren ? ' 📁' : '';
          const systemMarker = menu.isSystem ? ' [系统]' : ' [自定义]';
          console.log(`${indent}${prefix}${menu.name}${childMarker}${systemMarker}`);
          buildTree(items, menu.id, level + 1);
        });
      };

      buildTree(menus);

      // 5. 检查API
      console.log('\n\n📊 API 接口检查：\n');
      console.log('菜单API端点：');
      console.log('  GET  /api/v1/menus           - 获取所有菜单');
      console.log('  GET  /api/v1/menus/flat      - 获取扁平菜单');
      console.log('  GET  /api/v1/menus/:id      - 获取单个菜单');
      console.log('  POST /api/v1/menus           - 创建菜单');
      console.log('  PUT  /api/v1/menus/:id      - 更新菜单');
      console.log('  DELETE /api/v1/menus/:id    - 删除菜单');
      console.log('  POST /api/v1/menus/batch-update - 批量更新');

      // 6. 检查权限
      console.log('\n\n🔐 权限检查：\n');
      const systemMenus = menus.filter(m => m.isSystem);
      const customMenus = menus.filter(m => !m.isSystem);

      console.log(`   系统菜单: ${systemMenus.length}`);
      console.log(`   自定义菜单: ${customMenus.length}`);

      if (customMenus.length > 0) {
        console.log('\n自定义菜单列表：');
        customMenus.forEach(menu => {
          console.log(`   - ${menu.name} (${menu.code})`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📌 后续操作建议：\n');

    if (menus.length === 0) {
      console.log('1. 方案一：重启后端服务器');
      console.log('   后端启动时会自动初始化权限数据');
      console.log('');
      console.log('2. 方案二：运行初始化脚本');
      console.log('   双击运行 "初始化菜单数据.bat"');
    } else {
      console.log('1. 检查前端是否正确调用API');
      console.log('2. 检查后端服务器是否正常运行');
      console.log('3. 查看浏览器控制台是否有错误信息');
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ 诊断失败:', error.message);
    console.error('\n请确保：');
    console.error('1. 后端服务器正在运行');
    console.error('2. 数据库连接正常');
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseMenus();
