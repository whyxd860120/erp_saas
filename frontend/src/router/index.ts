import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 路由配置
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: '仪表盘' }
        },
        // 基础资料管理
        {
          path: 'suppliers',
          name: 'Suppliers',
          component: () => import('@/views/SupplierListView.vue'),
          meta: { title: '供应商管理', requiresAuth: true }
        },
        {
          path: 'customers',
          name: 'Customers',
          component: () => import('@/views/CustomerListView.vue'),
          meta: { title: '客户管理', requiresAuth: true }
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import('@/views/ProductListView.vue'),
          meta: { title: '物料管理', requiresAuth: true }
        },
        {
          path: 'warehouses',
          name: 'Warehouses',
          component: () => import('@/views/WarehouseListView.vue'),
          meta: { title: '仓库管理', requiresAuth: true }
        },
        {
          path: 'accounts',
          name: 'Accounts',
          component: () => import('@/views/AccountListView.vue'),
          meta: { title: '账户管理', requiresAuth: true }
        },
        // 采购管理
        {
          path: 'purchase-orders',
          name: 'PurchaseOrders',
          component: () => import('@/views/PurchaseOrderListView.vue'),
          meta: { title: '采购订单', requiresAuth: true, requiresInitComplete: true }
        },
        // 销售管理
        {
          path: 'sales-orders',
          name: 'SalesOrders',
          component: () => import('@/views/SalesOrderListView.vue'),
          meta: { title: '销售订单', requiresAuth: true, requiresInitComplete: true }
        },
        // 财务管理
        {
          path: 'payment-receipts',
          name: 'PaymentReceipts',
          component: () => import('@/views/PaymentReceiptListView.vue'),
          meta: { title: '收款单', requiresAuth: true, requiresInitComplete: true }
        },
        {
          path: 'payment-payments',
          name: 'PaymentPayments',
          component: () => import('@/views/PaymentPaymentListView.vue'),
          meta: { title: '付款单', requiresAuth: true, requiresInitComplete: true }
        },
        // 库存管理
        {
          path: 'inventory',
          name: 'Inventory',
          component: () => import('@/views/InventoryListView.vue'),
          meta: { title: '库存查询', requiresAuth: true }
        },
        {
          path: 'purchase-inbounds',
          name: 'PurchaseInbounds',
          component: () => import('@/views/PurchaseInboundListView.vue'),
          meta: { title: '采购入库', requiresAuth: true, requiresInitComplete: true }
        },
        {
          path: 'sales-outbounds',
          name: 'SalesOutbounds',
          component: () => import('@/views/SalesOutboundListView.vue'),
          meta: { title: '销售出库', requiresAuth: true, requiresInitComplete: true }
        },
        {
          path: 'stock-take',
          name: 'StockTake',
          component: () => import('@/views/StockTakeListView.vue'),
          meta: { title: '盘点单', requiresAuth: true, requiresInitComplete: true }
        },
        {
          path: 'other-inbounds',
          name: 'OtherInbounds',
          component: () => import('@/views/OtherInboundListView.vue'),
          meta: { title: '其他入库', requiresAuth: true, requiresInitComplete: true }
        },
        {
          path: 'other-outbounds',
          name: 'OtherOutbounds',
          component: () => import('@/views/OtherOutboundListView.vue'),
          meta: { title: '其他出库', requiresAuth: true, requiresInitComplete: true }
        },
        {
          path: 'stock-transfers',
          name: 'StockTransfers',
          component: () => import('@/views/StockTransferListView.vue'),
          meta: { title: '调拨单', requiresAuth: true, requiresInitComplete: true }
        },
        // 系统管理
        {
          path: 'menus',
          name: 'Menus',
          component: () => import('@/views/MenuListView.vue'),
          meta: { title: '菜单管理', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'tenants',
          name: 'Tenants',
          component: () => import('@/views/TenantListView.vue'),
          meta: { title: '租户管理', requiresAuth: true, requiresSuperAdmin: true }
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/UserListView.vue'),
          meta: { title: '人员管理', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'roles',
          name: 'Roles',
          component: () => import('@/views/RoleListView.vue'),
          meta: { title: '角色权限', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'audit-logs',
          name: 'AuditLogs',
          component: () => import('@/views/AuditLogView.vue'),
          meta: { title: '审计日志', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'workflows',
          name: 'Workflows',
          component: () => import('@/views/WorkflowListView.vue'),
          meta: { title: '工作流管理', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'approvals',
          name: 'Approvals',
          component: () => import('@/views/ApprovalCenterView.vue'),
          meta: { title: '审批中心', requiresAuth: true }
        },
        {
          path: 'numbering-rules',
          name: 'NumberingRules',
          component: () => import('@/views/NumberingRuleListView.vue'),
          meta: { title: '单据编码规则', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'account-period',
          name: 'AccountPeriod',
          component: () => import('@/views/AccountPeriodSettingView.vue'),
          meta: { title: '账套参数', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'account-init',
          name: 'AccountInit',
          component: () => import('@/views/AccountInitView.vue'),
          meta: { title: '账套初始化', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'period-end',
          name: 'PeriodEnd',
          component: () => import('@/views/PeriodEndView.vue'),
          meta: { title: '期末处理', requiresAuth: true, requiresAdmin: true, requiresInitComplete: true }
        },
        {
          path: 'tenant-settings',
          name: 'TenantSettings',
          component: () => import('@/views/TenantSettingView.vue'),
          meta: { title: '租户信息', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'subscription',
          name: 'Subscription',
          component: () => import('@/views/SubscriptionView.vue'),
          meta: { title: '套餐与账单', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'feature-settings',
          name: 'FeatureSettings',
          component: () => import('@/views/FeatureSettingsView.vue'),
          meta: { title: '功能开关', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'security-settings',
          name: 'SecuritySettings',
          component: () => import('@/views/SecuritySettingsView.vue'),
          meta: { title: '安全设置', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'integrations',
          name: 'Integrations',
          component: () => import('@/views/IntegrationView.vue'),
          meta: { title: '集成与文档', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'api-keys',
          name: 'ApiKeys',
          component: () => import('@/views/ApiKeyListView.vue'),
          meta: { title: 'API密钥', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'webhooks',
          name: 'Webhooks',
          component: () => import('@/views/WebhookListView.vue'),
          meta: { title: 'Webhook', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'recalculate',
          name: 'Recalculate',
          component: () => import('@/views/RecalculateView.vue'),
          meta: { title: '数据重算', requiresAuth: true, requiresAdmin: true }
        },
        // 微信商城管理
        {
          path: 'shop-products',
          name: 'ShopProducts',
          component: () => import('@/views/shop/ShopProductListView.vue'),
          meta: { title: '商城商品', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'shop-orders',
          name: 'ShopOrders',
          component: () => import('@/views/shop/ShopOrderListView.vue'),
          meta: { title: '商城订单', requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'shop-users',
          name: 'ShopUsers',
          component: () => import('@/views/shop/ShopUserListView.vue'),
          meta: { title: '商城用户', requiresAuth: true, requiresAdmin: true }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login'
    }
  ]
})

// 路由守卫：先校验 token，再决定是否放行
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.authReady) {
    await authStore.init()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  if (requiresAuth && !authStore.isAuthenticated) {
    return {
      path: '/login',
      query: to.path !== '/' ? { redirect: to.fullPath } : undefined
    }
  }

  // 超级管理员检查
  const requiresSuperAdmin = to.matched.some(record => record.meta.requiresSuperAdmin)
  if (requiresSuperAdmin && authStore.user?.role !== 'super_admin') {
    return { path: '/' } // 非超级管理员返回首页
  }

  // 管理员检查
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)
  if (requiresAdmin && !['super_admin', 'admin'].includes(authStore.user?.role || '')) {
    console.warn(`路由守卫: 用户角色 ${authStore.user?.role} 不是管理员，拒绝访问 ${to.path}`)
    return { path: '/' } // 非管理员返回首页
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    const redirect = (to.query.redirect as string) || '/'
    return redirect
  }

  // 账套初始化页面检查：允许查看，但阻止修改操作
  if (to.path === '/account-init') {
    const initStatus = authStore.tenant?.initializationStatus
    const isSuperAdmin = authStore.user?.role === 'super_admin'
    const isSystemTenant = authStore.tenant?.isSystem === true
    
    // 允许所有管理员访问初始化页面查看状态
    // 页面内部会根据状态控制是否允许修改操作
    if (initStatus === 'completed' && !isSuperAdmin && !isSystemTenant) {
      // 不再重定向，允许查看页面
      // 页面内部会显示只读状态
    }
  }

  return true
})

export default router