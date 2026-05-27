const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const menuData = [
  // 仪表盘
  { name: '仪表盘', code: 'dashboard', type: 'menu', path: '/', icon: 'Odometer', sortOrder: 1 },

  // 基础资料（一级）
  { name: '基础资料', code: 'basic', type: 'menu', path: null, icon: 'Files', sortOrder: 10 },
  // 基础资料的子菜单
  { name: '供应商管理', code: 'supplier', type: 'menu', path: '/suppliers', icon: 'OfficeBuilding', sortOrder: 1, parentCode: 'basic' },
  { name: '客户管理', code: 'customer', type: 'menu', path: '/customers', icon: 'UserFilled', sortOrder: 2, parentCode: 'basic' },
  { name: '物料管理', code: 'product', type: 'menu', path: '/products', icon: 'Goods', sortOrder: 3, parentCode: 'basic' },
  { name: '仓库管理', code: 'warehouse', type: 'menu', path: '/warehouses', icon: 'House', sortOrder: 4, parentCode: 'basic' },
  { name: '账户管理', code: 'account', type: 'menu', path: '/accounts', icon: 'Wallet', sortOrder: 5, parentCode: 'basic' },

  // 采购管理（一级）
  { name: '采购管理', code: 'purchase', type: 'menu', path: null, icon: 'ShoppingCart', sortOrder: 20 },
  { name: '采购订单', code: 'purchase_order', type: 'menu', path: '/purchase-orders', icon: 'List', sortOrder: 1, parentCode: 'purchase' },
  { name: '采购入库', code: 'purchase_inbound', type: 'menu', path: '/purchase-inbounds', icon: 'Box', sortOrder: 2, parentCode: 'purchase' },

  // 销售管理（一级）
  { name: '销售管理', code: 'sales', type: 'menu', path: null, icon: 'Sell', sortOrder: 30 },
  { name: '销售订单', code: 'sales_order', type: 'menu', path: '/sales-orders', icon: 'Tickets', sortOrder: 1, parentCode: 'sales' },
  { name: '销售出库', code: 'sales_outbound', type: 'menu', path: '/sales-outbounds', icon: 'Van', sortOrder: 2, parentCode: 'sales' },

  // 库存管理（一级）
  { name: '库存管理', code: 'inventory', type: 'menu', path: null, icon: 'Package', sortOrder: 40 },
  { name: '库存查询', code: 'inventory_query', type: 'menu', path: '/inventory', icon: 'Search', sortOrder: 1, parentCode: 'inventory' },
  { name: '盘点单', code: 'stock_take', type: 'menu', path: '/stock-take', icon: 'Document', sortOrder: 2, parentCode: 'inventory' },
  { name: '其他入库', code: 'other_inbound', type: 'menu', path: '/other-inbounds', icon: 'Box', sortOrder: 3, parentCode: 'inventory' },
  { name: '其他出库', code: 'other_outbound', type: 'menu', path: '/other-outbounds', icon: 'Van', sortOrder: 4, parentCode: 'inventory' },
  { name: '调拨单', code: 'stock_transfer', type: 'menu', path: '/stock-transfers', icon: 'Connection', sortOrder: 5, parentCode: 'inventory' },

  // 财务管理（一级）
  { name: '财务管理', code: 'finance', type: 'menu', path: null, icon: 'Money', sortOrder: 50 },
  { name: '收款单', code: 'payment_receipt', type: 'menu', path: '/payment-receipts', icon: 'CreditCard', sortOrder: 1, parentCode: 'finance' },
  { name: '付款单', code: 'payment_payment', type: 'menu', path: '/payment-payments', icon: 'Postcard', sortOrder: 2, parentCode: 'finance' },

  // 用户与权限（一级）
  { name: '用户与权限', code: 'user_permission', type: 'menu', path: null, icon: 'User', sortOrder: 60 },
  { name: '人员管理', code: 'user', type: 'menu', path: '/users', icon: 'Avatar', sortOrder: 1, parentCode: 'user_permission' },
  { name: '角色权限', code: 'role', type: 'menu', path: '/roles', icon: 'Grid', sortOrder: 2, parentCode: 'user_permission' },
  { name: '菜单管理', code: 'menu_management', type: 'menu', path: '/menus', icon: 'Menu', sortOrder: 3, parentCode: 'user_permission' },

  // 工作流（一级）
  { name: '工作流', code: 'workflow', type: 'menu', path: null, icon: 'Guide', sortOrder: 70 },
  { name: '工作流管理', code: 'workflow_management', type: 'menu', path: '/workflows', icon: 'Guide', sortOrder: 1, parentCode: 'workflow' },
  { name: '审批中心', code: 'approval_center', type: 'menu', path: '/approvals', icon: 'Stamp', sortOrder: 2, parentCode: 'workflow' },

  // 系统设置（一级）
  { name: '系统设置', code: 'system_settings', type: 'menu', path: null, icon: 'Setting', sortOrder: 80 },
  { name: '单据编码规则', code: 'numbering_rule', type: 'menu', path: '/numbering-rules', icon: 'Document', sortOrder: 1, parentCode: 'system_settings' },
  { name: '账套参数', code: 'account_period', type: 'menu', path: '/account-period', icon: 'Calendar', sortOrder: 2, parentCode: 'system_settings' },
  { name: '租户信息', code: 'tenant_setting', type: 'menu', path: '/tenant-settings', icon: 'OfficeBuilding', sortOrder: 3, parentCode: 'system_settings' },
];

async function insertMenus() {
  console.log('🚀 开始插入菜单数据...\n');

  try {
    // 先删除所有菜单
    console.log('1️⃣ 删除现有菜单...');
    const deleteResult = await prisma.permission.deleteMany({
      where: { type: 'menu' }
    });
    console.log(`   已删除 ${deleteResult.count} 个菜单\n`);

    // 创建菜单映射（code -> id）
    const menuMap = new Map();

    // 第一遍：创建所有菜单（不设置parentId）
    console.log('2️⃣ 创建菜单...');
    for (const menu of menuData) {
      try {
        const created = await prisma.permission.create({
          data: {
            name: menu.name,
            code: menu.code,
            type: menu.type,
            path: menu.path,
            icon: menu.icon,
            sortOrder: menu.sortOrder,
            isSystem: true,
          }
        });
        menuMap.set(menu.code, created.id);
        console.log(`   ✅ ${menu.name}`);
      } catch (err) {
        console.log(`   ❌ ${menu.name} - ${err.message}`);
      }
    }

    console.log(`\n   已创建 ${menuMap.size} 个菜单\n`);

    // 第二遍：设置父级关系
    console.log('3️⃣ 设置父子关系...');
    for (const menu of menuData) {
      if (menu.parentCode && menuMap.has(menu.parentCode)) {
        const childId = menuMap.get(menu.code);
        const parentId = menuMap.get(menu.parentCode);

        try {
          await prisma.permission.update({
            where: { id: childId },
            data: { parentId }
          });
          console.log(`   🔗 ${menu.name} → ${menu.parentCode}`);
        } catch (err) {
          console.log(`   ❌ 设置父子关系失败: ${menu.name} - ${err.message}`);
        }
      }
    }

    // 查询最终结果
    console.log('\n4️⃣ 验证结果...');
    const allMenus = await prisma.permission.findMany({
      where: { type: 'menu' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });

    console.log(`\n✅ 成功创建 ${allMenus.length} 个菜单！`);

    // 显示树形结构
    console.log('\n📋 菜单结构：\n');
    const buildTree = (items, parentId = null, level = 0) => {
      const children = items.filter(m => m.parentId === parentId);
      children.forEach(menu => {
        const indent = '  '.repeat(level);
        const prefix = level > 0 ? '├── ' : '';
        const childCount = items.filter(m => m.parentId === menu.id).length;
        const marker = childCount > 0 ? ` (${childCount}个子菜单)` : '';
        console.log(`${indent}${prefix}${menu.name}${marker}`);
        buildTree(items, menu.id, level + 1);
      });
    };

    buildTree(allMenus);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 菜单初始化完成！');
    console.log('='.repeat(50));
    console.log('\n💡 现在可以刷新前端页面查看菜单管理！');
    console.log('   访问路径: http://localhost:5173/menus');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

insertMenus();
