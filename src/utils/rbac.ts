/**
 * 基于角色的访问控制 (RBAC) 系统
 * Role-Based Access Control System
 */

// 权限定义
export enum Permission {
  // 用户管理
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE = 'user:manage',

  // 供应商管理
  SUPPLIER_VIEW = 'supplier:view',
  SUPPLIER_CREATE = 'supplier:create',
  SUPPLIER_UPDATE = 'supplier:update',
  SUPPLIER_DELETE = 'supplier:delete',
  SUPPLIER_MANAGE = 'supplier:manage',

  // 客户管理
  CUSTOMER_VIEW = 'customer:view',
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_UPDATE = 'customer:update',
  CUSTOMER_DELETE = 'customer:delete',
  CUSTOMER_MANAGE = 'customer:manage',

  // 物料管理
  PRODUCT_VIEW = 'product:view',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',
  PRODUCT_MANAGE = 'product:manage',

  // 仓库管理
  WAREHOUSE_VIEW = 'warehouse:view',
  WAREHOUSE_CREATE = 'warehouse:create',
  WAREHOUSE_UPDATE = 'warehouse:update',
  WAREHOUSE_DELETE = 'warehouse:delete',
  WAREHOUSE_MANAGE = 'warehouse:manage',

  // 采购管理
  PURCHASE_VIEW = 'purchase:view',
  PURCHASE_CREATE = 'purchase:create',
  PURCHASE_UPDATE = 'purchase:update',
  PURCHASE_DELETE = 'purchase:delete',
  PURCHASE_CONFIRM = 'purchase:confirm',
  PURCHASE_CANCEL = 'purchase:cancel',
  PURCHASE_MANAGE = 'purchase:manage',

  // 销售管理
  SALES_VIEW = 'sales:view',
  SALES_CREATE = 'sales:create',
  SALES_UPDATE = 'sales:update',
  SALES_DELETE = 'sales:delete',
  SALES_CONFIRM = 'sales:confirm',
  SALES_CANCEL = 'sales:cancel',
  SALES_MANAGE = 'sales:manage',

  // 库存管理
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_INBOUND = 'inventory:inbound',
  INVENTORY_OUTBOUND = 'inventory:outbound',
  INVENTORY_TRANSFER = 'inventory:transfer',
  INVENTORY_ADJUST = 'inventory:adjust',
  INVENTORY_MANAGE = 'inventory:manage',

  // 财务管理
  FINANCE_VIEW = 'finance:view',
  FINANCE_RECEIPT = 'finance:receipt',
  FINANCE_PAYMENT = 'finance:payment',
  FINANCE_MANAGE = 'finance:manage',

  // 报表分析
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',
  REPORT_MANAGE = 'report:manage',

  // 系统设置
  SETTING_VIEW = 'setting:view',
  SETTING_UPDATE = 'setting:update',
  SETTING_MANAGE = 'setting:manage',

  // 审计日志
  AUDIT_VIEW = 'audit:view',

  // API访问
  API_ACCESS = 'api:access',
  WEBHOOK_MANAGE = 'webhook:manage',
}

// 角色定义
export enum Role {
  SUPER_ADMIN = 'super_admin',      // 超级管理员 - 系统级
  TENANT_ADMIN = 'tenant_admin',    // 租户管理员 - 租户级
  ADMIN = 'admin',                  // 管理员
  MANAGER = 'manager',              // 经理
  STAFF = 'staff',                  // 职员
  VIEWER = 'viewer',                // 查看者
  GUEST = 'guest',                  // 访客
}

// 角色权限映射
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission), // 拥有所有权限

  [Role.TENANT_ADMIN]: [
    // 用户管理
    Permission.USER_VIEW, Permission.USER_CREATE, Permission.USER_UPDATE, Permission.USER_DELETE, Permission.USER_MANAGE,
    // 供应商管理
    Permission.SUPPLIER_VIEW, Permission.SUPPLIER_CREATE, Permission.SUPPLIER_UPDATE, Permission.SUPPLIER_DELETE, Permission.SUPPLIER_MANAGE,
    // 客户管理
    Permission.CUSTOMER_VIEW, Permission.CUSTOMER_CREATE, Permission.CUSTOMER_UPDATE, Permission.CUSTOMER_DELETE, Permission.CUSTOMER_MANAGE,
    // 物料管理
    Permission.PRODUCT_VIEW, Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE, Permission.PRODUCT_MANAGE,
    // 仓库管理
    Permission.WAREHOUSE_VIEW, Permission.WAREHOUSE_CREATE, Permission.WAREHOUSE_UPDATE, Permission.WAREHOUSE_DELETE, Permission.WAREHOUSE_MANAGE,
    // 采购管理
    Permission.PURCHASE_VIEW, Permission.PURCHASE_CREATE, Permission.PURCHASE_UPDATE, Permission.PURCHASE_DELETE,
    Permission.PURCHASE_CONFIRM, Permission.PURCHASE_CANCEL, Permission.PURCHASE_MANAGE,
    // 销售管理
    Permission.SALES_VIEW, Permission.SALES_CREATE, Permission.SALES_UPDATE, Permission.SALES_DELETE,
    Permission.SALES_CONFIRM, Permission.SALES_CANCEL, Permission.SALES_MANAGE,
    // 库存管理
    Permission.INVENTORY_VIEW, Permission.INVENTORY_INBOUND, Permission.INVENTORY_OUTBOUND,
    Permission.INVENTORY_TRANSFER, Permission.INVENTORY_ADJUST, Permission.INVENTORY_MANAGE,
    // 财务管理
    Permission.FINANCE_VIEW, Permission.FINANCE_RECEIPT, Permission.FINANCE_PAYMENT, Permission.FINANCE_MANAGE,
    // 报表分析
    Permission.REPORT_VIEW, Permission.REPORT_EXPORT, Permission.REPORT_MANAGE,
    // 系统设置
    Permission.SETTING_VIEW, Permission.SETTING_UPDATE, Permission.SETTING_MANAGE,
    // 审计日志
    Permission.AUDIT_VIEW,
    // API访问
    Permission.API_ACCESS, Permission.WEBHOOK_MANAGE,
  ],

  [Role.ADMIN]: [
    // 用户管理（不能删除其他管理员）
    Permission.USER_VIEW, Permission.USER_CREATE, Permission.USER_UPDATE,
    // 供应商管理
    Permission.SUPPLIER_VIEW, Permission.SUPPLIER_CREATE, Permission.SUPPLIER_UPDATE, Permission.SUPPLIER_DELETE, Permission.SUPPLIER_MANAGE,
    // 客户管理
    Permission.CUSTOMER_VIEW, Permission.CUSTOMER_CREATE, Permission.CUSTOMER_UPDATE, Permission.CUSTOMER_DELETE, Permission.CUSTOMER_MANAGE,
    // 物料管理
    Permission.PRODUCT_VIEW, Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE, Permission.PRODUCT_MANAGE,
    // 仓库管理
    Permission.WAREHOUSE_VIEW, Permission.WAREHOUSE_CREATE, Permission.WAREHOUSE_UPDATE, Permission.WAREHOUSE_DELETE, Permission.WAREHOUSE_MANAGE,
    // 采购管理
    Permission.PURCHASE_VIEW, Permission.PURCHASE_CREATE, Permission.PURCHASE_UPDATE, Permission.PURCHASE_DELETE,
    Permission.PURCHASE_CONFIRM, Permission.PURCHASE_CANCEL, Permission.PURCHASE_MANAGE,
    // 销售管理
    Permission.SALES_VIEW, Permission.SALES_CREATE, Permission.SALES_UPDATE, Permission.SALES_DELETE,
    Permission.SALES_CONFIRM, Permission.SALES_CANCEL, Permission.SALES_MANAGE,
    // 库存管理
    Permission.INVENTORY_VIEW, Permission.INVENTORY_INBOUND, Permission.INVENTORY_OUTBOUND,
    Permission.INVENTORY_TRANSFER, Permission.INVENTORY_ADJUST, Permission.INVENTORY_MANAGE,
    // 财务管理
    Permission.FINANCE_VIEW, Permission.FINANCE_RECEIPT, Permission.FINANCE_PAYMENT, Permission.FINANCE_MANAGE,
    // 报表分析
    Permission.REPORT_VIEW, Permission.REPORT_EXPORT, Permission.REPORT_MANAGE,
    // 系统设置
    Permission.SETTING_VIEW, Permission.SETTING_UPDATE,
    // 审计日志
    Permission.AUDIT_VIEW,
    // API访问
    Permission.API_ACCESS,
  ],

  [Role.MANAGER]: [
    // 用户管理（查看）
    Permission.USER_VIEW,
    // 供应商管理
    Permission.SUPPLIER_VIEW, Permission.SUPPLIER_CREATE, Permission.SUPPLIER_UPDATE, Permission.SUPPLIER_MANAGE,
    // 客户管理
    Permission.CUSTOMER_VIEW, Permission.CUSTOMER_CREATE, Permission.CUSTOMER_UPDATE, Permission.CUSTOMER_MANAGE,
    // 物料管理
    Permission.PRODUCT_VIEW, Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE, Permission.PRODUCT_MANAGE,
    // 仓库管理
    Permission.WAREHOUSE_VIEW, Permission.WAREHOUSE_CREATE, Permission.WAREHOUSE_UPDATE, Permission.WAREHOUSE_MANAGE,
    // 采购管理
    Permission.PURCHASE_VIEW, Permission.PURCHASE_CREATE, Permission.PURCHASE_UPDATE,
    Permission.PURCHASE_CONFIRM, Permission.PURCHASE_CANCEL, Permission.PURCHASE_MANAGE,
    // 销售管理
    Permission.SALES_VIEW, Permission.SALES_CREATE, Permission.SALES_UPDATE,
    Permission.SALES_CONFIRM, Permission.SALES_CANCEL, Permission.SALES_MANAGE,
    // 库存管理
    Permission.INVENTORY_VIEW, Permission.INVENTORY_INBOUND, Permission.INVENTORY_OUTBOUND,
    Permission.INVENTORY_TRANSFER, Permission.INVENTORY_ADJUST, Permission.INVENTORY_MANAGE,
    // 财务管理
    Permission.FINANCE_VIEW, Permission.FINANCE_RECEIPT, Permission.FINANCE_PAYMENT, Permission.FINANCE_MANAGE,
    // 报表分析
    Permission.REPORT_VIEW, Permission.REPORT_EXPORT, Permission.REPORT_MANAGE,
    // 系统设置
    Permission.SETTING_VIEW,
    // 审计日志
    Permission.AUDIT_VIEW,
  ],

  [Role.STAFF]: [
    // 供应商管理
    Permission.SUPPLIER_VIEW, Permission.SUPPLIER_CREATE, Permission.SUPPLIER_UPDATE,
    // 客户管理
    Permission.CUSTOMER_VIEW, Permission.CUSTOMER_CREATE, Permission.CUSTOMER_UPDATE,
    // 物料管理
    Permission.PRODUCT_VIEW, Permission.PRODUCT_CREATE, Permission.PRODUCT_UPDATE,
    // 仓库管理
    Permission.WAREHOUSE_VIEW,
    // 采购管理
    Permission.PURCHASE_VIEW, Permission.PURCHASE_CREATE, Permission.PURCHASE_UPDATE,
    // 销售管理
    Permission.SALES_VIEW, Permission.SALES_CREATE, Permission.SALES_UPDATE,
    // 库存管理
    Permission.INVENTORY_VIEW, Permission.INVENTORY_INBOUND, Permission.INVENTORY_OUTBOUND,
    // 财务管理
    Permission.FINANCE_VIEW, Permission.FINANCE_RECEIPT, Permission.FINANCE_PAYMENT,
    // 报表分析
    Permission.REPORT_VIEW,
  ],

  [Role.VIEWER]: [
    // 仅查看权限
    Permission.USER_VIEW,
    Permission.SUPPLIER_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.PRODUCT_VIEW,
    Permission.WAREHOUSE_VIEW,
    Permission.PURCHASE_VIEW,
    Permission.SALES_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.FINANCE_VIEW,
    Permission.REPORT_VIEW,
    Permission.SETTING_VIEW,
  ],

  [Role.GUEST]: [
    // 最小权限
    Permission.PRODUCT_VIEW,
    Permission.INVENTORY_VIEW,
  ],
};

// 权限检查类
export class RBAC {
  /**
   * 检查角色是否拥有指定权限
   */
  static hasPermission(role: Role, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * 检查角色是否拥有任意一个指定权限
   */
  static hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(role, p));
  }

  /**
   * 检查角色是否拥有所有指定权限
   */
  static hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(role, p));
  }

  /**
   * 获取角色的所有权限
   */
  static getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * 获取角色的权限列表（按模块分组）
   */
  static getRolePermissionsByModule(role: Role): Record<string, Permission[]> {
    const permissions = this.getRolePermissions(role);
    const grouped: Record<string, Permission[]> = {};

    permissions.forEach(permission => {
      const module = permission.split(':')[0];
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(permission);
    });

    return grouped;
  }

  /**
   * 获取所有可用角色
   */
  static getAvailableRoles(): { value: Role; label: string; description: string }[] {
    return [
      { value: Role.ADMIN, label: '管理员', description: '拥有租户内所有管理权限' },
      { value: Role.MANAGER, label: '经理', description: '拥有大部分业务操作权限' },
      { value: Role.STAFF, label: '职员', description: '拥有日常业务操作权限' },
      { value: Role.VIEWER, label: '查看者', description: '仅拥有查看权限' },
      { value: Role.GUEST, label: '访客', description: '最小权限访问' },
    ];
  }

  /**
   * 检查角色层级
   * 返回true如果role1的层级高于或等于role2
   */
  static isRoleHigherOrEqual(role1: Role, role2: Role): boolean {
    const hierarchy = [
      Role.SUPER_ADMIN,
      Role.TENANT_ADMIN,
      Role.ADMIN,
      Role.MANAGER,
      Role.STAFF,
      Role.VIEWER,
      Role.GUEST,
    ];

    const index1 = hierarchy.indexOf(role1);
    const index2 = hierarchy.indexOf(role2);

    return index1 <= index2;
  }

  /**
   * 验证操作权限
   * 用于检查用户是否有权对目标用户进行操作
   */
  static canManageUser(operatorRole: Role, targetRole: Role): boolean {
    // 不能管理同级或更高级别的用户
    return this.isRoleHigherOrEqual(operatorRole, targetRole) && operatorRole !== targetRole;
  }
}

// 权限守卫中间件工厂
export const requirePermission = (permission: Permission) => {
  return (req: any, res: any, next: any) => {
    const userRole = req.user?.role as Role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: '未认证',
      });
    }

    if (!RBAC.hasPermission(userRole, permission)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `缺少权限: ${permission}`,
      });
    }

    next();
  };
};

// 多权限守卫（满足任意一个）
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: any, res: any, next: any) => {
    const userRole = req.user?.role as Role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: '未认证',
      });
    }

    if (!RBAC.hasAnyPermission(userRole, permissions)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `需要以下权限之一: ${permissions.join(', ')}`,
      });
    }

    next();
  };
};

export default RBAC;
