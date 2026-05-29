<template>
  <div class="shop-user-page">
    <el-card shadow="never">
      <template #header><span>商城用户管理</span></template>

      <div class="search-bar">
        <el-input v-model="keyword" placeholder="搜索昵称/手机号" clearable style="width: 260px" @clear="fetchList" @keyup.enter="fetchList" />
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px; margin-left: 12px" @change="fetchList">
          <el-option label="正常" value="active" />
          <el-option label="禁用" value="disabled" />
        </el-select>
        <el-button type="primary" style="margin-left: 12px" @click="fetchList">搜索</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe style="margin-top: 16px">
        <el-table-column label="头像" width="70">
          <template #default="{ row }">
            <el-avatar v-if="row.avatarUrl" :src="row.avatarUrl" :size="40" />
            <el-avatar v-else :size="40">{{ row.nickname?.charAt(0) || 'U' }}</el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="openid" label="OpenID" min-width="200" show-overflow-tooltip />
        <el-table-column prop="mobile" label="手机号" width="130" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最近登录" width="160" />
        <el-table-column prop="createdAt" label="注册时间" width="160" />
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="row.status === 'active'" link type="danger" size="small" @click="handleToggleStatus(row)">
              禁用
            </el-button>
            <el-button v-else link type="success" size="small" @click="handleToggleStatus(row)">
              启用
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getShopUsers, updateShopUserStatus } from '@/api/shop'

const list = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value) params.status = statusFilter.value
    const res = await getShopUsers(params)
    list.value = (res as any).data?.items || []
    total.value = (res as any).data?.total || 0
  } finally {
    loading.value = false
  }
}

async function handleToggleStatus(row: any) {
  const newStatus = row.status === 'active' ? 'disabled' : 'active'
  const action = newStatus === 'active' ? '启用' : '禁用'
  await ElMessageBox.confirm(`确定${action}用户「${row.nickname}」吗？`, `确认${action}`, { type: 'warning' })
  await updateShopUserStatus(row.id, newStatus)
  ElMessage.success(`已${action}`)
  fetchList()
}

onMounted(() => fetchList())
</script>

<style scoped>
.search-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
