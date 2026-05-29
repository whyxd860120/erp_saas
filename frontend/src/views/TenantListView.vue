<template>
  <div class="tenant-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>租户管理</span>
          <div class="header-actions">
            <el-button @click="handleHelp">
              <el-icon><QuestionFilled /></el-icon>
              帮助
            </el-button>
            <el-button type="primary" :icon="Plus" @click="handleCreate">
              新增租户
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索租户名称或域名"
          clearable
          style="width: 300px"
          :prefix-icon="Search"
          @clear="loadTenants"
          @keyup.enter="loadTenants"
        />
        <el-select
          v-model="searchStatus"
          placeholder="状态筛选"
          clearable
          style="width: 150px"
          @change="loadTenants"
        >
          <el-option label="启用" value="active" />
          <el-option label="停用" value="inactive" />
          <el-option label="试用中" value="trial" />
          <el-option label="已过期" value="expired" />
        </el-select>
        <el-button :icon="Refresh" @click="loadTenants">刷新</el-button>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="tenants"
        border
        stripe
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="name" label="租户名称" min-width="180" sortable="custom">
          <template #default="{ row }">
            <div class="tenant-info">
              <div class="tenant-name">{{ row.name }}</div>
              <div class="tenant-slug">@{{ row.slug }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="plan" label="订阅计划" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getPlanType(row.plan)" size="small">
              {{ getPlanLabel(row.plan) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="trialEndsAt" label="到期时间" width="160" align="center">
          <template #default="{ row }">
            <span v-if="row.trialEndsAt || row.currentPeriodEndsAt">
              {{ formatDate(row.trialEndsAt || row.currentPeriodEndsAt) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="userCount" label="用户数" width="100" align="center">
          <template #default="{ row }">
            {{ row._count?.users || 0 }} / {{ row.quotaUsers || 5 }}
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间" width="180" sortable="custom">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :icon="View"
              @click="handleView(row)"
            >
              查看
            </el-button>
            <el-button
              link
              type="primary"
              :icon="Edit"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              :icon="Delete"
              @click="handleDelete(row)"
            >
              删除
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
          @size-change="loadTenants"
          @current-change="loadTenants"
        />
      </div>
    </el-card>

    <!-- 新增/编辑租户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑租户' : '新增租户'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-form-item label="租户名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入租户名称" />
        </el-form-item>

        <el-form-item label="租户标识" prop="slug">
          <el-input
            v-model="formData.slug"
            placeholder="请输入租户标识（小写字母、数字、连字符）"
          >
            <template #append>
              <el-button @click="generateSlug" :icon="Refresh" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="显示名称" prop="displayName">
          <el-input v-model="formData.displayName" placeholder="请输入显示名称（可选）" />
        </el-form-item>

        <el-form-item label="订阅计划" prop="plan">
          <el-select v-model="formData.plan" placeholder="请选择订阅计划" style="width: 100%">
            <el-option label="免费版" value="free" />
            <el-option label="基础版" value="basic" />
            <el-option label="专业版" value="pro" />
            <el-option label="企业版" value="enterprise" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="trial">试用中</el-radio>
            <el-radio label="suspended">停用</el-radio>
            <el-radio label="expired">已过期</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="试用到期时间">
          <el-date-picker
            v-model="formData.trialEndsAt"
            type="datetime"
            placeholder="设置试用到期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
            clearable
          />
        </el-form-item>

        <el-form-item label="订阅开始时间">
          <el-date-picker
            v-model="formData.currentPeriodStartsAt"
            type="datetime"
            placeholder="设置订阅开始时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
            clearable
          />
        </el-form-item>

        <el-form-item label="订阅到期时间">
          <el-date-picker
            v-model="formData.currentPeriodEndsAt"
            type="datetime"
            placeholder="设置订阅到期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
            clearable
          />
        </el-form-item>

        <el-form-item label="联系邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入联系邮箱" />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入联系电话" />
        </el-form-item>

        <el-form-item label="地址" prop="address">
          <el-input v-model="formData.address" placeholder="请输入地址" />
        </el-form-item>

        <el-form-item label="税号" prop="taxNo">
          <el-input v-model="formData.taxNo" placeholder="请输入税号" />
        </el-form-item>

        <el-divider content-position="left">功能开关</el-divider>

        <el-form-item label="多仓库">
          <el-switch v-model="formData.featureMultiWarehouse" />
        </el-form-item>

        <el-form-item label="多币种">
          <el-switch v-model="formData.featureMultiCurrency" />
        </el-form-item>

        <el-form-item label="自定义字段">
          <el-switch v-model="formData.featureCustomFields" />
        </el-form-item>

        <el-form-item label="API访问">
          <el-switch v-model="formData.featureApiAccess" />
        </el-form-item>

        <el-form-item label="Webhook">
          <el-switch v-model="formData.featureWebhooks" />
        </el-form-item>

        <el-form-item label="审计日志">
          <el-switch v-model="formData.featureAuditLogs" />
        </el-form-item>

        <el-form-item label="数据分析">
          <el-switch v-model="formData.featureAnalytics" />
        </el-form-item>

        <el-divider content-position="left">配额设置</el-divider>

        <el-form-item label="用户数量限制">
          <el-input-number v-model="formData.quotaUsers" :min="1" :max="1000" />
        </el-form-item>

        <el-form-item label="存储空间(MB)">
          <el-input-number v-model="formData.quotaStorage" :min="100" :max="100000" />
        </el-form-item>

        <el-form-item label="API调用量/月">
          <el-input-number v-model="formData.quotaApiCalls" :min="100" :max="1000000" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看租户详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="租户详情"
      width="700px"
    >
      <el-descriptions v-if="currentTenant" :column="2" border>
        <el-descriptions-item label="租户名称">{{ currentTenant.name }}</el-descriptions-item>
        <el-descriptions-item label="租户标识">@{{ currentTenant.slug }}</el-descriptions-item>
        <el-descriptions-item label="显示名称">{{ currentTenant.displayName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="订阅计划">
          <el-tag :type="getPlanType(currentTenant.plan)" size="small">
            {{ getPlanLabel(currentTenant.plan) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentTenant.status)" size="small">
            {{ getStatusLabel(currentTenant.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="试用到期时间">
          {{ currentTenant.trialEndsAt ? formatDate(currentTenant.trialEndsAt) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="订阅开始时间">
          {{ currentTenant.currentPeriodStartsAt ? formatDate(currentTenant.currentPeriodStartsAt) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="订阅到期时间">
          {{ currentTenant.currentPeriodEndsAt ? formatDate(currentTenant.currentPeriodEndsAt) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系邮箱">{{ currentTenant.email || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentTenant.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="地址">{{ currentTenant.address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="税号">{{ currentTenant.taxNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="用户数">
          {{ currentTenant._count?.users || 0 }} / {{ currentTenant.quotaUsers || 5 }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(currentTenant.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDate(currentTenant.updatedAt) }}</el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">功能开关</el-divider>
      <div class="feature-grid">
        <div class="feature-item" v-for="(_, feature) in features" :key="feature">
          <el-icon><component :is="features[feature].icon" /></el-icon>
          <span>{{ features[feature].label }}</span>
          <el-tag v-if="currentTenant" :type="getFeatureStatusType((currentTenant as any)[`feature${feature.charAt(0).toUpperCase() + feature.slice(1)}`])" size="small">
            {{ getFeatureStatusLabel((currentTenant as any)[`feature${feature.charAt(0).toUpperCase() + feature.slice(1)}`]) }}
          </el-tag>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      module-name="租户管理"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, View, Edit, Delete, OfficeBuilding, Link, Setting, DataAnalysis, Tools, Key, Document, Monitor, QuestionFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import * as tenantApi from '@/api/tenant'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'
import pinyin from 'pinyin'

interface Tenant {
  id: string
  name: string
  slug: string
  displayName?: string
  plan: string
  status: string
  email?: string
  phone?: string
  address?: string
  taxNo?: string
  quotaUsers: number
  quotaStorage: number
  quotaApiCalls: number
  featureMultiWarehouse: boolean
  featureMultiCurrency: boolean
  featureCustomFields: boolean
  featureApiAccess: boolean
  featureWebhooks: boolean
  featureAuditLogs: boolean
  featureAnalytics: boolean
  trialEndsAt?: string
  currentPeriodStartsAt?: string
  currentPeriodEndsAt?: string
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
  }
  [key: string]: any
}

const loading = ref(false)
const submitLoading = ref(false)
const searchKeyword = ref('')
const searchStatus = ref('')
const tenants = ref<Tenant[]>([])
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const helpDialogVisible = ref(false)
const isEdit = ref(false)
const currentTenant = ref<Tenant | null>(null)
const formRef = ref<FormInstance>()

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const formData = reactive({
  name: '',
  slug: '',
  displayName: '',
  plan: 'free',
  status: 'active',
  trialEndsAt: null as string | null,
  currentPeriodStartsAt: null as string | null,
  currentPeriodEndsAt: null as string | null,
  email: '',
  phone: '',
  address: '',
  taxNo: '',
  featureMultiWarehouse: true,
  featureMultiCurrency: false,
  featureCustomFields: false,
  featureApiAccess: false,
  featureWebhooks: false,
  featureAuditLogs: true,
  featureAnalytics: false,
  quotaUsers: 5,
  quotaStorage: 1000,
  quotaApiCalls: 1000
})

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入租户名称', trigger: 'blur' },
    { min: 2, max: 100, message: '租户名称长度为2-100个字符', trigger: 'blur' }
  ],
  slug: [
    { required: true, message: '请输入租户标识', trigger: 'blur' },
    { pattern: /^[a-z0-9-]+$/, message: '租户标识只能包含小写字母、数字和连字符', trigger: 'blur' },
    { min: 3, max: 50, message: '租户标识长度为3-50个字符', trigger: 'blur' }
  ],
  plan: [
    { required: true, message: '请选择订阅计划', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ],
  email: [
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ]
}

const features = {
  multiWarehouse: { label: '多仓库', icon: OfficeBuilding },
  multiCurrency: { label: '多币种', icon: Link },
  customFields: { label: '自定义字段', icon: Setting },
  apiAccess: { label: 'API访问', icon: Key },
  webhooks: { label: 'Webhook', icon: Document },
  auditLogs: { label: '审计日志', icon: Monitor },
  analytics: { label: '数据分析', icon: DataAnalysis }
}

const loadTenants = async () => {
  loading.value = true
  try {
    const response: any = await tenantApi.getTenants({
      page: pagination.page,
      limit: pagination.limit,
      keyword: searchKeyword.value,
      status: searchStatus.value
    })
    
    if (response.success) {
      tenants.value = response.data.items
      pagination.total = response.data.total
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载租户列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: Tenant) => {
  if (!row || !row.id) {
    ElMessage.error('租户数据无效')
    return
  }
  
  isEdit.value = true
  currentTenant.value = row  // 设置当前租户
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleView = (row: Tenant) => {
  currentTenant.value = row
  detailDialogVisible.value = true
}

const handleDelete = async (row: Tenant) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除租户"${row.name}"吗？此操作将同时删除该租户下的所有数据，不可恢复！`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    const res: any = await tenantApi.deleteTenant(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      await loadTenants()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const generateSlug = () => {
  if (!formData.name) {
    ElMessage.warning('请先输入租户名称')
    return
  }
  
  const slug = pinyin(formData.name, {
    style: pinyin.STYLE_NORMAL,
    heteronym: false
  })
    .flat()
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  
  formData.slug = slug
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitLoading.value = true
    let res: any
    
    if (isEdit.value) {
      const updateData = { ...formData, status: formData.status as 'active' | 'inactive' }
      res = await tenantApi.updateTenant(currentTenant.value!.id, updateData)
    } else {
      res = await tenantApi.createTenant(formData)
    }
    
    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      await loadTenants()
    }
  } catch (error: any) {
    ElMessage.error(error.message || (isEdit.value ? '更新失败' : '创建失败'))
  } finally {
    submitLoading.value = false
  }
}

const resetForm = () => {
  Object.assign(formData, {
    name: '',
    slug: '',
    displayName: '',
    plan: 'free',
    status: 'active',
    trialEndsAt: null,
    currentPeriodStartsAt: null,
    currentPeriodEndsAt: null,
    email: '',
    phone: '',
    address: '',
    taxNo: '',
    featureMultiWarehouse: true,
    featureMultiCurrency: false,
    featureCustomFields: false,
    featureApiAccess: false,
    featureWebhooks: false,
    featureAuditLogs: true,
    featureAnalytics: false,
    quotaUsers: 5,
    quotaStorage: 1000,
    quotaApiCalls: 1000
  })
  formRef.value?.resetFields()
}

const handleSortChange = ({ prop, order }: { prop: string; order: string }) => {
  // 处理排序逻辑
  loadTenants()
}

const getPlanType = (plan: string) => {
  const types: Record<string, any> = {
    free: 'info',
    basic: 'success',
    pro: 'warning',
    enterprise: 'danger'
  }
  return types[plan] || 'info'
}

const getPlanLabel = (plan: string) => {
  const labels: Record<string, string> = {
    free: '免费版',
    basic: '基础版',
    pro: '专业版',
    enterprise: '企业版'
  }
  return labels[plan] || plan
}

const getStatusType = (status: any): 'primary' | 'success' | 'info' | 'warning' | 'danger' => {
  const safeStatus = status && typeof status === 'string' ? status : ''
  const types: Record<string, any> = {
    active: 'success',
    trial: 'warning',
    suspended: 'danger',
    expired: 'info'
  }
  const type = types[safeStatus] || 'info'
  const validTypes: Array<'primary' | 'success' | 'info' | 'warning' | 'danger'> = 
    ['primary', 'success', 'info', 'warning', 'danger']
  if (validTypes.includes(type)) {
    return type
  }
  return 'info'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    active: '启用',
    trial: '试用中',
    suspended: '停用',
    expired: '已过期'
  }
  return labels[status] || status
}

const getFeatureStatusType = (enabled: boolean) => {
  return enabled ? 'success' : 'info'
}

const getFeatureStatusLabel = (enabled: boolean) => {
  return enabled ? '已启用' : '未启用'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 帮助数据
const helpData = {
  operations: [
    {
      title: '新增租户',
      steps: [
        '点击"新增租户"按钮',
        '填写租户名称和标识',
        '设置显示名称',
        '选择订阅计划',
        '设置联系方式',
        '配置功能特性',
        '设置配额限制',
        '点击"确定"保存'
      ]
    },
    {
      title: '编辑租户',
      steps: [
        '在租户列表中找到要编辑的租户',
        '点击"编辑"按钮',
        '修改需要更新的信息',
        '点击"确定"保存修改'
      ]
    },
    {
      title: '查看租户详情',
      steps: [
        '在租户列表中找到要查看的租户',
        '点击"查看"按钮',
        '查看租户的详细信息',
        '查看功能特性和配额使用情况'
      ]
    }
  ],
  notices: [
    '租户标识必须唯一，建议使用英文字母和数字',
    '删除租户会删除该租户下的所有数据',
    '配额设置会影响租户的使用限制',
    '功能特性决定了租户可以使用的功能',
    '禁用的租户无法访问系统'
  ],
  tips: [
    '租户标识建议使用公司名称的拼音或英文缩写',
    '可以按状态、计划等条件筛选租户',
    '定期检查租户的配额使用情况',
    '根据租户需求调整功能特性',
    '建议为每个租户设置合理的配额限制'
  ],
  shortcuts: [
    { key: 'Ctrl+F', description: '快速搜索租户' },
    { key: 'F5', description: '刷新租户列表' },
    { key: 'Ctrl+N', description: '新增租户' }
  ],
  version: '1.0.0',
  lastUpdate: '2025-05-28',
  changes: [
    '新增租户管理功能',
    '支持多租户管理',
    '新增帮助文档功能'
  ]
}

// 打开帮助
const handleHelp = () => {
  helpDialogVisible.value = true
}

onMounted(() => {
  loadTenants()
})
</script>

<style scoped>
.tenant-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.tenant-info {
  display: flex;
  flex-direction: column;
}

.tenant-name {
  font-weight: 500;
  color: #303133;
}

.tenant-slug {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
}

.feature-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.feature-item .el-icon {
  color: #409eff;
  font-size: 18px;
}

.el-row {
  width: 100%;
}

.el-col {
  overflow: visible;
}
</style>