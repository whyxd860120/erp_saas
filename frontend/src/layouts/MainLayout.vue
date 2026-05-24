<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { changePassword } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isCollapse = ref(false)
const breadcrumbItems = computed(() => {
  return route.matched.filter((r) => r.meta && r.meta.title)
})

// 菜单模式: 'combined'(综合) / 'top'(顶部) / 'left'(左侧)
const menuMode = ref(localStorage.getItem('menuMode') || 'combined')

// 保存菜单模式
const saveMenuMode = (mode: string) => {
  menuMode.value = mode
  localStorage.setItem('menuMode', mode)
  if (mode === 'top') {
    router.push('/')
  }
  // 切换到左侧模式时重置折叠状态
  if (mode === 'left') {
    isCollapse.value = false
  }
}

// 当前选中的顶部菜单（综合模式和顶部模式使用）
const activeTopMenu = ref('dashboard')

// 顶部菜单配置
const topMenuItems = [
  { key: 'dashboard', label: '仪表盘', icon: 'Odometer' },
  { key: 'supply', label: '供应链', icon: 'Connection' },
  { key: 'basic', label: '基础资料', icon: 'Files' },
  { key: 'workflow', label: '工作流', icon: 'Guide' },
  { key: 'settings', label: '设置', icon: 'Setting' },
  { key: 'logs', label: '日志', icon: 'Document' },
  { key: 'help', label: '帮助', icon: 'QuestionFilled' }
]

// 顶部菜单子项配置（用于下拉显示）
const topMenuChildren = computed(() => {
  const userRole = authStore.user?.role || ''
  const initStatus = authStore.tenant?.initializationStatus || 'pending'
  const isSuperAdmin = userRole === 'super_admin'
  const isAdmin = isSuperAdmin || userRole === 'admin'

  const supplyChildren = [
    { title: '采购订单', index: '/purchase-orders', requiresInitComplete: true },
    { title: '销售订单', index: '/sales-orders', requiresInitComplete: true },
    { title: '收款单', index: '/payment-receipts', requiresInitComplete: true },
    { title: '付款单', index: '/payment-payments', requiresInitComplete: true },
    { title: '库存查询', index: '/inventory' },
    { title: '采购入库', index: '/purchase-inbounds', requiresInitComplete: true },
    { title: '销售出库', index: '/sales-outbounds', requiresInitComplete: true },
    { title: '盘点单', index: '/stock-take', requiresInitComplete: true },
    { title: '其他入库', index: '/other-inbounds', requiresInitComplete: true },
    { title: '其他出库', index: '/other-outbounds', requiresInitComplete: true },
    { title: '调拨单', index: '/stock-transfers', requiresInitComplete: true }
  ]
  const basicChildren = [
    { title: '供应商管理', index: '/suppliers' },
    { title: '客户管理', index: '/customers' },
    { title: '物料管理', index: '/products' },
    { title: '仓库管理', index: '/warehouses' },
    { title: '账户管理', index: '/accounts' }
  ]
  const workflowChildren = [
    { title: '工作流管理', index: '/workflows', requiresAdmin: true },
    { title: '审批中心', index: '/approvals' }
  ]
  const settingsChildren = [
    { title: '用户管理', index: '/users', requiresAdmin: true },
    { title: '角色权限', index: '/roles', requiresAdmin: true },
    { title: '租户管理', index: '/tenants', requiresSuperAdmin: true },
    { title: '套餐与账单', index: '/subscription', requiresSuperAdmin: true },
    { title: '功能开关', index: '/feature-settings', requiresAdmin: true },
    { title: '租户信息', index: '/tenant-settings', requiresAdmin: true },
    { title: '单据编码', index: '/numbering-rules', requiresAdmin: true },
    { title: '账套参数', index: '/account-period', requiresAdmin: true },
    { title: '账套初始化', index: '/account-init', requiresAdmin: true },
    { title: '期末处理', index: '/period-end', requiresAdmin: true, requiresInitComplete: true }
  ]
  const logsChildren = [
    { title: '审计日志', index: '/audit-logs' }
  ]
  const helpChildren = [
    { title: '帮助与支持', index: '/help' }
  ]

  return {
    supply: supplyChildren,
    basic: basicChildren,
    workflow: workflowChildren,
    settings: settingsChildren,
    logs: logsChildren,
    help: helpChildren
  }
})

// 过滤后的顶部子菜单（根据权限）
const filteredTopChildren = (key: string) => {
  const userRole = authStore.user?.role || ''
  const initStatus = authStore.tenant?.initializationStatus || 'pending'
  const isSuperAdmin = userRole === 'super_admin'
  const isAdmin = isSuperAdmin || userRole === 'admin'

  const children = topMenuChildren.value[key as keyof typeof topMenuChildren.value] || []
  return children.filter((item: any) => {
    if (item.requiresSuperAdmin && !isSuperAdmin) return false
    if (item.requiresAdmin && !isAdmin) return false
    if (item.requiresInitComplete && initStatus !== 'completed') return false
    return true
  })
}

// 跳转到菜单项
const navigateToMenu = (index: string) => {
  router.push(index)
}

// 所有菜单配置
const allMenuConfig: any[] = [
  // 仪表盘
  { title: '仪表盘', icon: 'Odometer', index: '/' },
  // 供应链
  { title: '采购管理', icon: 'ShoppingCart', children: [
    { title: '采购订单', index: '/purchase-orders', requiresInitComplete: true }
  ]},
  { title: '销售管理', icon: 'Sell', children: [
    { title: '销售订单', index: '/sales-orders', requiresInitComplete: true }
  ]},
  { title: '财务管理', icon: 'Money', children: [
    { title: '收款单', index: '/payment-receipts', requiresInitComplete: true },
    { title: '付款单', index: '/payment-payments', requiresInitComplete: true }
  ]},
  { title: '库存管理', icon: 'Package', children: [
    { title: '库存查询', index: '/inventory' },
    { title: '采购入库', index: '/purchase-inbounds', requiresInitComplete: true },
    { title: '销售出库', index: '/sales-outbounds', requiresInitComplete: true },
    { title: '盘点单', index: '/stock-take', requiresInitComplete: true },
    { title: '其他入库', index: '/other-inbounds', requiresInitComplete: true },
    { title: '其他出库', index: '/other-outbounds', requiresInitComplete: true },
    { title: '调拨单', index: '/stock-transfers', requiresInitComplete: true }
  ]},
  // 基础资料
  { title: '供应商管理', icon: 'OfficeBuilding', index: '/suppliers' },
  { title: '客户管理', icon: 'UserFilled', index: '/customers' },
  { title: '物料管理', icon: 'Goods', index: '/products' },
  { title: '仓库管理', icon: 'House', index: '/warehouses' },
  { title: '账户管理', icon: 'Wallet', index: '/accounts' },
  // 工作流
  { title: '工作流管理', icon: 'Connection', index: '/workflows', requiresAdmin: true },
  { title: '审批中心', icon: 'CircleCheck', index: '/approvals' },
  // 用户与权限
  { title: '用户管理', icon: 'Avatar', index: '/users', requiresAdmin: true },
  { title: '角色权限', icon: 'Grid', index: '/roles', requiresAdmin: true },
  // SaaS配置
  { title: '租户管理', icon: 'OfficeBuilding', index: '/tenants', requiresSuperAdmin: true },
  { title: '套餐与账单', icon: 'CreditCard', index: '/subscription', requiresSuperAdmin: true },
  { title: '功能开关', icon: 'Switch', index: '/feature-settings', requiresAdmin: true },
  { title: '租户信息', icon: 'Office', index: '/tenant-settings', requiresAdmin: true },
  // 系统设置
  { title: '单据编码', icon: 'DocumentCopy', index: '/numbering-rules', requiresAdmin: true },
  { title: '账套参数', icon: 'Calendar', index: '/account-period', requiresAdmin: true },
  { title: '账套初始化', icon: 'VideoPlay', index: '/account-init', requiresAdmin: true },
  { title: '期末处理', icon: 'Timer', index: '/period-end', requiresAdmin: true, requiresInitComplete: true },
  // 日志
  { title: '审计日志', icon: 'Document', index: '/audit-logs' },
  // 帮助
  { title: '帮助与支持', icon: 'QuestionFilled', index: '/help' }
]

// 过滤后的菜单项
const filteredAllMenu = computed(() => {
  const userRole = authStore.user?.role || ''
  const initStatus = authStore.tenant?.initializationStatus || 'pending'
  const isSuperAdmin = userRole === 'super_admin'
  const isAdmin = isSuperAdmin || userRole === 'admin'

  const filterItems = (items: any[]): any[] => {
    return items.filter(item => {
      if (item.requiresSuperAdmin && !isSuperAdmin) return false
      if (item.requiresAdmin && !isAdmin) return false
      if (item.requiresInitComplete && initStatus !== 'completed') return false

      if (item.children) {
        item.children = filterItems(item.children)
        return item.children.length > 0
      }
      return true
    })
  }

  return filterItems([...allMenuConfig])
})

// 根据顶部菜单获取左侧菜单（综合模式）
const leftMenuItems = computed(() => {
  const userRole = authStore.user?.role || ''
  const initStatus = authStore.tenant?.initializationStatus || 'pending'
  const isSuperAdmin = userRole === 'super_admin'
  const isAdmin = isSuperAdmin || userRole === 'admin'

  const supplyMenu = [
    { title: '采购管理', icon: 'ShoppingCart', children: [
      { index: '/purchase-orders', title: '采购订单', icon: 'List', requiresInitComplete: true }
    ]},
    { title: '销售管理', icon: 'Sell', children: [
      { index: '/sales-orders', title: '销售订单', icon: 'Tickets', requiresInitComplete: true }
    ]},
    { title: '财务管理', icon: 'Money', children: [
      { index: '/payment-receipts', title: '收款单', icon: 'CreditCard', requiresInitComplete: true },
      { index: '/payment-payments', title: '付款单', icon: 'Postcard', requiresInitComplete: true }
    ]},
    { title: '库存管理', icon: 'Package', children: [
      { index: '/inventory', title: '库存查询', icon: 'Search' },
      { index: '/purchase-inbounds', title: '采购入库', icon: 'Box', requiresInitComplete: true },
      { index: '/sales-outbounds', title: '销售出库', icon: 'Van', requiresInitComplete: true },
      { index: '/stock-take', title: '盘点单', icon: 'List', requiresInitComplete: true },
      { index: '/other-inbounds', title: '其他入库', icon: 'Box', requiresInitComplete: true },
      { index: '/other-outbounds', title: '其他出库', icon: 'Van', requiresInitComplete: true },
      { index: '/stock-transfers', title: '调拨单', icon: 'Transfer', requiresInitComplete: true }
    ]}
  ]
  const basicMenu = [
    { title: '基础资料', icon: 'FolderOpened', children: [
      { index: '/suppliers', title: '供应商管理', icon: 'OfficeBuilding' },
      { index: '/customers', title: '客户管理', icon: 'UserFilled' },
      { index: '/products', title: '物料管理', icon: 'Goods' },
      { index: '/warehouses', title: '仓库管理', icon: 'House' },
      { index: '/accounts', title: '账户管理', icon: 'Wallet' }
    ]}
  ]
  const workflowMenu = [
    { index: '/workflows', title: '工作流管理', icon: 'Connection', requiresAdmin: true },
    { index: '/approvals', title: '审批中心', icon: 'CircleCheck' }
  ]
  const settingsMenu = [
    { title: '用户与权限', icon: 'User', children: [
      { index: '/users', title: '用户管理', icon: 'Avatar', requiresAdmin: true },
      { index: '/roles', title: '角色权限', icon: 'Grid', requiresAdmin: true }
    ]},
    { title: 'SaaS配置', icon: 'Tools', children: [
      { index: '/tenants', title: '租户管理', icon: 'OfficeBuilding', requiresSuperAdmin: true },
      { index: '/subscription', title: '套餐与账单', icon: 'CreditCard', requiresSuperAdmin: true },
      { index: '/feature-settings', title: '功能开关', icon: 'Switch', requiresAdmin: true },
      { index: '/tenant-settings', title: '租户信息', icon: 'Office', requiresAdmin: true }
    ]},
    { title: '系统设置', icon: 'Tools', children: [
      { index: '/numbering-rules', title: '单据编码', icon: 'DocumentCopy', requiresAdmin: true },
      { index: '/account-period', title: '账套参数', icon: 'Calendar', requiresAdmin: true },
      { index: '/account-init', title: '账套初始化', icon: 'VideoPlay', requiresAdmin: true },
      { index: '/period-end', title: '期末处理', icon: 'Timer', requiresAdmin: true, requiresInitComplete: true }
    ]}
  ]
  const logsMenu = [
    { index: '/audit-logs', title: '审计日志', icon: 'Document' }
  ]
  const helpMenu = [
    { index: '/help', title: '帮助与支持', icon: 'QuestionFilled' }
  ]

  const menuMap: Record<string, any[]> = {
    dashboard: [{ index: '/', title: '仪表盘', icon: 'Odometer' }],
    supply: supplyMenu,
    basic: basicMenu,
    workflow: workflowMenu,
    settings: settingsMenu,
    logs: logsMenu,
    help: helpMenu
  }

  const filterItems = (items: any[], isSuper: boolean, isAdm: boolean, init: string): any[] => {
    return items.filter(item => {
      if (item.requiresSuperAdmin && !isSuper) return false
      if (item.requiresAdmin && !isAdm) return false
      if (item.requiresInitComplete && init !== 'completed') return false
      if (item.children) {
        item.children = filterItems(item.children, isSuper, isAdm, init)
        return item.children.length > 0
      }
      return true
    })
  }

  return filterItems(menuMap[activeTopMenu.value] || [], isSuperAdmin, isAdmin, initStatus)
})

// 切换顶部菜单
const handleTopMenuSelect = (key: string) => {
  activeTopMenu.value = key
  if (key === 'dashboard') {
    router.push('/')
  } else if (key === 'logs') {
    router.push('/audit-logs')
  } else if (key === 'help') {
    router.push('/help')
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    await handleLogout()
  } else if (command === 'changePassword') {
    await handleChangePassword()
  }
}

const handleChangePassword = async () => {
  try {
    const { value: oldPassword } = await ElMessageBox.prompt(
      '请输入当前密码', '修改密码',
      { confirmButtonText: '下一步', cancelButtonText: '取消', inputType: 'password' }
    )
    const { value: newPassword } = await ElMessageBox.prompt(
      '请输入新密码', '修改密码',
      { confirmButtonText: '确定', cancelButtonText: '取消', inputType: 'password' }
    )
    const { value: confirmPassword } = await ElMessageBox.prompt(
      '请再次输入新密码', '修改密码',
      { confirmButtonText: '确定', cancelButtonText: '取消', inputType: 'password' }
    )
    if (newPassword !== confirmPassword) {
      ElMessage.error('两次输入的新密码不一致')
      return
    }
    const response = await changePassword({ oldPassword, newPassword })
    if (response.success) {
      ElMessage.success('密码修改成功，请重新登录')
      setTimeout(() => { handleLogout() }, 1500)
    } else {
      ElMessage.error(response.message || '密码修改失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '修改密码失败')
    }
  }
}

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

onMounted(async () => {
  await authStore.refreshTenantInfo()
  const userRole = authStore.user?.role || ''
  if (userRole === 'super_admin') return
  if (authStore.trialWarning) {
    ElMessage.warning({ message: authStore.trialWarning.message, duration: 0, showClose: true })
  }
})
</script>

<template>
  <el-container class="layout-container" :class="{ 'menu-mode-top': menuMode === 'top' }">
    <!-- 顶部菜单区域 -->
    <div class="top-nav" :class="{ 'top-only': menuMode === 'top' }">
      <div class="top-nav-left">
        <div class="logo">数企管家</div>
        <el-menu
          v-if="menuMode !== 'left'"
          mode="horizontal"
          :default-active="activeTopMenu"
          :ellipsis="false"
          @select="handleTopMenuSelect"
          class="top-menu"
        >
          <el-menu-item index="dashboard">
            <el-icon><Odometer /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>
          <el-sub-menu index="supply">
            <template #title>
              <el-icon><Connection /></el-icon>
              <span>供应链</span>
            </template>
            <el-menu-item v-for="item in filteredTopChildren('supply')" :key="item.index" :index="item.index" @click="navigateToMenu(item.index)">
              {{ item.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="basic">
            <template #title>
              <el-icon><Files /></el-icon>
              <span>基础资料</span>
            </template>
            <el-menu-item v-for="item in filteredTopChildren('basic')" :key="item.index" :index="item.index" @click="navigateToMenu(item.index)">
              {{ item.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="workflow">
            <template #title>
              <el-icon><Guide /></el-icon>
              <span>工作流</span>
            </template>
            <el-menu-item v-for="item in filteredTopChildren('workflow')" :key="item.index" :index="item.index" @click="navigateToMenu(item.index)">
              {{ item.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="settings">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>设置</span>
            </template>
            <el-menu-item v-for="item in filteredTopChildren('settings')" :key="item.index" :index="item.index" @click="navigateToMenu(item.index)">
              {{ item.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item index="logs">
            <el-icon><Document /></el-icon>
            <span>日志</span>
          </el-menu-item>
          <el-menu-item index="help">
            <el-icon><QuestionFilled /></el-icon>
            <span>帮助</span>
          </el-menu-item>
        </el-menu>
      </div>
      <div class="top-nav-right">
        <!-- 菜单模式切换 -->
        <el-dropdown trigger="click" @command="saveMenuMode">
          <el-button type="primary" plain size="small" class="menu-mode-btn">
            <el-icon><Grid /></el-icon>
            {{ menuMode === 'combined' ? '综合' : menuMode === 'top' ? '顶部' : '左侧' }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :command="'combined'" :class="{ 'is-active': menuMode === 'combined' }">
                <el-icon><Menu /></el-icon> 综合模式
              </el-dropdown-item>
              <el-dropdown-item :command="'top'" :class="{ 'is-active': menuMode === 'top' }">
                <el-icon><MoreFilled /></el-icon> 顶部模式
              </el-dropdown-item>
              <el-dropdown-item :command="'left'" :class="{ 'is-active': menuMode === 'left' }">
                <el-icon><List /></el-icon> 左侧模式
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <span class="tenant-info" v-if="authStore.tenant">{{ authStore.tenant.name }}</span>
        <el-dropdown trigger="click" @command="handleCommand">
          <div class="user-info">
            <el-avatar :size="32" icon="UserFilled" />
            <span class="user-name">{{ authStore.user?.name || authStore.user?.email || '用户' }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="changePassword"><el-icon><Lock /></el-icon> 修改密码</el-dropdown-item>
              <el-dropdown-item divided command="logout"><el-icon><SwitchButton /></el-icon> 退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="main-wrapper">
      <!-- 左侧菜单（综合模式和左侧模式） -->
      <aside v-if="menuMode !== 'top'" class="sidebar" :class="{ 'is-collapse': isCollapse }">
        <div class="sidebar-header" v-if="menuMode === 'combined'">
          <span class="sidebar-title">导航菜单</span>
          <el-button text @click="toggleCollapse" class="collapse-btn">
            <el-icon><component :is="isCollapse ? 'Expand' : 'Fold'" /></el-icon>
          </el-button>
        </div>
        <el-scrollbar>
          <el-menu
            :default-active="route.path"
            :collapse="menuMode === 'combined' && isCollapse"
            :collapse-transition="false"
            background-color="#1d1e1f"
            text-color="#bfcbd9"
            active-text-color="#409EFF"
            router
            class="sidebar-menu"
          >
            <template v-if="menuMode === 'combined'">
              <template v-for="item in leftMenuItems" :key="item.index || item.title">
                <el-menu-item v-if="!item.children" :index="item.index">
                  <el-tooltip :disabled="!isCollapse" :content="item.title" placement="right" :show-after="300">
                    <div class="menu-item-wrapper">
                      <el-icon><component :is="item.icon" /></el-icon>
                      <template #title>{{ item.title }}</template>
                    </div>
                  </el-tooltip>
                </el-menu-item>
                <el-sub-menu v-else :index="item.title">
                  <template #title>
                    <el-tooltip v-if="isCollapse" :content="item.title" placement="right" :show-after="300">
                      <div class="menu-item-wrapper">
                        <el-icon><component :is="item.icon" /></el-icon>
                        <span>{{ item.title }}</span>
                      </div>
                    </el-tooltip>
                    <template v-else>
                      <el-icon><component :is="item.icon" /></el-icon>
                      <span>{{ item.title }}</span>
                    </template>
                  </template>
                  <el-menu-item v-for="child in item.children" :key="child.index" :index="child.index">
                    <el-tooltip :disabled="!isCollapse" :content="child.title" placement="right" :show-after="300">
                      <div class="menu-item-wrapper">
                        <el-icon><component :is="child.icon" /></el-icon>
                        <template #title>{{ child.title }}</template>
                      </div>
                    </el-tooltip>
                  </el-menu-item>
                </el-sub-menu>
              </template>
            </template>
            <template v-else>
              <template v-for="item in filteredAllMenu" :key="item.index || item.title">
                <el-menu-item v-if="!item.children" :index="item.index">
                  <el-tooltip v-if="menuMode === 'left'" :content="item.title" placement="right" :show-after="300">
                    <div class="menu-item-wrapper">
                      <el-icon><component :is="item.icon" /></el-icon>
                      <template #title>{{ item.title }}</template>
                    </div>
                  </el-tooltip>
                  <template v-else>
                    <el-icon><component :is="item.icon" /></el-icon>
                    <template #title>{{ item.title }}</template>
                  </template>
                </el-menu-item>
                <el-sub-menu v-else :index="item.title">
                  <template #title>
                    <el-icon><component :is="item.icon" /></el-icon>
                    <span>{{ item.title }}</span>
                  </template>
                  <el-menu-item v-for="child in item.children" :key="child.index" :index="child.index">
                    <el-tooltip v-if="menuMode === 'left'" :content="child.title" placement="right" :show-after="300">
                      <div class="menu-item-wrapper">
                        <el-icon><component :is="child.icon" /></el-icon>
                        <template #title>{{ child.title }}</template>
                      </div>
                    </el-tooltip>
                    <template v-else>
                      <el-icon><component :is="child.icon" /></el-icon>
                      <template #title>{{ child.title }}</template>
                    </template>
                  </el-menu-item>
                </el-sub-menu>
              </template>
            </template>
          </el-menu>
        </el-scrollbar>
      </aside>

      <!-- 内容区 -->
      <main class="main-content">
        <div class="content-header" v-if="breadcrumbItems.length > 0">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbItems" :key="item.path">
              {{ item.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="content-body">
          <router-view />
        </div>
      </main>
    </div>
  </el-container>
</template>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ========== 顶部导航 ========== */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  background: linear-gradient(135deg, #1a1f35 0%, #2d3561 100%);
  padding: 0 24px;
  flex-shrink: 0;
  position: relative;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0,0,0,0.25);
}

.top-nav::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
}

.top-nav-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 3px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo::before {
  content: '';
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,210,255,0.4);
}

.top-menu {
  background: transparent;
  border-bottom: none;
}

.top-menu .el-menu-item {
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  height: 60px;
  line-height: 60px;
  padding: 0 18px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.top-menu .el-menu-item::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 80%;
  height: 3px;
  background: linear-gradient(90deg, #00d2ff, #3a7bd5);
  border-radius: 3px 3px 0 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.top-menu .el-menu-item:hover,
.top-menu .el-menu-item.is-active {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.top-menu .el-menu-item:hover::after,
.top-menu .el-menu-item.is-active::after {
  transform: translateX(-50%) scaleX(1);
}

/* 顶部菜单下拉样式 */
.top-menu .el-sub-menu__title {
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  height: 60px;
  line-height: 60px;
  padding: 0 18px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.top-menu .el-sub-menu__title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 80%;
  height: 3px;
  background: linear-gradient(90deg, #00d2ff, #3a7bd5);
  border-radius: 3px 3px 0 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.top-menu .el-sub-menu__title:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.top-menu .el-sub-menu__title:hover::after {
  transform: translateX(-50%) scaleX(1);
}

.top-menu :deep(.el-sub-menu .el-menu) {
  background: rgba(26, 31, 53, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 8px;
  min-width: 180px;
}

.top-menu :deep(.el-sub-menu .el-menu .el-menu-item) {
  color: rgba(255,255,255,0.85);
  height: 42px;
  line-height: 42px;
  padding: 0 16px;
  font-size: 14px;
  border-radius: 8px;
  margin: 2px 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.top-menu :deep(.el-sub-menu .el-menu .el-menu-item:hover) {
  background: rgba(0,210,255,0.12);
  color: #00d2ff;
  padding-left: 24px;
}

.top-menu :deep(.el-sub-menu .el-menu .el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(0,210,255,0.2) 0%, rgba(58,123,213,0.2) 100%);
  color: #00d2ff;
  font-weight: 500;
}

.top-nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-mode-btn {
  background: rgba(255,255,255,0.08) !important;
  border: 1px solid rgba(255,255,255,0.15) !important;
  color: rgba(255,255,255,0.9) !important;
  border-radius: 8px;
  transition: all 0.25s;
  backdrop-filter: blur(10px);
}

.menu-mode-btn:hover {
  background: rgba(255,255,255,0.15) !important;
  border-color: rgba(255,255,255,0.25) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transform: translateY(-1px);
}

.tenant-info {
  color: rgba(255,255,255,0.9);
  font-size: 13px;
  font-weight: 500;
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 24px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.25s;
}

.user-info:hover {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.user-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 用户下拉菜单样式 */
.top-nav-right :deep(.el-dropdown-menu) {
  background: rgba(26, 31, 53, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.top-nav-right :deep(.el-dropdown-menu .el-dropdown-menu-item) {
  color: rgba(255,255,255,0.85);
  border-radius: 8px;
  padding: 10px 16px;
  transition: all 0.2s;
}

.top-nav-right :deep(.el-dropdown-menu .el-dropdown-menu-item:hover) {
  background: rgba(0,210,255,0.12);
  color: #00d2ff;
}

.top-nav-right :deep(.el-dropdown-menu .el-dropdown-menu-item.is-divided) {
  border-top: 1px solid rgba(255,255,255,0.08);
  margin-top: 8px;
  padding-top: 18px;
}

/* ========== 主体区域 ========== */
.main-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 240px;
  background: linear-gradient(180deg, #1a1f35 0%, #141824 100%);
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,0.05);
}

.sidebar.is-collapse {
  width: 68px;
}

.sidebar-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
  background: rgba(255,255,255,0.02);
}

.sidebar-title {
  color: rgba(255,255,255,0.5);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 600;
}

.collapse-btn {
  color: rgba(255,255,255,0.4);
  transition: all 0.25s;
  border-radius: 6px;
}

.collapse-btn:hover {
  color: #00d2ff;
  background: rgba(0,210,255,0.1);
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  background: transparent;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 240px;
}

/* 侧边栏菜单项样式 */
.sidebar-menu :deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
  margin: 4px 12px;
  padding: 0 16px !important;
  border-radius: 10px;
  color: rgba(255,255,255,0.7);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.sidebar-menu :deep(.el-menu-item)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 24px;
  background: linear-gradient(90deg, rgba(0,210,255,0.3), transparent);
  border-radius: 0 4px 4px 0;
  transition: width 0.3s;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: rgba(255,255,255,0.06);
  color: #fff;
  padding-left: 24px !important;
}

.sidebar-menu :deep(.el-menu-item:hover)::before {
  width: 3px;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(0,210,255,0.2) 0%, rgba(58,123,213,0.15) 100%);
  color: #00d2ff;
  font-weight: 500;
}

.sidebar-menu :deep(.el-menu-item.is-active)::before {
  width: 3px;
}

.sidebar-menu :deep(.el-menu-item.is-active)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid #1a1f35;
}

/* 子菜单样式 */
.sidebar-menu :deep(.el-sub-menu .el-sub-menu__title) {
  height: 48px;
  line-height: 48px;
  margin: 4px 12px;
  padding: 0 16px !important;
  border-radius: 10px;
  color: rgba(255,255,255,0.7);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-menu :deep(.el-sub-menu .el-sub-menu__title:hover) {
  background: rgba(255,255,255,0.06);
  color: #fff;
}

.sidebar-menu :deep(.el-sub-menu .el-menu) {
  background: rgba(0,0,0,0.15) !important;
  border-radius: 10px;
  margin: 4px 0;
  padding: 4px 0;
}

.sidebar-menu :deep(.el-sub-menu .el-menu .el-menu-item) {
  height: 42px;
  line-height: 42px;
  margin: 2px 12px;
  padding: 0 16px !important;
  border-radius: 8px;
  color: rgba(255,255,255,0.6);
  transition: all 0.2s;
}

.sidebar-menu :deep(.el-sub-menu .el-menu .el-menu-item:hover) {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.9);
}

.sidebar-menu :deep(.el-sub-menu .el-menu .el-menu-item.is-active) {
  background: rgba(0,210,255,0.15);
  color: #00d2ff;
}

/* 菜单分组标题分隔线 */
.sidebar-menu :deep(.el-sub-menu__title)::before {
  content: '';
  display: none;
}

/* 菜单项wrapper */
.menu-item-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ========== 内容区 ========== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f0f2f5;
}

.content-header {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.content-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>