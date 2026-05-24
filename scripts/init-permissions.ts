/**
 * 初始化权限数据脚本
 * 运行: npx ts-node scripts/init-permissions.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPermissions = [
  // 仪表盘
  { name: '仪表盘', code: 'dashboard', type: 'menu', path: '/', icon: 'Odometer', sortOrder: 1 },
  { name: '查看仪表盘', code: 'dashboard:view', type: 'button', parentCode: 'dashboard', sortOrder: 1 },

  // 基础资料
  { name: '基础资料', code: 'basic', type: 'menu', icon: 'Files', sortOrder: 10 },
  { name: '供应商管理', code: 'supplier', type: 'menu', path: '/suppliers', icon: 'OfficeBuilding', parentCode: 'basic', sortOrder: 1 },
  { name: '查看供应商', code: 'supplier:read', type: 'button', parentCode: 'supplier', sortOrder: 1 },
  { name: '新增供应商', code: 'supplier:create', type: 'button', parentCode: 'supplier', sortOrder: 2 },
  { name: '编辑供应商', code: 'supplier:update', type: 'button', parentCode: 'supplier', sortOrder: 3 },
  { name: '删除供应商', code: 'supplier:delete', type: 'button', parentCode: 'supplier', sortOrder: 4 },

  { name: '客户管理', code: 'customer', type: 'menu', path: '/customers', icon: 'UserFilled', parentCode: 'basic', sortOrder: 2 },
  { name: '查看客户', code: 'customer:read', type: 'button', parentCode: 'customer', sortOrder: 1 },
  { name: '新增客户', code: 'customer:create', type: 'button', parentCode: 'customer', sortOrder: 2 },
  { name: '编辑客户', code: 'customer:update', type: 'button', parentCode: 'customer', sortOrder: 3 },
  { name: '删除客户', code: 'customer:delete', type: 'button', parentCode: 'customer', sortOrder: 4 },

  { name: '物料管理', code: 'product', type: 'menu', path: '/products', icon: 'Goods', parentCode: 'basic', sortOrder: 3 },
  { name: '查看物料', code: 'product:read', type: 'button', parentCode: 'product', sortOrder: 1 },
  { name: '新增物料', code: 'product:create', type: 'button', parentCode: 'product', sortOrder: 2 },
  { name: '编辑物料', code: 'product:update', type: 'button', parentCode: 'product', sortOrder: 3 },
  { name: '删除物料', code: 'product:delete', type: 'button', parentCode: 'product', sortOrder: 4 },

  { name: '仓库管理', code: 'warehouse', type: 'menu', path: '/warehouses', icon: 'House', parentCode: 'basic', sortOrder: 4 },
  { name: '查看仓库', code: 'warehouse:read', type: 'button', parentCode: 'warehouse', sortOrder: 1 },
  { name: '新增仓库', code: 'warehouse:create', type: 'button', parentCode: 'warehouse', sortOrder: 2 },
  { name: '编辑仓库', code: 'warehouse:update', type: 'button', parentCode: 'warehouse', sortOrder: 3 },
  { name: '删除仓库', code: 'warehouse:delete', type: 'button', parentCode: 'warehouse', sortOrder: 4 },

  { name: '账户管理', code: 'account', type: 'menu', path: '/accounts', icon: 'Wallet', parentCode: 'basic', sortOrder: 5 },
  { name: '查看账户', code: 'account:read', type: 'button', parentCode: 'account', sortOrder: 1 },
  { name: '新增账户', code: 'account:create', type: 'button', parentCode: 'account', sortOrder: 2 },
  { name: '编辑账户', code: 'account:update', type: 'button', parentCode: 'account', sortOrder: 3 },
  { name: '删除账户', code: 'account:delete', type: 'button', parentCode: 'account', sortOrder: 4 },

  // 采购管理
  { name: '采购管理', code: 'purchase', type: 'menu', icon: 'ShoppingCart', sortOrder: 20 },
  { name: '采购订单', code: 'purchase_order', type: 'menu', path: '/purchase-orders', icon: 'List', parentCode: 'purchase', sortOrder: 1 },
  { name: '查看采购订单', code: 'purchase_order:read', type: 'button', parentCode: 'purchase_order', sortOrder: 1 },
  { name: '新增采购订单', code: 'purchase_order:create', type: 'button', parentCode: 'purchase_order', sortOrder: 2 },
  { name: '编辑采购订单', code: 'purchase_order:update', type: 'button', parentCode: 'purchase_order', sortOrder: 3 },
  { name: '删除采购订单', code: 'purchase_order:delete', type: 'button', parentCode: 'purchase_order', sortOrder: 4 },
  { name: '确认采购订单', code: 'purchase_order:confirm', type: 'button', parentCode: 'purchase_order', sortOrder: 5 },

  { name: '采购入库', code: 'purchase_inbound', type: 'menu', path: '/purchase-inbounds', icon: 'Box', parentCode: 'purchase', sortOrder: 2 },
  { name: '查看采购入库', code: 'purchase_inbound:read', type: 'button', parentCode: 'purchase_inbound', sortOrder: 1 },
  { name: '新增采购入库', code: 'purchase_inbound:create', type: 'button', parentCode: 'purchase_inbound', sortOrder: 2 },
  { name: '编辑采购入库', code: 'purchase_inbound:update', type: 'button', parentCode: 'purchase_inbound', sortOrder: 3 },
  { name: '删除采购入库', code: 'purchase_inbound:delete', type: 'button', parentCode: 'purchase_inbound', sortOrder: 4 },
  { name: '确认采购入库', code: 'purchase_inbound:confirm', type: 'button', parentCode: 'purchase_inbound', sortOrder: 5 },

  // 销售管理
  { name: '销售管理', code: 'sales', type: 'menu', icon: 'Sell', sortOrder: 30 },
  { name: '销售订单', code: 'sales_order', type: 'menu', path: '/sales-orders', icon: 'Tickets', parentCode: 'sales', sortOrder: 1 },
  { name: '查看销售订单', code: 'sales_order:read', type: 'button', parentCode: 'sales_order', sortOrder: 1 },
  { name: '新增销售订单', code: 'sales_order:create', type: 'button', parentCode: 'sales_order', sortOrder: 2 },
  { name: '编辑销售订单', code: 'sales_order:update', type: 'button', parentCode: 'sales_order', sortOrder: 3 },
  { name: '删除销售订单', code: 'sales_order:delete', type: 'button', parentCode: 'sales_order', sortOrder: 4 },
  { name: '确认销售订单', code: 'sales_order:confirm', type: 'button', parentCode: 'sales_order', sortOrder: 5 },

  { name: '销售出库', code: 'sales_outbound', type: 'menu', path: '/sales-outbounds', icon: 'Van', parentCode: 'sales', sortOrder: 2 },
  { name: '查看销售出库', code: 'sales_outbound:read', type: 'button', parentCode: 'sales_outbound', sortOrder: 1 },
  { name: '新增销售出库', code: 'sales_outbound:create', type: 'button', parentCode: 'sales_outbound', sortOrder: 2 },
  { name: '编辑销售出库', code: 'sales_outbound:update', type: 'button', parentCode: 'sales_outbound', sortOrder: 3 },
  { name: '删除销售出库', code: 'sales_outbound:delete', type: 'button', parentCode: 'sales_outbound', sortOrder: 4 },
  { name: '确认销售出库', code: 'sales_outbound:confirm', type: 'button', parentCode: 'sales_outbound', sortOrder: 5 },

  // 财务管理
  { name: '财务管理', code: 'finance', type: 'menu', icon: 'Money', sortOrder: 40 },
  { name: '收款单', code: 'payment_receipt', type: 'menu', path: '/payment-receipts', icon: 'CreditCard', parentCode: 'finance', sortOrder: 1 },
  { name: '查看收款单', code: 'payment_receipt:read', type: 'button', parentCode: 'payment_receipt', sortOrder: 1 },
  { name: '新增收款单', code: 'payment_receipt:create', type: 'button', parentCode: 'payment_receipt', sortOrder: 2 },
  { name: '编辑收款单', code: 'payment_receipt:update', type: 'button', parentCode: 'payment_receipt', sortOrder: 3 },
  { name: '删除收款单', code: 'payment_receipt:delete', type: 'button', parentCode: 'payment_receipt', sortOrder: 4 },
  { name: '确认收款', code: 'payment_receipt:confirm', type: 'button', parentCode: 'payment_receipt', sortOrder: 5 },

  { name: '付款单', code: 'payment_payment', type: 'menu', path: '/payment-payments', icon: 'Postcard', parentCode: 'finance', sortOrder: 2 },
  { name: '查看付款单', code: 'payment_payment:read', type: 'button', parentCode: 'payment_payment', sortOrder: 1 },
  { name: '新增付款单', code: 'payment_payment:create', type: 'button', parentCode: 'payment_payment', sortOrder: 2 },
  { name: '编辑付款单', code: 'payment_payment:update', type: 'button', parentCode: 'payment_payment', sortOrder: 3 },
  { name: '删除付款单', code: 'payment_payment:delete', type: 'button', parentCode: 'payment_payment', sortOrder: 4 },
  { name: '确认付款', code: 'payment_payment:confirm', type: 'button', parentCode: 'payment_payment', sortOrder: 5 },

  // 库存管理
  { name: '库存管理', code: 'inventory', type: 'menu', icon: 'Package', sortOrder: 50 },
  { name: '库存查询', code: 'inventory_query', type: 'menu', path: '/inventory', icon: 'Search', parentCode: 'inventory', sortOrder: 1 },
  { name: '查看库存', code: 'inventory:read', type: 'button', parentCode: 'inventory_query', sortOrder: 1 },
  { name: '库存调整', code: 'inventory:adjust', type: 'button', parentCode: 'inventory_query', sortOrder: 2 },

  // 用户与权限
  { name: '用户与权限', code: 'user_permission', type: 'menu', icon: 'User', sortOrder: 60 },
  { name: '用户管理', code: 'user', type: 'menu', path: '/users', icon: 'Avatar', parentCode: 'user_permission', sortOrder: 1 },
  { name: '查看用户', code: 'user:read', type: 'button', parentCode: 'user', sortOrder: 1 },
  { name: '新增用户', code: 'user:create', type: 'button', parentCode: 'user', sortOrder: 2 },
  { name: '编辑用户', code: 'user:update', type: 'button', parentCode: 'user', sortOrder: 3 },
  { name: '删除用户', code: 'user:delete', type: 'button', parentCode: 'user', sortOrder: 4 },
  { name: '分配角色', code: 'user:assign_role', type: 'button', parentCode: 'user', sortOrder: 5 },

  { name: '角色权限', code: 'role', type: 'menu', path: '/roles', icon: 'Grid', parentCode: 'user_permission', sortOrder: 2 },
  { name: '查看角色', code: 'role:read', type: 'button', parentCode: 'role', sortOrder: 1 },
  { name: '新增角色', code: 'role:create', type: 'button', parentCode: 'role', sortOrder: 2 },
  { name: '编辑角色', code: 'role:update', type: 'button', parentCode: 'role', sortOrder: 3 },
  { name: '删除角色', code: 'role:delete', type: 'button', parentCode: 'role', sortOrder: 4 },
  { name: '配置权限', code: 'role:permission', type: 'button', parentCode: 'role', sortOrder: 5 },
];

async function initPermissions() {
  try {
    console.log('开始初始化权限数据...');

    // 检查是否已有权限数据
    const existingCount = await prisma.permission.count();
    if (existingCount > 0) {
      console.log(`权限数据已存在 (${existingCount} 条)，跳过初始化`);
      return;
    }

    // 创建权限数据
    for (const perm of defaultPermissions) {
      const parent = perm.parentCode
        ? await prisma.permission.findUnique({ where: { code: perm.parentCode } })
        : null;

      await prisma.permission.create({
        data: {
          name: perm.name,
          code: perm.code,
          type: perm.type,
          parentId: parent?.id || null,
          path: perm.path || null,
          icon: perm.icon || null,
          sortOrder: perm.sortOrder,
          isSystem: true,
        },
      });

      console.log(`  创建权限: ${perm.name} (${perm.code})`);
    }

    console.log(`权限数据初始化完成，共 ${defaultPermissions.length} 条`);
  } catch (error) {
    console.error('初始化权限数据失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initPermissions()
  .then(() => {
    console.log('完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('失败:', error);
    process.exit(1);
  });
