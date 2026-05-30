import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 预置权限数据
 * 系统初始化时使用
 */
export const defaultPermissions = [
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
  { name: '盘点单', code: 'stock_take', type: 'menu', path: '/stock-take', icon: 'Document', parentCode: 'inventory', sortOrder: 2 },
  { name: '查看盘点单', code: 'stock_take:read', type: 'button', parentCode: 'stock_take', sortOrder: 1 },
  { name: '新增盘点单', code: 'stock_take:create', type: 'button', parentCode: 'stock_take', sortOrder: 2 },
  { name: '编辑盘点单', code: 'stock_take:update', type: 'button', parentCode: 'stock_take', sortOrder: 3 },
  { name: '确认盘点单', code: 'stock_take:confirm', type: 'button', parentCode: 'stock_take', sortOrder: 4 },
  { name: '其他入库', code: 'other_inbound', type: 'menu', path: '/other-inbounds', icon: 'Box', parentCode: 'inventory', sortOrder: 3 },
  { name: '查看其他入库', code: 'other_inbound:read', type: 'button', parentCode: 'other_inbound', sortOrder: 1 },
  { name: '新增其他入库', code: 'other_inbound:create', type: 'button', parentCode: 'other_inbound', sortOrder: 2 },
  { name: '编辑其他入库', code: 'other_inbound:update', type: 'button', parentCode: 'other_inbound', sortOrder: 3 },
  { name: '确认其他入库', code: 'other_inbound:confirm', type: 'button', parentCode: 'other_inbound', sortOrder: 4 },
  { name: '其他出库', code: 'other_outbound', type: 'menu', path: '/other-outbounds', icon: 'Van', parentCode: 'inventory', sortOrder: 4 },
  { name: '查看其他出库', code: 'other_outbound:read', type: 'button', parentCode: 'other_outbound', sortOrder: 1 },
  { name: '新增其他出库', code: 'other_outbound:create', type: 'button', parentCode: 'other_outbound', sortOrder: 2 },
  { name: '编辑其他出库', code: 'other_outbound:update', type: 'button', parentCode: 'other_outbound', sortOrder: 3 },
  { name: '确认其他出库', code: 'other_outbound:confirm', type: 'button', parentCode: 'other_outbound', sortOrder: 4 },
  { name: '调拨单', code: 'stock_transfer', type: 'menu', path: '/stock-transfers', icon: 'Connection', parentCode: 'inventory', sortOrder: 5 },
  { name: '查看调拨单', code: 'stock_transfer:read', type: 'button', parentCode: 'stock_transfer', sortOrder: 1 },
  { name: '新增调拨单', code: 'stock_transfer:create', type: 'button', parentCode: 'stock_transfer', sortOrder: 2 },
  { name: '编辑调拨单', code: 'stock_transfer:update', type: 'button', parentCode: 'stock_transfer', sortOrder: 3 },
  { name: '确认调拨单', code: 'stock_transfer:confirm', type: 'button', parentCode: 'stock_transfer', sortOrder: 4 },

  // 微信商城
  { name: '微信商城', code: 'shop', type: 'menu', icon: 'ShoppingBag', sortOrder: 55 },
  { name: '商城商品', code: 'shop_product', type: 'menu', path: '/shop-products', icon: 'Goods', parentCode: 'shop', sortOrder: 1 },
  { name: '商城订单', code: 'shop_order', type: 'menu', path: '/shop-orders', icon: 'Tickets', parentCode: 'shop', sortOrder: 2 },
  { name: '商城用户', code: 'shop_user', type: 'menu', path: '/shop-users', icon: 'UserFilled', parentCode: 'shop', sortOrder: 3 },

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

  { name: '菜单管理', code: 'menu_management', type: 'menu', path: '/menus', icon: 'Menu', parentCode: 'user_permission', sortOrder: 3 },

  // 工作流
  { name: '工作流', code: 'workflow', type: 'menu', icon: 'Guide', sortOrder: 70 },
  { name: '工作流管理', code: 'workflow_management', type: 'menu', path: '/workflows', icon: 'Guide', parentCode: 'workflow', sortOrder: 1 },
  { name: '审批中心', code: 'approval_center', type: 'menu', path: '/approvals', icon: 'Stamp', parentCode: 'workflow', sortOrder: 2 },

  // 系统设置
  { name: '系统设置', code: 'system_settings', type: 'menu', icon: 'Setting', sortOrder: 80 },
  { name: '单据编码规则', code: 'numbering_rule', type: 'menu', path: '/numbering-rules', icon: 'Document', parentCode: 'system_settings', sortOrder: 1 },
  { name: '账套参数', code: 'account_period', type: 'menu', path: '/account-period', icon: 'Calendar', parentCode: 'system_settings', sortOrder: 2 },
  { name: '账套初始化', code: 'account_init', type: 'menu', path: '/account-init', icon: 'Setting', parentCode: 'system_settings', sortOrder: 3 },
  { name: '期末处理', code: 'period_end', type: 'menu', path: '/period-end', icon: 'Calendar', parentCode: 'system_settings', sortOrder: 4 },
  { name: '租户信息', code: 'tenant_setting', type: 'menu', path: '/tenant-settings', icon: 'OfficeBuilding', parentCode: 'system_settings', sortOrder: 5 },
  { name: '套餐与账单', code: 'subscription', type: 'menu', path: '/subscription', icon: 'CreditCard', parentCode: 'system_settings', sortOrder: 6 },
  { name: '功能开关', code: 'feature_settings', type: 'menu', path: '/feature-settings', icon: 'SetUp', parentCode: 'system_settings', sortOrder: 7 },
  { name: '安全设置', code: 'security_settings', type: 'menu', path: '/security-settings', icon: 'Lock', parentCode: 'system_settings', sortOrder: 8 },
  { name: '集成与文档', code: 'integrations', type: 'menu', path: '/integrations', icon: 'Connection', parentCode: 'system_settings', sortOrder: 9 },
  { name: 'API密钥', code: 'api_keys', type: 'menu', path: '/api-keys', icon: 'Key', parentCode: 'system_settings', sortOrder: 10 },
  { name: 'Webhook', code: 'webhook', type: 'menu', path: '/webhooks', icon: 'Connection', parentCode: 'system_settings', sortOrder: 11 },
  { name: '审计日志', code: 'audit_log', type: 'menu', path: '/audit-logs', icon: 'Document', parentCode: 'system_settings', sortOrder: 12 },
  { name: '数据重算', code: 'recalculate', type: 'menu', path: '/recalculate', icon: 'Refresh', parentCode: 'system_settings', sortOrder: 13 },
];

/**
 * 初始化权限数据
 * 系统启动时调用，支持增量补全缺失的权限
 */
export const initPermissions = async () => {
  try {
    const existingCount = await prisma.permission.count();

    if (existingCount === 0) {
      // 空数据库：全量初始化
      console.log('开始全量初始化权限数据...');
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
      }
      console.log(`权限数据全量初始化完成，共 ${defaultPermissions.length} 条`);
    } else {
      // 已有数据：增量补全缺失的权限
      const existingCodes = new Set(
        (await prisma.permission.findMany({ select: { code: true } })).map(p => p.code)
      );

      const missingPerms = defaultPermissions.filter(p => !existingCodes.has(p.code));

      if (missingPerms.length === 0) {
        console.log('权限数据完整，无需补全');
        return;
      }

      console.log(`检测到 ${missingPerms.length} 条缺失权限，开始补全...`);

      // 需要按依赖顺序处理：先创建没有 parentCode 的，再创建有 parentCode 的
      const noParent = missingPerms.filter(p => !p.parentCode);
      const hasParent = missingPerms.filter(p => p.parentCode);

      // 先创建顶级权限（无父级）
      for (const perm of noParent) {
        await prisma.permission.create({
          data: {
            name: perm.name,
            code: perm.code,
            type: perm.type,
            parentId: null,
            path: perm.path || null,
            icon: perm.icon || null,
            sortOrder: perm.sortOrder,
            isSystem: true,
          },
        });
        existingCodes.add(perm.code); // 更新缓存，方便后续子权限查找父级
        console.log(`  + 补全: [${perm.code}] ${perm.name}`);
      }

      // 再创建子权限（有父级）
      for (const perm of hasParent) {
        const parent = await prisma.permission.findUnique({ where: { code: perm.parentCode! } });
        if (!parent) {
          console.warn(`  ⚠ 跳过 [${perm.code}] ${perm.name}：父权限 [${perm.parentCode}] 不存在`);
          continue;
        }

        await prisma.permission.create({
          data: {
            name: perm.name,
            code: perm.code,
            type: perm.type,
            parentId: parent.id,
            path: perm.path || null,
            icon: perm.icon || null,
            sortOrder: perm.sortOrder,
            isSystem: true,
          },
        });
        console.log(`  + 补全: [${perm.code}] ${perm.name} (父: ${perm.parentCode})`);
      }

      console.log(`权限数据补全完成，新增 ${missingPerms.length} 条`);
    }
  } catch (error) {
    console.error('初始化权限数据失败:', error);
  }
};

/**
 * 获取权限树
 * GET /api/v1/permissions
 */
export const getPermissions = async (req: Request, res: Response) => {
  try {
    // 获取所有权限
    const permissions = await prisma.permission.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // 构建树形结构
    const buildTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };

    const tree = buildTree(permissions);

    return res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error('获取权限树错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取权限树失败',
    });
  }
};

/**
 * 获取当前用户的权限
 * GET /api/v1/permissions/me
 */
export const getMyPermissions = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: '未登录',
      });
    }

    // 超级管理员拥有所有权限
    if (req.user.role === 'super_admin') {
      const allPermissions = await prisma.permission.findMany();

      const allMenus = allPermissions.filter(p => p.type === 'menu' && p.path);

      return res.json({
        success: true,
        data: {
          permissions: allPermissions.map(p => p.code),
          menus: allMenus,
        },
      });
    }

    // 获取用户的所有角色
    const userRoles = await prisma.userRole.findMany({
      where: { userId: req.user.id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // 提取所有权限
    const permissionSet = new Set<string>();
    const menuPermissions: any[] = [];

    for (const userRole of userRoles) {
      if (userRole.role.status !== 'active') continue;

      for (const rp of userRole.role.rolePermissions) {
        permissionSet.add(rp.permission.code);

        // 收集菜单权限
        if (rp.permission.type === 'menu' && rp.permission.path) {
          menuPermissions.push(rp.permission);
        }
      }
    }

    return res.json({
      success: true,
      data: {
        permissions: Array.from(permissionSet),
        menus: menuPermissions,
      },
    });
  } catch (error) {
    console.error('获取用户权限错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户权限失败',
    });
  }
};

/**
 * 获取当前用户的菜单
 * GET /api/v1/permissions/menu
 */
export const getMyMenu = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: '未登录',
      });
    }

    // 获取所有菜单，用于构建树形结构
    const allMenus = await prisma.permission.findMany({
      where: { type: 'menu' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // 如果是超级管理员，返回所有菜单
    if (req.user.role === 'super_admin') {
      const buildTree = (items: any[], parentId: string | null = null): any[] => {
        return items
          .filter(item => item.parentId === parentId)
          .map(item => ({
            ...item,
            children: buildTree(items, item.id),
            hasChildren: items.some(i => i.parentId === item.id),
          }));
      };

      const tree = buildTree(allMenus);

      return res.json({
        success: true,
        data: tree,
      });
    }

    // 获取用户的所有角色
    const userRoles = await prisma.userRole.findMany({
      where: { userId: req.user.id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // 收集用户有权限访问的菜单 code
    const accessibleMenuCodes = new Set();

    for (const userRole of userRoles) {
      if (userRole.role.status !== 'active') continue;

      for (const rp of userRole.role.rolePermissions) {
        if (rp.permission.type === 'menu') {
          accessibleMenuCodes.add(rp.permission.code);
        }
      }
    }

    // 构建包含所有父级菜单的完整菜单树
    const buildAccessibleTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter(item => {
          // 如果是父级菜单，只要有子菜单可用就保留
          const hasAccessibleChildren = items.some(child => 
            child.parentId === item.id && accessibleMenuCodes.has(child.code)
          );
          // 如果是叶子菜单，需要有权限
          const isAccessible = accessibleMenuCodes.has(item.code);
          // 保留有子菜单或有权限的菜单
          return item.parentId === parentId && (hasAccessibleChildren || isAccessible);
        })
        .map(item => ({
          ...item,
          children: buildAccessibleTree(items, item.id),
          hasChildren: items.some(i => i.parentId === item.id),
        }));
    };

    const tree = buildAccessibleTree(allMenus);

    return res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error('获取用户菜单错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户菜单失败',
    });
  }
};

export default {
  getPermissions,
  getMyPermissions,
  getMyMenu,
  initPermissions,
};
