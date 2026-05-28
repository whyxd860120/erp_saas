<template>
  <div class="audit-log-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>审计日志</h2>
        </div>
      </template>
      
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="用户">
          <el-input
            v-model="searchForm.username"
            placeholder="请输入用户名"
            clearable
            style="width: 150px;"
          />
        </el-form-item>
        
        <el-form-item label="操作">
          <el-input
            v-model="searchForm.action"
            placeholder="请输入操作"
            clearable
            style="width: 150px;"
          />
        </el-form-item>
        
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.timeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 250px;"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 日志表格 -->
      <el-table
        :data="logList"
        border
        style="width: 100%;"
        v-loading="loading"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户" width="120" />
        <el-table-column prop="action" label="操作" width="150" />
        <el-table-column prop="module" label="模块" width="120" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="ip" label="IP地址" width="130" />
        <el-table-column prop="createdAt" label="时间" width="180" />
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { auditLogApi } from '@/api'

// 搜索表单
const searchForm = reactive({
  username: '',
  action: '',
  timeRange: []
})

// 日志列表
const logList = ref([])
const loading = ref(false)

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 获取审计日志
const fetchAuditLogs = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.currentPage,
      limit: pagination.pageSize
    }
    
    if (searchForm.username) {
      params.username = searchForm.username
    }
    
    if (searchForm.action) {
      params.action = searchForm.action
    }
    
    if (searchForm.timeRange && searchForm.timeRange.length === 2) {
      params.startDate = searchForm.timeRange[0]
      params.endDate = searchForm.timeRange[1]
    }
    
    const response: any = await auditLogApi.getAuditLogs(params)
    if (response.success) {
      logList.value = response.data.items || []
      pagination.total = response.data.total || 0
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取审计日志失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.currentPage = 1
  fetchAuditLogs()
}

// 重置搜索
const resetSearch = () => {
  searchForm.username = ''
  searchForm.action = ''
  searchForm.timeRange = []
  pagination.currentPage = 1
  fetchAuditLogs()
}

// 分页大小改变
const handleSizeChange = (val: number) => {
  pagination.pageSize = val
  pagination.currentPage = 1
  fetchAuditLogs()
}

// 当前页改变
const handleCurrentChange = (val: number) => {
  pagination.currentPage = val
  fetchAuditLogs()
}

// 页面加载时获取数据
onMounted(() => {
  fetchAuditLogs()
})
</script>

<style scoped>
.audit-log-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
}

.search-form {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}
</style>