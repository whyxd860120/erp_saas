const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const missingMenus = [
  // SaaS 管理 - 租户管理（超级管理员专属）
  { name: 'SaaS管理', code: 'saas_management', type: 'menu', path: null, icon: 'OfficeBuilding', sortOrder: 85, parentCode: null },
  { name: '租户管理', code: 'tenant_management', type: 'menu', path: '/tenants', icon: 'UserFilled', sortOrder: 1, parentCode: 'saas_management' },

  // 生产管理
  { name: '生产管理', code: 'production', type: 'menu', path: null, icon: 'Setting', sortOrder: 45, parentCode: null },
  { name: 'BOM管理', code: 'bom_management', type: 'menu', path: '/boms', icon: 'Document', sortOrder: 1, parentCode: 'production' },
  { name: '生产订单', code: 'production_order', type: 'menu', path: '/production-orders', icon: 'List', sortOrder: 2, parentCode: 'production' },
  { name: '工序管理', code: 'process_management', type: 'menu', path: '/processes', icon: 'Guide', sortOrder: 3, parentCode: 'production' },
  { name: '生产入库', code: 'production_inbound', type: 'menu', path: '/production-inbounds', icon: 'Box', sortOrder: 4, parentCode: 'production' },

  // 委外管理
  { name: '委外管理', code: 'outsourcing', type: 'menu', path: null, icon: 'Van', sortOrder: 46, parentCode: null },
  { name: '委外订单', code: 'outsourcing_order', type: 'menu', path: '/outsourcing-orders', icon: 'Tickets', sortOrder: 1, parentCode: 'outsourcing' },
  { name: '委外发料', code: 'outsourcing_issue', type: 'menu', path: '/outsourcing-issues', icon: 'Box', sortOrder: 2, parentCode: 'outsourcing' },
  { name: '委外收料', code: 'outsourcing_receipt', type: 'menu', path: '/outsourcing-receipts', icon: 'Box', sortOrder: 3, parentCode: 'outsourcing' },

  // 受托加工（来料加工）
  { name: '受托加工', code: 'subcontract', type: 'menu', path: null, icon: 'Tools', sortOrder: 47, parentCode: null },
  { name: '来料订单', code: 'subcontract_order', type: 'menu', path: '/subcontract-orders', icon: 'Tickets', sortOrder: 1, parentCode: 'subcontract' },
  { name: '客供料管理', code: 'customer_material', type: 'menu', path: '/customer-materials', icon: 'Goods', sortOrder: 2, parentCode: 'subcontract' },
  { name: '来料加工入库', code: 'subcontract_inbound', type: 'menu', path: '/subcontract-inbounds', icon: 'Box', sortOrder: 3, parentCode: 'subcontract' },
];

async function addMissingMenus() {
  console.log('🚀 开始添加缺失的菜单...\n');

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

    // 按顺序创建菜单（先创建父菜单，再创建子菜单）
    for (const menuData of missingMenus) {
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

    console.log('\n' + '='.repeat(50));
    console.log('✅ 菜单添加完成！');
    console.log(`   创建: ${created} 个`);
    console.log(`   跳过: ${skipped} 个`);
    console.log('='.repeat(50));

    // 显示最终菜单树
    console.log('\n📋 当前完整菜单结构：\n');
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
        console.log(`${indent}${prefix}[${menu.code}] ${menu.name}${childMarker}`);
        buildTree(items, menu.id, level + 1);
      });
    };

    buildTree(allMenus);

    console.log('\n💡 提示：请刷新前端页面查看新增的菜单！');

  } catch (error) {
    console.error('\n❌ 添加菜单失败:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行
addMissingMenus();
