<template>
  <div class="approval-center">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>审批中心</span>
          <el-badge :value="pendingCount" :hidden="pendingCount === 0" type="primary">
            <el-button>待我审批 ({{ pendingCount }})</el-button>
          </el-badge>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="待我审批" name="pending">
          <template #label>
            <span>待我审批 <el-badge :value="pendingCount" :hidden="pendingCount === 0" :max="99" /></span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="我发起的" name="my-requests" />
        <el-tab-pane label="审批历史" name="history" />
      </el-tabs>

      <!-- 待我审批列表 -->
      <div v-if="activeTab === 'pending'" class="pending-list">
        <div v-if="pendingList.length === 0" class="empty-state">
          <el-empty description="暂无待审批的单据" />
        </div>
        <div v-else class="approval-cards">
          <el-card
            v-for="item in pendingList"
            :key="item.id"
            class="approval-card"
            shadow="hover"
          >
            <div class="card-content">
              <div class="card-header">
                <span class="title">{{ item.instance?.title }}</span>
                <el-tag size="small" type="warning">待审批</el-tag>
              </div>
              <div class="card-info">
                <div class="info-item">
                  <span class="label">单据编号：</span>
                  <span class="value">{{ item.instance?.documentNo || '-' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">单据类型：</span>
                  <span class="value">{{ getDocumentTypeLabel(item.instance?.documentType) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">当前节点：</span>
                  <span class="value">{{ item.node?.name }}</span>
                </div>
                <div class="info-item">
                  <span class="label">发起时间：</span>
                  <span class="value">{{ formatDate(item.instance?.startedAt) }}</span>
                </div>
              </div>
              <div class="card-actions">
                <el-button type="primary" size="small" @click="handleApprove(item)">审批</el-button>
                <el-button size="small" @click="handleViewDetail(item)">查看详情</el-button>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <!-- 我发起的列表 -->
      <div v-if="activeTab === 'my-requests'" class="my-requests-list">
        <div class="filter-bar">
          <el-select v-model="myRequestStatus" placeholder="状态" clearable style="width: 120px" @change="loadMyRequests">
            <el-option label="全部" value="" />
            <el-option label="待审批" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </div>
        <el-table :data="myRequestList" stripe border style="width: 100%">
          <el-table-column prop="title" label="标题" min-width="180" />
          <el-table-column prop="documentNo" label="单据编号" width="140" />
          <el-table-column label="单据类型" width="120">
            <template #default="{ row }">
              {{ getDocumentTypeLabel(row.documentType) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="发起时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.startedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleViewDetail(row)">查看</el-button>
              <el-button
                v-if="row.status === 'pending'"
                type="danger"
                link
                size="small"
                @click="handleCancel(row)"
              >
                取消
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination">
          <el-pagination
            v-model:current-page="myRequestPage"
            v-model:page-size="myRequestLimit"
            :total="myRequestTotal"
            layout="total, prev, pager, next"
            @current-change="loadMyRequests"
          />
        </div>
      </div>

      <!-- 审批历史 -->
      <div v-if="activeTab === 'history'" class="history-list">
        <el-table :data="historyList" stripe border style="width: 100%">
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-tag :type="row.action === 'approve' ? 'success' : row.action === 'reject' ? 'danger' : 'info'" size="small">
                {{ getActionLabel(row.action) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="actorName" label="操作人" width="100" />
          <el-table-column prop="nodeName" label="节点" width="140" />
          <el-table-column prop="opinion" label="意见" min-width="150" show-overflow-tooltip />
          <el-table-column label="时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 审批对话框 -->
    <el-dialog v-model="approveDialogVisible" title="审批" width="500px">
      <el-form :model="approveForm" label-width="80px">
        <el-form-item label="审批意见">
          <el-input v-model="approveForm.opinion" type="textarea" :rows="3" placeholder="请输入审批意见（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleReject">驳回</el-button>
        <el-button type="success" @click="handleApproveConfirm">通过</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="单据详情" width="700px">
      <div v-if="currentItem" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="单据标题">{{ currentItem.instance?.title || currentItem.title }}</el-descriptions-item>
          <el-descriptions-item label="单据编号">{{ currentItem.instance?.documentNo || currentItem.documentNo }}</el-descriptions-item>
          <el-descriptions-item label="单据类型">{{ getDocumentTypeLabel(currentItem.instance?.documentType || currentItem.documentType) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentItem.instance?.status || currentItem.status)">
              {{ getStatusLabel(currentItem.instance?.status || currentItem.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发起人">{{ currentItem.instance?.startedBy || currentItem.startedBy }}</el-descriptions-item>
          <el-descriptions-item label="发起时间">{{ formatDate(currentItem.instance?.startedAt || currentItem.startedAt) }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">审批进度</el-divider>

        <el-timeline>
          <el-timeline-item
            v-for="(history, index) in historyList"
            :key="index"
            :type="history.action === 'approve' ? 'success' : history.action === 'reject' ? 'danger' : 'primary'"
            :timestamp="formatDate(history.createdAt)"
          >
            <p>
              <strong>{{ getActionLabel(history.action) }}</strong>
              {{ history.actorName }}
              <span v-if="history.nodeName">（节点：{{ history.nodeName }}）</span>
            </p>
            <p v-if="history.opinion">意见：{{ history.opinion }}</p>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getPendingApprovals,
  getMyRequests,
  getApprovalHistory,
  approveDocument,
  cancelWorkflow
} from '@/api/workflow'
import type { FormInstance } from 'element-plus'

const activeTab = ref('pending')
const pendingList = ref<any[]>([])
const myRequestList = ref<any[]>([])
const historyList = ref<any[]>([])
const pendingCount = ref(0)

const myRequestStatus = ref('')
const myRequestPage = ref(1)
const myRequestLimit = ref(20)
const myRequestTotal = ref(0)

const approveDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentItem = ref<any>(null)

const approveForm = reactive({
  opinion: ''
})

const documentTypeMap: Record<string, string> = {
  purchase_order: '采购订单',
  sales_order: '销售订单',
  purchase_inbound: '采购入库',
  sales_outbound: '销售出库',
  payment: '付款单',
  receipt: '收款单',
  expense: '费用报销',
  stock_adjustment: '库存调整'
}

function getDocumentTypeLabel(type: string) {
  return documentTypeMap[type] || type || '-'
}

function getStatusType(status: string) {
  switch (status) {
    case 'pending': return 'warning'
    case 'approved': return 'success'
    case 'rejected': return 'danger'
    case 'cancelled': return 'info'
    default: return 'info'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending': return '待审批'
    case 'approved': return '已通过'
    case 'rejected': return '已驳回'
    case 'cancelled': return '已取消'
    default: return status
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case 'submit': return '提交'
    case 'approve': return '通过'
    case 'reject': return '驳回'
    case 'cancel': return '取消'
    default: return action
  }
}

function formatDate(date: string | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

async function loadPendingApprovals() {
  try {
    const res: any = await getPendingApprovals()
    if (res.success) {
      pendingList.value = res.data || []
      pendingCount.value = pendingList.value.length
    }
  } catch (e) {
    console.error('加载待审批列表失败:', e)
  }
}

async function loadMyRequests() {
  try {
    const res: any = await getMyRequests({
      status: myRequestStatus.value,
      page: myRequestPage.value,
      limit: myRequestLimit.value
    })
    if (res.success) {
      myRequestList.value = res.data.items || []
      myRequestTotal.value = res.data.total || 0
    }
  } catch (e) {
    console.error('加载我的请求失败:', e)
  }
}

function handleTabChange() {
  if (activeTab.value === 'pending') {
    loadPendingApprovals()
  } else if (activeTab.value === 'my-requests') {
    loadMyRequests()
  }
}

function handleApprove(item: any) {
  currentItem.value = item
  approveForm.opinion = ''
  approveDialogVisible.value = true
}

async function handleApproveConfirm() {
  try {
    const res: any = await approveDocument(currentItem.value.instanceId, {
      action: 'approve',
      opinion: approveForm.opinion
    })
    if (res.success) {
      ElMessage.success('审批通过')
      approveDialogVisible.value = false
      loadPendingApprovals()
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '审批失败')
  }
}

async function handleReject() {
  try {
    await ElMessageBox.confirm('确定要驳回此单据吗？驳回后单据将被退回给发起人', '确认驳回', {
      type: 'warning'
    })
    const res: any = await approveDocument(currentItem.value.instanceId, {
      action: 'reject',
      opinion: approveForm.opinion
    })
    if (res.success) {
      ElMessage.success('已驳回')
      approveDialogVisible.value = false
      loadPendingApprovals()
    }
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '操作失败')
    }
  }
}

async function handleViewDetail(item: any) {
  currentItem.value = item
  detailDialogVisible.value = true
  try {
    const res: any = await getApprovalHistory(item.instanceId || item.instance?.id || item.id)
    if (res.success) {
      historyList.value = res.data || []
    }
  } catch (e) {
    console.error('加载审批历史失败:', e)
  }
}

async function handleCancel(item: any) {
  try {
    await ElMessageBox.confirm('确定要取消此单据的审批吗？', '确认取消', { type: 'warning' })
    const res: any = await cancelWorkflow(item.instanceId || item.id)
    if (res.success) {
      ElMessage.success('已取消')
      loadMyRequests()
    }
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '操作失败')
    }
  }
}

onMounted(() => {
  loadPendingApprovals()
})
</script>

<style scoped>
.approval-center {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-state {
  padding: 40px 0;
}

.approval-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.approval-card {
  cursor: pointer;
}

.card-content .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-content .card-header .title {
  font-weight: 600;
  font-size: 15px;
}

.card-info {
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  padding: 4px 0;
  font-size: 13px;
}

.info-item .label {
  color: #909399;
  width: 80px;
}

.info-item .value {
  color: #303133;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.filter-bar {
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.detail-content {
  max-height: 500px;
  overflow-y: auto;
}
</style>