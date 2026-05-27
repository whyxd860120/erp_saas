const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultMenus = [
  // 仪表盘
  { name: '仪表盘', code: 'dashboard', type: 'menu', path: '/', icon: 'Odometer', sortOrder: 1 },

  // 基础资料
  { name: '基础资料', code: 'basic', type: 'menu', icon: 'Files', sortOrder: 10 },
  { name: '供应商管理', code: 'supplier', type: 'menu', path: '/suppliers', icon: 'OfficeBuilding', parentCode: 'basic', sortOrder: 1 },
  { name: '客户管理', code: 'customer', type: 'menu', path: '/customers', icon: 'UserFilled', parentCode: 'basic', sortOrder: 2 },
  { name: '物料管理', code: 'product', type: 'menu', path: '/products', icon: 'Goods', parentCode: 'basic', sortOrder: 3 },
  { name: '仓库管理', code: 'warehouse', type: 'menu', path: '/warehouses', icon: 'House', parentCode: 'basic', sortOrder: 4 },
  { name: '账户管理', code: 'account', type: 'menu', path: '/accounts', icon: 'Wallet', parentCode: 'basic', sortOrder: 5 },

  // 采购管理
  { name: '采购管理', code: 'purchase', type: 'menu', icon: 'ShoppingCart', sortOrder: 20 },
  { name: '采购订单', code: 'purchase_order', type: 'menu', path: '/purchase-orders', icon: 'List', parentCode: 'purchase', sortOrder: 1 },
  { name: '采购入库', code: 'purchase_inbound', type: 'menu', path: '/purchase-inbounds', icon: 'Box', parentCode: 'purchase', sortOrder: 2 },

  // 销售管理
  { name: '销售管理', code: 'sales', type: 'menu', icon: 'Sell', sortOrder: 30 },
  { name: '销售订单', code: 'sales_order', type: 'menu', path: '/sales-orders', icon: 'Tickets', parentCode: 'sales', sortOrder: 1 },
  { name: '销售出库', code: 'sales_outbound', type: 'menu', path: '/sales-outbounds', icon: 'Van', parentCode: 'sales', sortOrder: 2 },

  // 库存管理
  { name: '库存管理', code: 'inventory', type: 'menu', icon: 'Package', sortOrder: 40 },
  { name: '库存查询', code: 'inventory_query', type: 'menu', path: '/inventory', icon: 'Search', parentCode: 'inventory', sortOrder: 1 },
  { name: '盘点单', code: 'stock_take', type: 'menu', path: '/stock-take', icon: 'Document', parentCode: 'inventory', sortOrder: 2 },
  { name: '其他入库', code: 'other_inbound', type: 'menu', path: '/other-inbounds', icon: 'Box', parentCode: 'inventory', sortOrder: 3 },
  { name: '其他出库', code: 'other_outbound', type: 'menu', path: '/other-outbounds', icon: 'Van', parentCode: 'inventory', sortOrder: 4 },
  { name: '调拨单', code: 'stock_transfer', type: 'menu', path: '/stock-transfers', icon: 'Connection', parentCode: 'inventory', sortOrder: 5 },

  // 财务管理
  { name: '财务管理', code: 'finance', type: 'menu', icon: 'Money', sortOrder: 50 },
  { name: '收款单', code: 'payment_receipt', type: 'menu', path: '/payment-receipts', icon: 'CreditCard', parentCode: 'finance', sortOrder: 1 },
  { name: '付款单', code: 'payment_payment', type: 'menu', path: '/payment-payments', icon: 'Postcard', parentCode: 'finance', sortOrder: 2 },

  // 系统管理
  { name: '用户与权限', code: 'user_permission', type: 'menu', icon: 'User', sortOrder: 60 },
  { name: '人员管理', code: 'user', type: 'menu', path: '/users', icon: 'Avatar', parentCode: 'user_permission', sortOrder: 1 },
  { name: '角色权限', code: 'role', type: 'menu', path: '/roles', icon: 'Grid', parentCode: 'user_permission', sortOrder: 2 },
  { name: '菜单管理', code: 'menu_management', type: 'menu', path: '/menus', icon: 'Menu', parentCode: 'user_permission', sortOrder: 3 },

  // 工作流
  { name: '工作流', code: 'workflow', type: 'menu', icon: 'Guide', sortOrder: 70 },
  { name: '工作流管理', code: 'workflow_management', type: 'menu', path: '/workflows', icon: 'Guide', parentCode: 'workflow', sortOrder: 1 },
  { name: '审批中心', code: 'approval_center', type: 'menu', path: '/approvals', icon: 'Stamp', parentCode: 'workflow', sortOrder: 2 },

  // 设置
  { name: '系统设置', code: 'system_settings', type: 'menu', icon: 'Setting', sortOrder: 80 },
  { name: '单据编码规则', code: 'numbering_rule', type: 'menu', path: '/numbering-rules', icon: 'Document', parentCode: 'system_settings', sortOrder: 1 },
  { name: '账套参数', code: 'account_period', type: 'menu', path: '/account-period', icon: 'Calendar', parentCode: 'system_settings', sortOrder: 2 },
  { name: '账套初始化', code: 'account_init', type: 'menu', path: '/account-init', icon: 'Setting', parentCode: 'system_settings', sortOrder: 3 },
  { name: '期末处理', code: 'period_end', type: 'menu', path: '/period-end', icon: 'Calendar', parentCode: 'system_settings', sortOrder: 4 },
  { name: '租户信息', code: 'tenant_setting', type: 'menu', path: '/tenant-settings', icon: 'OfficeBuilding', parentCode: 'system_settings', sortOrder: 5 },
  { name: '功能开关', code: 'feature_settings', type: 'menu', path: '/feature-settings', icon: 'SetUp', parentCode: 'system_settings', sortOrder: 6 },
  { name: '安全设置', code: 'security_settings', type: 'menu', path: '/security-settings', icon: 'Lock', parentCode: 'system_settings', sortOrder: 7 },
  { name: '集成与文档', code: 'integrations', type: 'menu', path: '/integrations', icon: 'Connection', parentCode: 'system_settings', sortOrder: 8 },
  { name: 'API密钥', code: 'api_keys', type: 'menu', path: '/api-keys', icon: 'Key', parentCode: 'system_settings', sortOrder: 9 },
  { name: 'Webhook', code: 'webhook', type: 'menu', path: '/webhooks', icon: 'Connection', parentCode: 'system_settings', sortOrder: 10 },
  { name: '审计日志', code: 'audit_log', type: 'menu', path: '/audit-logs', icon: 'Document', parentCode: 'system_settings', sortOrder: 11 },
];

async function initMenus() {
  try {
    console.log('🚀 开始初始化菜单数据...\n');

    // 先获取所有现有菜单
    const existingMenus = await prisma.permission.findMany({
      where: { type: 'menu' }
    });

    console.log(`📊 数据库中已有 ${existingMenus.length} 个菜单`);

    // 创建菜单映射
    const menuMap = new Map();
    existingMenus.forEach(menu => {
      menuMap.set(menu.code, menu);
    });

    // 统计
    let created = 0;
    let updated = 0;
    let skipped = 0;

    // 按顺序创建/更新菜单
    for (const menu of defaultMenus) {
      const existingMenu = menuMap.get(menu.code);

      if (existingMenu) {
        // 更新现有菜单
        const parent = menu.parentCode ? menuMap.get(menu.parentCode) : null;

        await prisma.permission.update({
          where: { id: existingMenu.id },
          data: {
            name: menu.name,
            type: menu.type,
            path: menu.path || null,
            icon: menu.icon || null,
            parentId: parent?.id || null,
            sortOrder: menu.sortOrder,
            isSystem: true,
          }
        });

        // 更新内存中的映射
        menuMap.set(menu.code, { ...existingMenu, ...menu, id: existingMenu.id, parentId: parent?.id || null });

        updated++;
        console.log(`  ✅ 更新: [${menu.code}] ${menu.name}`);
      } else {
        // 创建新菜单
        const parent = menu.parentCode ? menuMap.get(menu.parentCode) : null;

        const newMenu = await prisma.permission.create({
          data: {
            name: menu.name,
            code: menu.code,
            type: menu.type,
            path: menu.path || null,
            icon: menu.icon || null,
            parentId: parent?.id || null,
            sortOrder: menu.sortOrder,
            isSystem: true,
          }
        });

        // 更新内存中的映射
        menuMap.set(menu.code, newMenu);

        created++;
        console.log(`  🆕 创建: [${menu.code}] ${menu.name}`);
      }
    }

    console.log('\n✅ 菜单初始化完成！');
    console.log(`   创建: ${created} 个`);
    console.log(`   更新: ${updated} 个`);

    // 显示最终菜单树
    console.log('\n📋 当前菜单结构：\n');
    const allMenus = await prisma.permission.findMany({
      where: { type: 'menu' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });

    const buildTree = (items, parentId = null, level = 0) => {
      const children = items.filter(m => m.parentId === parentId);
      return children.map(menu => {
        const indent = '  '.repeat(level);
        const prefix = level > 0 ? (level === 1 ? '├── ' : '│   ') : '';
        const hasChildren = items.some(m => m.parentId === menu.id);
        const childMarker = hasChildren ? ' 📁' : '';
        console.log(`${indent}${prefix}[${menu.code}] ${menu.name}${childMarker}`);
        buildTree(items, menu.id, level + 1);
      });
    };

    buildTree(allMenus);

  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行
initMenus();
