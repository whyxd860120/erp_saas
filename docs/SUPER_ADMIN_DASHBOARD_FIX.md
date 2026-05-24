# 系统管理员仪表盘错误修复

## 🐛 问题描述

系统管理员（super_admin）登录后，仪表盘页面报错：

```
GET http://localhost:5173/api/v1/purchase-orders?page=1&limit=1 400 (Bad Request)
GET http://localhost:5173/api/v1/sales-orders?page=1&limit=1 400 (Bad Request)
GET http://localhost:5173/api/v1/products?page=1&limit=1 400 (Bad Request)
GET http://localhost:5173/api/v1/users?page=1&limit=1 400 (Bad Request)
GET http://localhost:5173/api/v1/audit-logs?page=1&limit=10 403 (Forbidden)
```

## 🔍 问题原因

**根本原因**: 仪表盘尝试调用租户级别的API，但系统管理员不属于任何租户。

**具体分析**:
1. 系统管理员登录后，没有 `tenantId`
2. 仪表盘尝试获取租户业务数据（订单、物料、用户等）
3. 这些API都有 `tenantIsolation` 中间件，需要 `tenantId`
4. 系统管理员缺少 `tenantId`，导致API返回 400 错误
5. 审计日志API返回 403 权限错误

## ✅ 解决方案

### 1. 区分系统管理员和租户管理员视图

**文件**: `frontend/src/views/DashboardView.vue`

#### 添加角色判断
```typescript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 判断是否为系统管理员
const isSuperAdmin = computed(() => authStore.user?.role === 'super_admin')
```

#### 分离统计数据
```typescript
// 系统管理员统计数据
const systemStats = ref({
  totalTenants: 0,
  activeTenants: 0,
  trialTenants: 0,
  totalUsers: 0
})

// 租户管理员统计数据
const stats = ref({
  purchaseOrders: 0,
  salesOrders: 0,
  productCount: 0,
  userCount: 0
})
```

#### 分别获取数据
```typescript
const fetchSystemStats = async () => {
  try {
    const response = await getTenants({ page: 1, limit: 1000 })
    const tenants = response.data.items || []
    
    // 统计租户数量
    const totalTenants = tenants.length
    const activeTenants = tenants.filter((t: any) => t.status === 'active').length
    const trialTenants = tenants.filter((t: any) => t.status === 'trial').length
    
    // 统计总用户数
    const totalUsers = tenants.reduce((sum: number, tenant: any) => {
      return sum + (tenant._count?.users || 0)
    }, 0)
    
    systemStats.value = {
      totalTenants,
      activeTenants,
      trialTenants,
      totalUsers
    }
  } catch (error) {
    console.error('获取系统统计数据失败:', error)
  }
}

const fetchTenantStats = async () => {
  try {
    const [purchaseRes, salesRes, productRes, userRes] = await Promise.all([
      purchaseOrderApi.getPurchaseOrders({ page: 1, limit: 1 }),
      salesOrderApi.getSalesOrders({ page: 1, limit: 1 }),
      productApi.getProducts({ page: 1, limit: 1 }),
      userApi.getUsers({ page: 1, limit: 1 })
    ])
    
    stats.value = {
      purchaseOrders: purchaseRes.data.total || 0,
      salesOrders: salesRes.data.total || 0,
      productCount: productRes.data.total || 0,
      userCount: userRes.data.total || 0
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}
```

#### 根据角色初始化
```typescript
onMounted(async () => {
  if (isSuperAdmin.value) {
    // 系统管理员：获取系统级统计
    await fetchSystemStats()
  } else {
    // 租户管理员：获取租户级统计
    await Promise.all([
      fetchTenantStats(),
      fetchRecentLogs()
    ])
  }
})
```

### 2. 创建不同的仪表盘UI

#### 系统管理员仪表盘
```vue
<template v-if="isSuperAdmin">
  <!-- 系统级统计卡片 -->
  <el-row :gutter="20" class="stat-cards">
    <el-col :span="6">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background-color: #409EFF;">
            <el-icon :size="32"><OfficeBuilding /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ systemStats.totalTenants || 0 }}</div>
            <div class="stat-label">总租户数</div>
          </div>
        </div>
      </el-card>
    </el-col>
    
    <el-col :span="6">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background-color: #67C23A;">
            <el-icon :size="32"><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ systemStats.activeTenants || 0 }}</div>
            <div class="stat-label">活跃租户</div>
          </div>
        </div>
      </el-card>
    </el-col>
    
    <el-col :span="6">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background-color: #E6A23C;">
            <el-icon :size="32"><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ systemStats.trialTenants || 0 }}</div>
            <div class="stat-label">试用租户</div>
          </div>
        </div>
      </el-card>
    </el-col>
    
    <el-col :span="6">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background-color: #F56C6C;">
            <el-icon :size="32"><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ systemStats.totalUsers || 0 }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
  
  <!-- 系统管理员快捷操作 -->
  <el-card class="action-card">
    <template #header>
      <div class="card-header">
        <span>系统管理快捷操作</span>
      </div>
    </template>
    
    <el-row :gutter="20">
      <el-col :span="8">
        <el-button type="primary" size="large" @click="goToPage('/tenants')">
          <el-icon><OfficeBuilding /></el-icon>
          租户管理
        </el-button>
      </el-col>
      
      <el-col :span="8">
        <el-button type="success" size="large" @click="goToPage('/audit-logs')">
          <el-icon><Document /></el-icon>
          审计日志
        </el-button>
      </el-col>
      
      <el-col :span="8">
        <el-button type="warning" size="large" @click="goToPage('/numbering-rules')">
          <el-icon><Memo /></el-icon>
          单据编码
        </el-button>
      </el-col>
    </el-row>
  </el-card>
</template>
```

#### 租户管理员仪表盘
```vue
<template v-else>
  <!-- 租户级统计卡片 -->
  <el-row :gutter="20" class="stat-cards">
    <el-col :span="6">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background-color: #409EFF;">
            <el-icon :size="32"><ShoppingCart /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.purchaseOrders || 0 }}</div>
            <div class="stat-label">采购订单</div>
          </div>
        </div>
      </el-card>
    </el-col>
    
    <el-col :span="6">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background-color: #67C23A;">
            <el-icon :size="32"><Sell /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.salesOrders || 0 }}</div>
            <div class="stat-label">销售订单</div>
          </div>
        </div>
      </el-card>
    </el-col>
    
    <el-col :span="6">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background-color: #E6A23C;">
            <el-icon :size="32"><Box /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.productCount || 0 }}</div>
            <div class="stat-label">物料种类</div>
          </div>
        </div>
      </el-card>
    </el-col>
    
    <el-col :span="6">
      <el-card shadow="hover" class="stat-card">
        <div class="stat-content">
          <div class="stat-icon" style="background-color: #F56C6C;">
            <el-icon :size="32"><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.userCount || 0 }}</div>
            <div class="stat-label">用户数量</div>
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
  
  <!-- 租户管理员快捷操作 -->
  <el-card class="action-card">
    <template #header>
      <div class="card-header">
        <span>快捷操作</span>
      </div>
    </template>
    
    <el-row :gutter="20">
      <el-col :span="8">
        <el-button type="primary" size="large" @click="goToPage('/purchase-orders')">
          <el-icon><Plus /></el-icon>
          新建采购订单
        </el-button>
      </el-col>
      
      <el-col :span="8">
        <el-button type="success" size="large" @click="goToPage('/sales-orders')">
          <el-icon><Plus /></el-icon>
          新建销售订单
        </el-button>
      </el-col>
      
      <el-col :span="8">
        <el-button type="warning" size="large" @click="goToPage('/inventory')">
          <el-icon><Search /></el-icon>
          查询库存
        </el-button>
      </el-col>
    </el-row>
  </el-card>
  
  <!-- 最近审计日志 -->
  <el-card class="log-card">
    <template #header>
      <div class="card-header">
        <span>最近操作日志</span>
        <el-button link @click="goToPage('/audit-logs')">查看全部</el-button>
      </div>
    </template>
    
    <el-table :data="recentLogs" stripe style="width: 100%">
      <el-table-column prop="createdAt" label="时间" width="180" />
      <el-table-column prop="user.name" label="用户" width="120" />
      <el-table-column prop="action" label="操作" width="100" />
      <el-table-column prop="module" label="模块" width="150" />
      <el-table-column prop="detail" label="详情" />
    </el-table>
  </el-card>
</template>
```

### 3. 修正API导入

**修改前**:
```typescript
import { 
  getPurchaseOrders, 
  getSalesOrders, 
  getProducts, 
  getUsers 
} from '@/api'
```

**修改后**:
```typescript
import { 
  productApi, 
  purchaseOrderApi, 
  salesOrderApi, 
  userApi 
} from '@/api'
```

**使用方式**:
```typescript
const [purchaseRes, salesRes, productRes, userRes] = await Promise.all([
  purchaseOrderApi.getPurchaseOrders({ page: 1, limit: 1 }),
  salesOrderApi.getSalesOrders({ page: 1, limit: 1 }),
  productApi.getProducts({ page: 1, limit: 1 }),
  userApi.getUsers({ page: 1, limit: 1 })
])
```

## 🎯 修复后的功能

### 系统管理员仪表盘
- **总租户数**: 显示所有租户总数
- **活跃租户**: 显示状态为active的租户数
- **试用租户**: 显示状态为trial的租户数
- **总用户数**: 显示所有租户的用户总数
- **快捷操作**: 租户管理、审计日志、单据编码

### 租户管理员仪表盘
- **采购订单**: 显示租户内的采购订单总数
- **销售订单**: 显示租户内的销售订单总数
- **物料种类**: 显示租户内的物料总数
- **用户数量**: 显示租户内的用户总数
- **快捷操作**: 新建采购订单、新建销售订单、查询库存
- **操作日志**: 显示最近的审计日志

## 🚀 应用修复

### 重启前端服务
```bash
# 停止当前服务 (Ctrl+C)
# 重新启动
cd frontend
npm run dev
```

### 刷新页面
刷新浏览器页面，问题应该解决。

## 📊 验证修复

### 系统管理员登录
```bash
账号：admin@erp2026.com
密码：admin123
```

**预期结果**:
- 仪表盘显示系统级统计
- 无错误信息
- 显示总租户、活跃租户、试用租户、总用户数

### 租户管理员登录
```bash
账号：admin@demo.com
密码：admin123
租户标识：demo
```

**预期结果**:
- 仪表盘显示租户级统计
- 无错误信息
- 显示采购订单、销售订单、物料、用户数量
- 显示最近操作日志

## 🔍 故障排查

### 如果仍有错误

**检查1：用户角色**
```typescript
console.log('用户角色:', authStore.user?.role)
console.log('是否系统管理员:', isSuperAdmin.value)
```

**检查2：API导入**
```typescript
console.log('API模块:', { productApi, purchaseOrderApi, salesOrderApi, userApi })
```

**检查3：数据获取**
```typescript
console.log('租户数据:', response.data.items)
console.log('统计数据:', systemStats.value)
```

**检查4：路由跳转**
```typescript
console.log('跳转路径:', path)
console.log('路由:', router)
```

## 📝 相关文件

- `frontend/src/views/DashboardView.vue` - 仪表盘页面（已修复）
- `frontend/src/stores/auth.ts` - 认证状态管理
- `frontend/src/api/index.ts` - API模块
- `src/controllers/tenant.controller.ts` - 租户控制器（已修复用户统计）

## 🎯 总结

- **问题**: 系统管理员尝试访问租户级API导致错误
- **修复**: 根据用户角色显示不同的仪表盘
- **结果**: 系统管理员看到系统级统计，租户管理员看到租户级统计
- **无错误**: 所有API调用都符合用户权限

修复后，系统管理员和租户管理员都能看到各自专属的仪表盘！

---

**修复时间**: 2026-05-22  
**影响范围**: 仪表盘模块  
**修复状态**: ✅ 已完成