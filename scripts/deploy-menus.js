const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const completeMenus = [
  // 仪表盘
  { name: '仪表盘', code: 'dashboard', type: 'menu', path: '/', icon: 'Odometer', sortOrder: 1, parentCode: null },

  // 基础资料
  { name: '基础资料', code: 'basic', type: 'menu', path: null, icon: 'Files', sortOrder: 10, parentCode: null },
  { name: '供应商管理', code: 'supplier', type: 'menu', path: '/suppliers', icon: 'OfficeBuilding', sortOrder: 1, parentCode: 'basic' },
  { name: '客户管理', code: 'customer', type: 'menu', path: '/customers', icon: 'UserFilled', sortOrder: 2, parentCode: 'basic' },
  { name: '物料管理', code: 'product', type: 'menu', path: '/products', icon: 'Goods', sortOrder: 3, parentCode: 'basic' },
  { name: '仓库管理', code: 'warehouse', type: 'menu', path: '/warehouses', icon: 'House', sortOrder: 4, parentCode: 'basic' },
  { name: '账户管理', code: 'account', type: 'menu', path: '/accounts', icon: 'Wallet', sortOrder: 5, parentCode: 'basic' },

  // 采购管理
  { name: '采购管理', code: 'purchase', type: 'menu', path: null, icon: 'ShoppingCart', sortOrder: 20, parentCode: null },
  { name: '采购订单', code: 'purchase_order', type: 'menu', path: '/purchase-orders', icon: 'List', sortOrder: 1, parentCode: 'purchase' },
  { name: '采购入库', code: 'purchase_inbound', type: 'menu', path: '/purchase-inbounds', icon: 'Box', sortOrder: 2, parentCode: 'purchase' },

  // 销售管理
  { name: '销售管理', code: 'sales', type: 'menu', path: null, icon: 'Sell', sortOrder: 30, parentCode: null },
  { name: '销售订单', code: 'sales_order', type: 'menu', path: '/sales-orders', icon: 'Tickets', sortOrder: 1, parentCode: 'sales' },
  { name: '销售出库', code: 'sales_outbound', type: 'menu', path: '/sales-outbounds', icon: 'Van', sortOrder: 2, parentCode: 'sales' },

  // 库存管理
  { name: '库存管理', code: 'inventory', type: 'menu', path: null, icon: 'Package', sortOrder: 40, parentCode: null },
  { name: '库存查询', code: 'inventory_query', type: 'menu', path: '/inventory', icon: 'Search', sortOrder: 1, parentCode: 'inventory' },
  { name: '盘点单', code: 'stock_take', type: 'menu', path: '/stock-take', icon: 'Document', sortOrder: 2, parentCode: 'inventory' },
  { name: '其他入库', code: 'other_inbound', type: 'menu', path: '/other-inbounds', icon: 'Box', sortOrder: 3, parentCode: 'inventory' },
  { name: '其他出库', code: 'other_outbound', type: 'menu', path: '/other-outbounds', icon: 'Van', sortOrder: 4, parentCode: 'inventory' },
  { name: '调拨单', code: 'stock_transfer', type: 'menu', path: '/stock-transfers', icon: 'Connection', sortOrder: 5, parentCode: 'inventory' },

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

  // 财务管理
  { name: '财务管理', code: 'finance', type: 'menu', path: null, icon: 'Money', sortOrder: 50, parentCode: null },
  { name: '收款单', code: 'payment_receipt', type: 'menu', path: '/payment-receipts', icon: 'CreditCard', sortOrder: 1, parentCode: 'finance' },
  { name: '付款单', code: 'payment_payment', type: 'menu', path: '/payment-payments', icon: 'Postcard', sortOrder: 2, parentCode: 'finance' },

  // 用户与权限
  { name: '用户与权限', code: 'user_permission', type: 'menu', path: null, icon: 'User', sortOrder: 60, parentCode: null },
  { name: '人员管理', code: 'user', type: 'menu', path: '/users', icon: 'Avatar', sortOrder: 1, parentCode: 'user_permission' },
  { name: '角色权限', code: 'role', type: 'menu', path: '/roles', icon: 'Grid', sortOrder: 2, parentCode: 'user_permission' },
  { name: '菜单管理', code: 'menu_management', type: 'menu', path: '/menus', icon: 'Menu', sortOrder: 3, parentCode: 'user_permission' },

  // 工作流
  { name: '工作流', code: 'workflow', type: 'menu', path: null, icon: 'Guide', sortOrder: 70, parentCode: null },
  { name: '工作流管理', code: 'workflow_management', type: 'menu', path: '/workflows', icon: 'Guide', sortOrder: 1, parentCode: 'workflow' },
  { name: '审批中心', code: 'approval_center', type: 'menu', path: '/approvals', icon: 'Stamp', sortOrder: 2, parentCode: 'workflow' },

  // 系统设置
  { name: '系统设置', code: 'system_settings', type: 'menu', path: null, icon: 'Setting', sortOrder: 80, parentCode: null },
  { name: '单据编码规则', code: 'numbering_rule', type: 'menu', path: '/numbering-rules', icon: 'Document', sortOrder: 1, parentCode: 'system_settings' },
  { name: '账套参数', code: 'account_period', type: 'menu', path: '/account-period', icon: 'Calendar', sortOrder: 2, parentCode: 'system_settings' },
  { name: '账套初始化', code: 'account_init', type: 'menu', path: '/account-init', icon: 'Setting', sortOrder: 3, parentCode: 'system_settings' },
  { name: '期末处理', code: 'period_end', type: 'menu', path: '/period-end', icon: 'Calendar', sortOrder: 4, parentCode: 'system_settings' },
  { name: '租户信息', code: 'tenant_setting', type: 'menu', path: '/tenant-settings', icon: 'OfficeBuilding', sortOrder: 5, parentCode: 'system_settings' },
  { name: '套餐与账单', code: 'subscription', type: 'menu', path: '/subscription', icon: 'CreditCard', sortOrder: 6, parentCode: 'system_settings' },
  { name: '功能开关', code: 'feature_settings', type: 'menu', path: '/feature-settings', icon: 'Switch', sortOrder: 7, parentCode: 'system_settings' },
  { name: '安全设置', code: 'security_settings', type: 'menu', path: '/security-settings', icon: 'Lock', sortOrder: 8, parentCode: 'system_settings' },
  { name: '集成与文档', code: 'integrations', type: 'menu', path: '/integrations', icon: 'Connection', sortOrder: 9, parentCode: 'system_settings' },
  { name: 'API密钥', code: 'api_keys', type: 'menu', path: '/api-keys', icon: 'Key', sortOrder: 10, parentCode: 'system_settings' },
  { name: 'Webhook', code: 'webhook', type: 'menu', path: '/webhooks', icon: 'Connection', sortOrder: 11, parentCode: 'system_settings' },
  { name: '审计日志', code: 'audit_log', type: 'menu', path: '/audit-logs', icon: 'Document', sortOrder: 12, parentCode: 'system_settings' },
  { name: '数据重算', code: 'recalculate', type: 'menu', path: '/recalculate', icon: 'Refresh', sortOrder: 13, parentCode: 'system_settings' },

  // SaaS 管理
  { name: 'SaaS管理', code: 'saas_management', type: 'menu', path: null, icon: 'OfficeBuilding', sortOrder: 85, parentCode: null },
  { name: '租户管理', code: 'tenant_management', type: 'menu', path: '/tenants', icon: 'UserFilled', sortOrder: 1, parentCode: 'saas_management' },

  // 帮助与支持
  { name: '帮助与支持', code: 'help', type: 'menu', path: '/help', icon: 'QuestionFilled', sortOrder: 90, parentCode: null },
];

// 微信商城（可能已存在）
const shopMenus = [
  { name: '微信商城', code: 'shop', type: 'menu', path: null, icon: 'ShoppingCart', sortOrder: 55, parentCode: null },
  { name: '商城商品', code: 'shop_product', type: 'menu', path: '/shop-products', icon: 'Goods', sortOrder: 1, parentCode: 'shop' },
  { name: '商城订单', code: 'shop_order', type: 'menu', path: '/shop-orders', icon: 'Tickets', sortOrder: 2, parentCode: 'shop' },
  { name: '商城用户', code: 'shop_user', type: 'menu', path: '/shop-users', icon: 'UserFilled', sortOrder: 3, parentCode: 'shop' },
];

async function deployMenus() {
  console.log('🚀 开始部署菜单到生产环境...\n');

  try {
    // 获取所有现有菜单
    const existingMenus = await prisma.permission.findMany({
      where: { type: 'menu' }
    });

    console.log(`📊 生产环境已有 ${existingMenus.length} 个菜单\n`);

    // 创建菜单映射表（code -> menu）
    const menuMap = new Map();
    existingMenus.forEach(menu => {
      menuMap.set(menu.code, menu);
    });

    // 合并所有菜单
    const allMenusToDeploy = [...completeMenus, ...shopMenus.filter(m => !menuMap.has(m.code))];

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // 按顺序创建/更新菜单
    for (const menuData of allMenusToDeploy) {
      const existingMenu = menuMap.get(menuData.code);

      // 查找父菜单ID
      const parentId = menuData.parentCode ? menuMap.get(menuData.parentCode)?.id : null;

      // 如果有父菜单但找不到父菜单ID，跳过
      if (menuData.parentCode && !parentId) {
        skipped++;
        console.log(`  ⏭️  跳过: [${menuData.code}] ${menuData.name} (找不到父菜单 ${menuData.parentCode})`);
        continue;
      }

      if (existingMenu) {
        // 更新现有菜单
        await prisma.permission.update({
          where: { id: existingMenu.id },
          data: {
            name: menuData.name,
            type: menuData.type,
            path: menuData.path,
            icon: menuData.icon,
            parentId: parentId,
            sortOrder: menuData.sortOrder,
            isSystem: true,
          }
        });

        // 更新映射表
        menuMap.set(menuData.code, {
          ...existingMenu,
          parentId,
          sortOrder: menuData.sortOrder
        });

        updated++;
        console.log(`  ✅ 更新: [${menuData.code}] ${menuData.name}`);
      } else {
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
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 菜单部署完成！');
    console.log(`   创建: ${created} 个`);
    console.log(`   更新: ${updated} 个`);
    console.log(`   跳过: ${skipped} 个`);
    console.log('='.repeat(80));

    // 显示最终菜单树
    console.log('\n📋 生产环境完整菜单结构：\n');
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
        console.log(`${indent}${prefix}${menu.name}${childMarker}${pathInfo}`);
        buildTree(items, menu.id, level + 1);
      });
    };

    buildTree(allMenus);

    console.log('\n💡 提示：共 ' + allMenus.length + ' 个菜单，部署成功！');

  } catch (error) {
    console.error('\n❌ 部署菜单失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deployMenus();
