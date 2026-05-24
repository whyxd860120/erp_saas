<template>
  <div class="dashboard-container">
    <h1>仪表盘</h1>
    
    <!-- 系统管理员视图 -->
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
    
    <!-- 租户管理员视图 -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  productApi, 
  purchaseOrderApi, 
  salesOrderApi, 
  userApi 
} from '@/api'
import { getAuditLogs } from '@/api/audit-log'
import { getTenants } from '@/api/tenant'
import { 
  ShoppingCart, 
  Sell, 
  Box, 
  User, 
  Plus, 
  Search,
  OfficeBuilding,
  CircleCheck,
  Clock,
  Document,
  Memo
} from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()

// 判断是否为系统管理员
const isSuperAdmin = computed(() => authStore.user?.role === 'super_admin')

// 判断账套是否已完成初始化
const isInitCompleted = computed(() => {
  return authStore.tenant?.initializationStatus === 'completed'
})

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

const recentLogs = ref([])

// 获取系统管理员统计数据
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

// 获取租户统计数据
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

// 获取最近日志
const fetchRecentLogs = async () => {
  try {
    const response = await getAuditLogs({ page: 1, limit: 10 })
    recentLogs.value = response.data.items || []
  } catch (error) {
    console.error('获取审计日志失败:', error)
  }
}

// 跳转到指定页面
const goToPage = (path: string) => {
  router.push(path)
}

// 初始化
onMounted(async () => {
  if (isSuperAdmin.value) {
    // 系统管理员：获取系统级统计
    await fetchSystemStats()
  } else if (isInitCompleted.value) {
    // 租户管理员且账套初始化完成：获取租户级统计
    await Promise.all([
      fetchTenantStats(),
      fetchRecentLogs()
    ])
  }
  // 如果账套未初始化完成，不调用业务API，避免403错误
})
</script>

<style scoped>
.dashboard-container {
  /* MainLayout el-main 已提供 padding */
}

.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.action-card {
  margin-bottom: 20px;
}

.action-card .el-button {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-card {
  margin-bottom: 20px;
}
</style>
