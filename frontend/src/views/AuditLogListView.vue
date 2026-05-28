<template>
  <div class="audit-log-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>审计日志</span>
          <el-button type="primary" @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="用户">
          <el-select v-model="searchForm.userId" placeholder="请选择用户" clearable filterable>
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模块">
          <el-select v-model="searchForm.module" placeholder="请选择模块" clearable>
            <el-option label="认证" value="auth" />
            <el-option label="用户" value="user" />
            <el-option label="租户" value="tenant" />
            <el-option label="供应商" value="supplier" />
            <el-option label="客户" value="customer" />
            <el-option label="物料" value="product" />
            <el-option label="仓库" value="warehouse" />
            <el-option label="账户" value="account" />
            <el-option label="采购订单" value="purchase-order" />
            <el-option label="销售订单" value="sales-order" />
            <el-option label="采购入库" value="purchase-inbound" />
            <el-option label="销售出库" value="sales-outbound" />
            <el-option label="收款单" value="payment-receipt" />
            <el-option label="付款单" value="payment-payment" />
            <el-option label="库存" value="inventory" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作">
          <el-select v-model="searchForm.action" placeholder="请选择操作" clearable>
            <el-option label="创建" value="create" />
            <el-option label="更新" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="登录" value="login" />
            <el-option label="登出" value="logout" />
            <el-option label="确认" value="confirm" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 250px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 表格 -->
      <el-table :data="tableData" stripe border style="width: 100%">
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="用户" width="120">
          <template #default="{ row }">
            {{ row.user?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="模块" width="120">
          <template #default="{ row }">
            {{ getModuleText(row.module) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)">
              {{ getActionText(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" show-overflow-tooltip />
        <el-table-column label="IP地址" width="150">
          <template #default="{ row }">
            {{ row.ipAddress || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="日志详情"
      width="800px"
    >
      <el-descriptions :column="2" border v-if="currentLog">
        <el-descriptions-item label="时间">{{ formatDate(currentLog.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ currentLog.user?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="模块">{{ getModuleText(currentLog.module) }}</el-descriptions-item>
        <el-descriptions-item label="操作">{{ getActionText(currentLog.action) }}</el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ currentLog.ipAddress || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用户代理" :span="2">{{ currentLog.userAgent || '-' }}</el-descriptions-item>
        <el-descriptions-item label="详情" :span="2">{{ currentLog.detail || '-' }}</el-descriptions-item>
        <el-descriptions-item label="原始数据" :span="2">
          <pre>{{ JSON.stringify(currentLog.oldValues, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="新数据" :span="2">
          <pre>{{ JSON.stringify(currentLog.newValues, null, 2) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getAuditLogs } from '@/api/audit-log'
import { getUsers } from '@/api/user'

// 数据列表
const tableData = ref([])
const loading = ref(false)

// 用户列表
const users = ref<any[]>([])

// 搜索表单
const searchForm = reactive({
  userId: '',
  module: '',
  action: '',
  dateRange: null as any
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 详情对话框
const detailDialogVisible = ref(false)
const currentLog = ref<any>(null)

// 获取审计日志列表
const fetchAuditLogs = async () => {
  try {
    loading.value = true
    
    const params: any = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (searchForm.userId) params.userId = searchForm.userId
    if (searchForm.module) params.module = searchForm.module
    if (searchForm.action) params.action = searchForm.action
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    const response: any = await getAuditLogs(params)
    if (response.success) {
      tableData.value = response.data.items
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('获取审计日志列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    const response: any = await getUsers({ page: 1, limit: 1000 })
    if (response.success) {
      users.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchAuditLogs()
}

// 重置搜索
const handleReset = () => {
  searchForm.userId = ''
  searchForm.module = ''
  searchForm.action = ''
  searchForm.dateRange = null
  pagination.page = 1
  fetchAuditLogs()
}

// 刷新
const handleRefresh = () => {
  fetchAuditLogs()
}

// 查看详情
const handleViewDetail = (row: any) => {
  currentLog.value = row
  detailDialogVisible.value = true
}

// 获取模块文本
const getModuleText = (module: string) => {
  const map: Record<string, string> = {
    'auth': '认证',
    'user': '用户',
    'tenant': '租户',
    'supplier': '供应商',
    'customer': '客户',
    'product': '物料',
    'warehouse': '仓库',
    'account': '账户',
    'purchase-order': '采购订单',
    'sales-order': '销售订单',
    'purchase-inbound': '采购入库',
    'sales-outbound': '销售出库',
    'payment-receipt': '收款单',
    'payment-payment': '付款单',
    'inventory': '库存'
  }
  return map[module] || module
}

// 获取操作类型
const getActionType = (action: string) => {
  const map: Record<string, string> = {
    'create': 'success',
    'update': 'warning',
    'delete': 'danger',
    'login': 'info',
    'logout': 'info',
    'confirm': ''
  }
  return map[action] || 'info'
}

// 获取操作文本
const getActionText = (action: string) => {
  const map: Record<string, string> = {
    'create': '创建',
    'update': '更新',
    'delete': '删除',
    'login': '登录',
    'logout': '登出',
    'confirm': '确认'
  }
  return map[action] || action
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 分页大小改变
const handleSizeChange = (val: number) => {
  pagination.limit = val
  pagination.page = 1
  fetchAuditLogs()
}

// 当前页改变
const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchAuditLogs()
}

// 初始化
onMounted(async () => {
  await Promise.all([
    fetchAuditLogs(),
    fetchUsers()
  ])
})
</script>

<style scoped>
.audit-log-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

pre {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 12px;
}
</style>