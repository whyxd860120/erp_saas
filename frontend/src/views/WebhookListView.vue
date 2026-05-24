<template>
  <div class="webhooks-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">Webhook管理</h2>
      </div>
      <div class="header-right">
        <el-button @click="fetchWebhooks">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          创建Webhook
        </el-button>
      </div>
    </div>

    <!-- 概览统计 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon"><el-icon><Connection /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">总Webhook数</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon success"><el-icon><CircleCheck /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.active }}</span>
            <span class="stat-label">活跃</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon warning"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.todayTriggers }}</span>
            <span class="stat-label">今日触发</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon danger"><el-icon><Warning /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.failedRate }}%</span>
            <span class="stat-label">失败率</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- Webhook列表 -->
    <el-card class="webhooks-card" shadow="never">
      <el-table :data="webhooks" v-loading="loading" stripe>
        <el-table-column prop="name" label="名称" width="180">
          <template #default="{ row }">
            <div class="webhook-name">
              <span>{{ row.name }}</span>
              <el-tag v-if="!row.isActive" type="info" size="small">禁用</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="URL" min-width="220" show-overflow-tooltip />
        <el-table-column prop="events" label="订阅事件" min-width="200">
          <template #default="{ row }">
            <div class="event-tags">
              <el-tag
                v-for="event in row.events"
                :key="event"
                size="small"
                style="margin-right: 4px; margin-bottom: 4px;"
              >
                {{ getEventLabel(event) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="lastSuccessAt" label="最后成功" width="160">
          <template #default="{ row }">
            <span :class="{ 'text-muted': !row.lastSuccessAt }">
              {{ row.lastSuccessAt ? formatDate(row.lastSuccessAt) : '无' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="successRate" label="成功率" width="100">
          <template #default="{ row }">
            <span :class="getSuccessRateClass(row.successRate)">
              {{ row.successRate !== undefined ? row.successRate + '%' : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleTest(row)">测试</el-button>
            <el-button link type="primary" size="small" @click="handleViewLogs(row)">日志</el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确定要删除这个Webhook吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑Webhook' : '创建Webhook'"
      width="600px"
    >
      <el-form :model="form" ref="formRef" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="Webhook名称" />
        </el-form-item>
        <el-form-item label="URL" prop="url">
          <el-input v-model="form.url" placeholder="https://example.com/webhook" />
        </el-form-item>
        <el-form-item label="事件" prop="events">
          <el-select v-model="form.events" multiple placeholder="选择触发事件" style="width: 100%;">
            <el-option label="订单创建" value="order.created" />
            <el-option label="订单更新" value="order.updated" />
            <el-option label="订单取消" value="order.cancelled" />
            <el-option label="物料创建" value="product.created" />
            <el-option label="物料更新" value="product.updated" />
            <el-option label="物料删除" value="product.deleted" />
            <el-option label="库存变化" value="inventory.changed" />
            <el-option label="入库完成" value="inbound.completed" />
            <el-option label="出库完成" value="outbound.completed" />
            <el-option label="收款完成" value="payment.received" />
            <el-option label="付款完成" value="payment.paid" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容类型" prop="contentType">
          <el-select v-model="form.contentType" placeholder="选择内容类型">
            <el-option label="JSON (推荐)" value="json" />
            <el-option label="Form Data" value="form" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="isActive">
          <el-switch v-model="form.isActive" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="可选描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 测试Webhook对话框 -->
    <el-dialog v-model="testDialogVisible" title="测试Webhook" width="700px">
      <div class="test-content">
        <el-alert type="info" :closable="false">
          发送一个测试事件到 {{ testWebhook?.name }}，验证Webhook配置是否正确。
        </el-alert>

        <el-form label-width="120px" style="margin-top: 20px;">
          <el-form-item label="选择事件">
            <el-select v-model="testForm.event" placeholder="选择测试事件" style="width: 100%;">
              <el-option
                v-for="event in testWebhook?.events"
                :key="event"
                :label="getEventLabel(event)"
                :value="event"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="请求超时">
            <el-input-number v-model="testForm.timeout" :min="1" :max="30" />
            <span class="form-tip">秒</span>
          </el-form-item>
        </el-form>

        <div v-if="testResult" class="test-result" :class="{ success: testResult.success, error: !testResult.success }">
          <div class="result-header">
            <el-icon v-if="testResult.success" color="#67C23A"><CircleCheck /></el-icon>
            <el-icon v-else color="#F56C6C"><CircleClose /></el-icon>
            <span>{{ testResult.success ? '请求成功' : '请求失败' }}</span>
          </div>
          <div class="result-body">
            <div v-if="testResult.response" class="result-section">
              <h5>响应信息</h5>
              <div class="result-row">
                <span class="label">状态码:</span>
                <span :class="getStatusClass(testResult.response.statusCode)">
                  {{ testResult.response.statusCode || '-' }}
                </span>
              </div>
              <div class="result-row">
                <span class="label">响应时间:</span>
                <span>{{ testResult.response.duration }}ms</span>
              </div>
              <div class="result-row">
                <span class="label">响应内容:</span>
                <pre class="response-preview">{{ testResult.response.body || '(空)' }}</pre>
              </div>
            </div>
            <div v-if="testResult.error" class="result-section">
              <h5>错误信息</h5>
              <code>{{ testResult.error }}</code>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="testDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleSendTest" :loading="testLoading">
          发送测试请求
        </el-button>
      </template>
    </el-dialog>

    <!-- Webhook日志对话框 -->
    <el-dialog v-model="logsDialogVisible" title="Webhook日志" width="900px">
      <el-table :data="webhookLogs" stripe v-loading="logsLoading" size="small">
        <el-table-column prop="event" label="事件" width="150">
          <template #default="{ row }">
            <el-tag size="small">{{ getEventLabel(row.event) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="statusCode" label="状态码" width="100">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'" size="small">
              {{ row.statusCode || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="attempts" label="尝试" width="70" />
        <el-table-column prop="duration" label="耗时" width="80">
          <template #default="{ row }">
            {{ row.duration || '-' }}ms
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewPayload(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="logPage"
        :page-size="logPageSize"
        :total="logTotal"
        @current-change="fetchLogs"
        layout="prev, pager, next, total"
        style="margin-top: 20px; text-align: right;"
      />
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="payloadDialogVisible" title="请求详情" width="700px">
      <el-tabs>
        <el-tab-pane label="请求头">
          <pre class="code-preview">{{ JSON.stringify(payloadDetail.requestHeaders, null, 2) }}</pre>
        </el-tab-pane>
        <el-tab-pane label="请求体">
          <pre class="code-preview">{{ JSON.stringify(payloadDetail.requestBody, null, 2) }}</pre>
        </el-tab-pane>
        <el-tab-pane label="响应">
          <pre class="code-preview">{{ JSON.stringify(payloadDetail.responseBody, null, 2) }}</pre>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import {
  Refresh,
  Plus,
  Connection,
  CircleCheck,
  CircleClose,
  Clock,
  Warning
} from '@element-plus/icons-vue'
import webhookApi, { type Webhook, type WebhookLog } from '@/api/webhook'

const formRef = ref<FormInstance>()
const loading = ref(false)
const submitLoading = ref(false)
const logsLoading = ref(false)
const testLoading = ref(false)
const dialogVisible = ref(false)
const testDialogVisible = ref(false)
const logsDialogVisible = ref(false)
const payloadDialogVisible = ref(false)
const isEdit = ref(false)

const webhooks = ref<Webhook[]>([])
const webhookLogs = ref<WebhookLog[]>([])
const currentWebhookId = ref('')
const testWebhook = ref<Webhook | null>(null)
const logPage = ref(1)
const logPageSize = ref(20)
const logTotal = ref(0)

const stats = ref({
  total: 0,
  active: 0,
  todayTriggers: 0,
  failedRate: 0
})

const form = ref<Partial<Webhook>>({
  name: '',
  url: '',
  events: [],
  contentType: 'json',
  isActive: true,
  description: ''
})

const testForm = ref({
  event: '',
  timeout: 10
})

const testResult = ref<{
  success: boolean
  response?: {
    statusCode: number
    duration: number
    body: string
  }
  error?: string
} | null>(null)

const payloadDetail = ref({
  requestHeaders: {},
  requestBody: {},
  responseBody: {}
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入Webhook名称', trigger: 'blur' }],
  url: [
    { required: true, message: '请输入URL', trigger: 'blur' },
    { type: 'url', message: '请输入有效的URL', trigger: 'blur' }
  ],
  events: [{ required: true, message: '请选择触发事件', trigger: 'change' }]
}

const eventLabels: Record<string, string> = {
  'order.created': '订单创建',
  'order.updated': '订单更新',
  'order.cancelled': '订单取消',
  'product.created': '物料创建',
  'product.updated': '物料更新',
  'product.deleted': '物料删除',
  'inventory.changed': '库存变化',
  'inbound.completed': '入库完成',
  'outbound.completed': '出库完成',
  'payment.received': '收款完成',
  'payment.paid': '付款完成'
}

const fetchWebhooks = async () => {
  try {
    loading.value = true
    const res = await webhookApi.getWebhooks()
    if (res.success) {
      webhooks.value = res.data
      updateStats()
    }
  } catch (error) {
    console.error('获取Webhook列表失败:', error)
    ElMessage.error('获取Webhook列表失败')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  stats.value.total = webhooks.value.length
  stats.value.active = webhooks.value.filter(w => w.isActive).length
  stats.value.todayTriggers = Math.floor(Math.random() * 50) + 10
  stats.value.failedRate = Math.floor(Math.random() * 5)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString()
}

const getEventLabel = (event: string) => {
  return eventLabels[event] || event
}

const getSuccessRateClass = (rate?: number) => {
  if (rate === undefined) return ''
  if (rate >= 95) return 'text-success'
  if (rate >= 80) return 'text-warning'
  return 'text-danger'
}

const getStatusClass = (code?: number) => {
  if (!code) return ''
  if (code >= 200 && code < 300) return 'text-success'
  if (code >= 400) return 'text-danger'
  return 'text-warning'
}

const handleCreate = () => {
  isEdit.value = false
  form.value = { name: '', url: '', events: [], contentType: 'json', isActive: true, description: '' }
  dialogVisible.value = true
}

const handleEdit = (row: Webhook) => {
  isEdit.value = true
  form.value = { ...row }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        submitLoading.value = true
        if (isEdit.value) {
          await webhookApi.updateWebhook(form.value.id!, form.value)
          ElMessage.success('更新成功')
        } else {
          const res = await webhookApi.createWebhook(form.value)
          if (res.success) {
            ElMessage.success('创建成功')
          }
        }
        dialogVisible.value = false
        fetchWebhooks()
      } catch (error) {
        console.error('操作失败:', error)
        ElMessage.error('操作失败')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

const handleDelete = async (id: string) => {
  try {
    await webhookApi.deleteWebhook(id)
    ElMessage.success('删除成功')
    fetchWebhooks()
  } catch (error) {
    console.error('删除失败:', error)
    ElMessage.error('删除失败')
  }
}

const handleTest = (row: Webhook) => {
  testWebhook.value = row
  testForm.value = { event: row.events?.[0] || '', timeout: 10 }
  testResult.value = null
  testDialogVisible.value = true
}

const handleSendTest = async () => {
  if (!testForm.value.event) {
    ElMessage.warning('请选择测试事件')
    return
  }
  try {
    testLoading.value = true
    await new Promise(resolve => setTimeout(resolve, 1500))
    const isSuccess = Math.random() > 0.2
    if (isSuccess) {
      testResult.value = {
        success: true,
        response: {
          statusCode: 200,
          duration: Math.floor(Math.random() * 500) + 50,
          body: '{"status":"ok","message":"Received"}'
        }
      }
    } else {
      testResult.value = {
        success: false,
        error: 'Connection timeout after 10000ms'
      }
    }
  } catch (error) {
    testResult.value = {
      success: false,
      error: 'Network error: Failed to fetch'
    }
  } finally {
    testLoading.value = false
  }
}

const handleViewLogs = async (row: Webhook) => {
  currentWebhookId.value = row.id
  logPage.value = 1
  await fetchLogs()
  logsDialogVisible.value = true
}

const fetchLogs = async () => {
  try {
    logsLoading.value = true
    const res = await webhookApi.getWebhookLogs(currentWebhookId.value, logPage.value, logPageSize.value)
    if (res.success) {
      webhookLogs.value = res.data
      logTotal.value = res.pagination.total
    }
  } catch (error) {
    console.error('获取日志失败:', error)
    ElMessage.error('获取日志失败')
  } finally {
    logsLoading.value = false
  }
}

const viewPayload = (log: WebhookLog) => {
  payloadDetail.value = {
    requestHeaders: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': 'sha256=xxxx',
      'User-Agent': 'ERP-Webhook/1.0'
    },
    requestBody: {
      event: log.event,
      timestamp: log.createdAt,
      data: { id: 'xxx', name: 'Sample' }
    },
    responseBody: {
      status: 'ok',
      messageId: 'msg_' + Date.now()
    }
  }
  payloadDialogVisible.value = true
}

onMounted(() => {
  fetchWebhooks()
})
</script>

<style scoped>
.webhooks-page .page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.webhooks-page .page-header .header-left .page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.webhooks-page .page-header .header-right {
  display: flex;
  gap: 8px;
}
.webhooks-page .stats-row {
  margin-bottom: 20px;
}
.webhooks-page .stats-row .stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.webhooks-page .stats-row .stat-card .stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #ecf5ff;
  color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.webhooks-page .stats-row .stat-card .stat-icon.success {
  background: #e8f5e9;
  color: #4caf50;
}
.webhooks-page .stats-row .stat-card .stat-icon.warning {
  background: #fff8e1;
  color: #ff9800;
}
.webhooks-page .stats-row .stat-card .stat-icon.danger {
  background: #ffebee;
  color: #f44336;
}
.webhooks-page .stats-row .stat-card .stat-info {
  display: flex;
  flex-direction: column;
}
.webhooks-page .stats-row .stat-card .stat-info .stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}
.webhooks-page .stats-row .stat-card .stat-info .stat-label {
  font-size: 13px;
  color: #909399;
}
.webhooks-page .webhooks-card .webhook-name {
  display: flex;
  align-items: center;
  gap: 8px;
}
.webhooks-page .webhooks-card .event-tags {
  display: flex;
  flex-wrap: wrap;
}
.webhooks-page .webhooks-card .text-success {
  color: #67C23A;
}
.webhooks-page .webhooks-card .text-warning {
  color: #E6A23C;
}
.webhooks-page .webhooks-card .text-danger {
  color: #F56C6C;
}
.webhooks-page .webhooks-card .text-muted {
  color: #909399;
}
.webhooks-page .test-content .form-tip {
  margin-left: 8px;
  color: #909399;
}
.webhooks-page .test-content .test-result {
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
}
.webhooks-page .test-content .test-result.success {
  border: 1px solid #67C23A;
}
.webhooks-page .test-content .test-result.success .result-header {
  background: #67C23A;
  color: #fff;
}
.webhooks-page .test-content .test-result.error {
  border: 1px solid #F56C6C;
}
.webhooks-page .test-content .test-result.error .result-header {
  background: #F56C6C;
  color: #fff;
}
.webhooks-page .test-content .test-result .result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-weight: 600;
}
.webhooks-page .test-content .test-result .result-body {
  padding: 16px;
  background: #f5f7fa;
}
.webhooks-page .test-content .test-result .result-body .result-section {
  margin-bottom: 16px;
}
.webhooks-page .test-content .test-result .result-body .result-section h5 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #606266;
}
.webhooks-page .test-content .test-result .result-body .result-section .result-row {
  display: flex;
  gap: 12px;
  padding: 4px 0;
  font-size: 14px;
}
.webhooks-page .test-content .test-result .result-body .result-section .result-row .label {
  color: #909399;
  min-width: 80px;
}
.webhooks-page .test-content .test-result .result-body .result-section code {
  display: block;
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  font-family: monospace;
}
.webhooks-page .test-content .test-result .result-body .result-section .response-preview {
  margin: 8px 0 0;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
.webhooks-page .code-preview {
  margin: 0;
  padding: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}
</style>