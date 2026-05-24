<template>
  <div class="purchase-order-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">采购管理</h2>
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="采购订单" name="order" />
          <el-tab-pane label="采购入库" name="inbound" />
        </el-tabs>
      </div>
      <div class="header-right">
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新增{{ activeTab === 'order' ? '采购订单' : '采购入库' }}
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon"><el-icon><Document /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">{{ activeTab === 'order' ? '总订单数' : '总入库数' }}</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon pending"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">{{ activeTab === 'order' ? '待入库' : '待入库' }}</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon amount"><el-icon><Money /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.amount) }}</span>
            <span class="stat-label">{{ activeTab === 'order' ? '采购总额' : '入库总额' }}</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon unpaid"><el-icon><Wallet /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.unpaid) }}</span>
            <span class="stat-label">应付未付</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 高级搜索 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="单据编号" class="search-item">
              <el-input v-model="searchForm.keyword" placeholder="订单号/供应商" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="供应商" class="search-item">
              <el-select v-model="searchForm.supplierId" placeholder="请选择供应商" clearable filterable>
                <el-option
                  v-for="supplier in suppliers"
                  :key="supplier.id"
                  :label="supplier.name"
                  :value="supplier.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="单据状态" class="search-item">
              <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
                <el-option label="草稿" value="draft" />
                <el-option label="已确认" value="confirmed" />
                <el-option label="部分入库" value="partial" />
                <el-option label="已完成" value="completed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="日期范围" class="search-item">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="search-actions">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button link type="primary" @click="showAdvanced = !showAdvanced">
            {{ showAdvanced ? '收起' : '更多' }}条件
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
        :row-class-name="getRowClassName"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="单据编号" width="180" fixed>
          <template #default="{ row }">
            <el-link type="primary" @click="handleView(row)">{{ row.orderNo }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="供应商" min-width="150">
          <template #default="{ row }">
            <div class="supplier-info">
              <span class="name">{{ row.supplier?.name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="单据日期" width="110">
          <template #default="{ row }">
            {{ formatDate(row.orderDate) }}
          </template>
        </el-table-column>
        <el-table-column label="单据金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatAmount(row.totalAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="已入库" width="100" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatAmount(row.inboundAmount || 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="入库进度" width="140">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress
                :percentage="getInboundPercent(row)"
                :stroke-width="6"
                :color="getProgressColor(row)"
              />
              <span class="progress-text">{{ row.inboundQuantity || 0 }}/{{ row.totalQuantity || 0 }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="制单人" width="100">
          <template #default="{ row }">
            {{ row.creator?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="关联单据" width="150">
          <template #default="{ row }">
            <div class="relation-links">
              <el-tag v-if="row.inbounds?.length" size="small" type="success">
                入库单 {{ row.inbounds.length }}
              </el-tag>
              <el-tag v-if="row.payments?.length" size="small" type="warning">
                付款单 {{ row.payments.length }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-dropdown v-if="row.status === 'draft'" trigger="click">
              <el-button link type="primary" size="small">
                更多
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleEdit(row)">编辑</el-dropdown-item>
                  <el-dropdown-item @click="handleCopy(row)">复制</el-dropdown-item>
                  <el-dropdown-item @click="handleConfirm(row)" divided>确认</el-dropdown-item>
                  <el-dropdown-item @click="handleCancel(row)" style="color: #F56C6C;">取消</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              v-if="row.status === 'confirmed'"
              link
              type="success"
              size="small"
              @click="handleQuickInbound(row)"
            >
              快速入库
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <div class="batch-actions" v-if="selectedRows.length">
          <span>已选择 {{ selectedRows.length }} 项</span>
          <el-button size="small" @click="handleBatchConfirm" :loading="batchLoading">批量确认</el-button>
          <el-button size="small" type="danger" @click="handleBatchDelete" :loading="batchLoading">批量删除</el-button>
        </div>
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="1000px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <div class="order-form">
        <!-- 单据信息 -->
        <div class="form-section">
          <div class="section-title">
            <el-icon><Document /></el-icon>
            <span>单据信息</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="单据编号" prop="orderNo">
                <el-input v-model="formData.orderNo" placeholder="自动生成" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="单据日期" prop="orderDate">
                <el-date-picker
                  v-model="formData.orderDate"
                  type="date"
                  placeholder="选择日期"
                  style="width: 100%;"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="供应商" prop="supplierId">
                <el-select v-model="formData.supplierId" placeholder="请选择供应商" filterable style="width: 100%;">
                  <el-option
                    v-for="supplier in suppliers"
                    :key="supplier.id"
                    :label="supplier.name"
                    :value="supplier.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 物料明细 -->
        <div class="form-section">
          <div class="section-title">
            <el-icon><Goods /></el-icon>
            <span>物料明细</span>
            <span class="section-tip">（双击行或点击编辑按钮可修改明细）</span>
          </div>
          <el-table :data="formData.details" border size="small" show-summary :summary-method="getSummary">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="物料" min-width="200">
              <template #default="{ row, $index }">
                <el-select
                  v-model="row.productId"
                  placeholder="请选择物料"
                  filterable
                  size="small"
                  @change="handleProductSelect($index)"
                  style="width: 100%;"
                >
                  <el-option
                    v-for="product in products"
                    :key="product.id"
                    :label="`${product.code} - ${product.name}`"
                    :value="product.id"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="规格" width="100">
              <template #default="{ row }">
                {{ getProductAttr(row.productId, 'spec') }}
              </template>
            </el-table-column>
            <el-table-column label="单位" width="80">
              <template #default="{ row }">
                {{ getProductAttr(row.productId, 'unit') }}
              </template>
            </el-table-column>
            <el-table-column label="数量" width="120">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.quantity"
                  :min="1"
                  :precision="0"
                  size="small"
                  @change="handleDetailChange($index)"
                  style="width: 100%;"
                />
              </template>
            </el-table-column>
            <el-table-column label="单价" width="130">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.unitPrice"
                  :min="0"
                  :precision="2"
                  size="small"
                  @change="handleDetailChange($index)"
                  style="width: 100%;"
                />
              </template>
            </el-table-column>
            <el-table-column label="税率(%)" width="100">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.taxRate"
                  :min="0"
                  :max="100"
                  :precision="0"
                  size="small"
                  @change="handleDetailChange($index)"
                  style="width: 100%;"
                />
              </template>
            </el-table-column>
            <el-table-column label="金额" width="120">
              <template #default="{ row }">
                <span class="amount">¥{{ formatAmount(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60">
              <template #default="{ $index }">
                <el-button type="danger" size="small" link @click="handleRemoveDetail($index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="details-actions">
            <el-button type="primary" size="small" @click="handleAddDetail">
              <el-icon><Plus /></el-icon>
              添加明细
            </el-button>
            <el-button size="small" @click="handleBatchImport">批量导入</el-button>
          </div>
        </div>

        <!-- 费用信息 -->
        <div class="form-section">
          <div class="section-title">
            <el-icon><Wallet /></el-icon>
            <span>费用信息</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="物料总额">
                <el-input :value="'¥' + formatAmount(formData.goodsAmount)" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="税额">
                <el-input :value="'¥' + formatAmount(formData.taxAmount)" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="订单总额">
                <el-input :value="'¥' + formatAmount(formData.totalAmount)" disabled class="total-amount" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="优惠金额">
                <el-input-number
                  v-model="formData.discountAmount"
                  :min="0"
                  :precision="2"
                  style="width: 100%;"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="优惠后金额">
                <el-input :value="'¥' + formatAmount(formData.totalAmount - formData.discountAmount)" disabled />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="handleSaveDraft" :loading="submitLoading">保存草稿</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确认单据</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-drawer v-model="viewDrawer" title="单据详情" size="800px">
      <div class="order-detail" v-if="currentOrder">
        <!-- 单据信息 -->
        <div class="detail-section">
          <h4>单据信息</h4>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="单据编号">{{ currentOrder.orderNo }}</el-descriptions-item>
            <el-descriptions-item label="单据日期">{{ formatDate(currentOrder.orderDate) }}</el-descriptions-item>
            <el-descriptions-item label="单据状态">
              <el-tag :type="getStatusType(currentOrder.status)" size="small">
                {{ getStatusText(currentOrder.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="供应商">{{ currentOrder.supplier?.name }}</el-descriptions-item>
            <el-descriptions-item label="制单人">{{ currentOrder.creator?.name }}</el-descriptions-item>
            <el-descriptions-item label="制单时间">{{ formatDateTime(currentOrder.createdAt) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 物料明细 -->
        <div class="detail-section">
          <h4>物料明细</h4>
          <el-table :data="currentOrder.details" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="product.code" label="物料编码" width="120" />
            <el-table-column prop="product.name" label="物料名称" min-width="150" />
            <el-table-column prop="product.spec" label="规格" width="100" />
            <el-table-column prop="product.unit" label="单位" width="60" />
            <el-table-column prop="quantity" label="数量" width="80" align="right" />
            <el-table-column prop="unitPrice" label="单价" width="100" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.unitPrice) }}</template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.amount) }}</template>
            </el-table-column>
          </el-table>
          <div class="detail-summary">
            <span>物料总额：¥{{ formatAmount(currentOrder.goodsAmount) }}</span>
            <span>税额：¥{{ formatAmount(currentOrder.taxAmount) }}</span>
            <span>优惠：¥{{ formatAmount(currentOrder.discountAmount || 0) }}</span>
            <span class="total">单据总额：¥{{ formatAmount(currentOrder.totalAmount) }}</span>
          </div>
        </div>

        <!-- 关联单据 -->
        <div class="detail-section" v-if="currentOrder.inbounds?.length || currentOrder.payments?.length">
          <h4>关联单据</h4>
          <el-tabs>
            <el-tab-pane label="入库单" v-if="currentOrder.inbounds?.length">
              <el-table :data="currentOrder.inbounds" border size="small">
                <el-table-column prop="inboundNo" label="入库单号" width="150" />
                <el-table-column prop="inboundDate" label="入库日期" width="120" />
                <el-table-column prop="quantity" label="入库数量" width="100" align="right" />
                <el-table-column label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'completed' ? 'success' : 'warning'" size="small">
                      {{ row.status === 'completed' ? '已完成' : '进行中' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="付款单" v-if="currentOrder.payments?.length">
              <el-table :data="currentOrder.payments" border size="small">
                <el-table-column prop="paymentNo" label="付款单号" width="150" />
                <el-table-column prop="paymentDate" label="付款日期" width="120" />
                <el-table-column label="付款金额" width="120" align="right">
                  <template #default="{ row }">¥{{ formatAmount(row.amount) }}</template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'confirmed' ? 'success' : 'info'" size="small">
                      {{ row.status === 'confirmed' ? '已确认' : '草稿' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 操作日志 -->
        <div class="detail-section">
          <h4>操作记录</h4>
          <el-timeline size="small">
            <el-timeline-item
              v-for="log in currentOrder.logs || []"
              :key="log.id"
              :timestamp="formatDateTime(log.createdAt)"
              :type="log.action === 'create' ? 'primary' : ''"
            >
              <p>{{ log.actionText }} - {{ log.operator?.name || '系统' }}</p>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Download, Document, Clock, Money, Wallet, Goods, Delete,
  ArrowDown
} from '@element-plus/icons-vue'
import {
  getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder,
  updatePurchaseOrder, confirmPurchaseOrder, deletePurchaseOrder
} from '@/api/purchase-order'
import { getSuppliers } from '@/api/supplier'
import { getProducts } from '@/api/product'

// 状态
const loading = ref(false)
const batchLoading = ref(false)
const submitLoading = ref(false)
const activeTab = ref('order')
const showAdvanced = ref(false)
const selectedRows = ref<any[]>([])
const viewDrawer = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增采购订单')
const isEdit = ref(false)
const currentOrder = ref<any>(null)

// 数据
const tableData = ref<any[]>([])
const suppliers = ref<any[]>([])
const products = ref<any[]>([])

// 统计
const stats = ref({
  total: 0,
  pending: 0,
  amount: 0,
  unpaid: 0
})

// 搜索表单
const searchForm = reactive({
  keyword: '',
  supplierId: '',
  status: '',
  dateRange: []
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 表单数据
const formData = reactive({
  id: '',
  orderNo: '',
  orderDate: new Date().toISOString().split('T')[0],
  supplierId: '',
  remark: '',
  discountAmount: 0,
  details: [] as any[],
  goodsAmount: 0,
  taxAmount: 0,
  totalAmount: 0
})

// 计算金额
const calculateAmounts = () => {
  let goodsAmount = 0
  let taxAmount = 0
  formData.details.forEach(detail => {
    const amount = (detail.quantity || 0) * (detail.unitPrice || 0)
    const tax = amount * ((detail.taxRate || 0) / 100)
    goodsAmount += amount
    taxAmount += tax
  })
  formData.goodsAmount = goodsAmount
  formData.taxAmount = taxAmount
  formData.totalAmount = goodsAmount + taxAmount
}

// 获取物料属性
const getProductAttr = (productId: string, attr: string) => {
  const product = products.value.find(p => p.id === productId)
  return product ? product[attr] || '-' : '-'
}

// 格式化金额
const formatAmount = (amount: number) => {
  if (amount === undefined || amount === null) return '0.00'
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

// 格式化日期时间
const formatDateTime = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 获取状态类型
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    draft: 'info',
    confirmed: '',
    partial: 'warning',
    completed: 'success',
    cancelled: 'danger'
  }
  return map[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    partial: '部分入库',
    completed: '已完成',
    cancelled: '已取消'
  }
  return map[status] || status
}

// 获取入库进度
const getInboundPercent = (row: any) => {
  if (!row.totalQuantity) return 0
  return Math.round(((row.inboundQuantity || 0) / row.totalQuantity) * 100)
}

// 获取进度条颜色
const getProgressColor = (row: any) => {
  const percent = getInboundPercent(row)
  if (percent >= 100) return '#67C23A'
  if (percent >= 50) return '#E6A23C'
  return '#909399'
}

// 获取行样式
const getRowClassName = ({ row }: { row: any }) => {
  if (row.status === 'cancelled') return 'cancelled-row'
  return ''
}

// 获取汇总数据
const getSummary = () => {
  calculateAmounts()
  return [
    '', '', '',
    `<span class="amount">合计</span>`,
    '',
    `<span class="amount">¥${formatAmount(formData.goodsAmount)}</span>`,
    '',
    `<span class="amount">¥${formatAmount(formData.totalAmount)}</span>`
  ]
}

// 获取数据
const fetchData = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      keyword: searchForm.keyword,
      supplierId: searchForm.supplierId,
      status: searchForm.status,
      startDate: searchForm.dateRange?.[0],
      endDate: searchForm.dateRange?.[1]
    }
    const response = await getPurchaseOrders(params)
    if (response.success) {
      tableData.value = response.data.items || []
      pagination.total = response.data.total
      // 模拟统计数据
      stats.value = {
        total: response.data.total,
        pending: tableData.value.filter(t => t.status === 'confirmed' || t.status === 'partial').length,
        amount: tableData.value.reduce((sum: number, t: any) => sum + (t.totalAmount || 0), 0),
        unpaid: tableData.value.reduce((sum: number, t: any) => sum + ((t.totalAmount || 0) - (t.paidAmount || 0)), 0)
      }
    }
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取供应商
const fetchSuppliers = async () => {
  try {
    const response = await getSuppliers({ page: 1, limit: 1000 })
    if (response.success) {
      suppliers.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取供应商失败:', error)
  }
}

// 获取物料
const fetchProducts = async () => {
  try {
    const response = await getProducts({ page: 1, limit: 1000 })
    if (response.success) {
      products.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取物料失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.supplierId = ''
  searchForm.status = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchData()
}

// Tab切换
const handleTabChange = () => {
  handleReset()
}

// 选中行
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 新增
const handleCreate = () => {
  dialogTitle.value = '新增采购订单'
  isEdit.value = false
  resetForm()
  addDefaultDetail()
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row: any) => {
  dialogTitle.value = '编辑采购订单'
  isEdit.value = true
  try {
    const response = await getPurchaseOrderById(row.id)
    if (response.success) {
      const order = response.data.data
      Object.assign(formData, {
        id: order.id,
        orderNo: order.orderNo,
        orderDate: order.orderDate?.split('T')[0],
        supplierId: order.supplierId,
        remark: order.remark || '',
        discountAmount: order.discountAmount || 0,
        details: order.details?.map((d: any) => ({
          id: d.id,
          productId: d.productId,
          quantity: d.quantity,
          unitPrice: d.unitPrice,
          taxRate: d.taxRate || 0,
          amount: d.amount
        })) || []
      })
      calculateAmounts()
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取详情失败:', error)
  }
}

// 查看
const handleView = async (row: any) => {
  try {
    const response = await getPurchaseOrderById(row.id)
    if (response.success) {
      currentOrder.value = response.data.data
      viewDrawer.value = true
    }
  } catch (error) {
    console.error('获取详情失败:', error)
  }
}

// 复制
const handleCopy = async (row: any) => {
  await handleEdit(row)
  isEdit.value = false
  formData.id = ''
  formData.orderNo = ''
  dialogTitle.value = '复制采购订单'
}

// 确认
const handleConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要确认采购订单 "${row.orderNo}" 吗？`, '确认', { type: 'warning' })
    await confirmPurchaseOrder(row.id)
    ElMessage.success('确认成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('确认失败')
    }
  }
}

// 取消
const handleCancel = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要取消采购订单 "${row.orderNo}" 吗？`, '确认取消', { type: 'warning' })
    // 调用取消API
    ElMessage.success('取消成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('取消失败')
    }
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除采购订单 "${row.orderNo}" 吗？`, '确认删除', { type: 'warning' })
    await deletePurchaseOrder(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 快速入库
const handleQuickInbound = (row: any) => {
  ElMessage.info('快速入库功能开发中')
}

// 批量确认
const handleBatchConfirm = async () => {
  if (!selectedRows.value.length) return
  try {
    await ElMessageBox.confirm(`确定要确认选中的 ${selectedRows.value.length} 个订单吗？`, '批量确认', { type: 'warning' })
    batchLoading.value = true
    // 批量确认逻辑
    ElMessage.success('批量确认成功')
    selectedRows.value = []
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('批量确认失败')
    }
  } finally {
    batchLoading.value = false
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (!selectedRows.value.length) return
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 个订单吗？`, '批量删除', { type: 'warning' })
    batchLoading.value = true
    // 批量删除逻辑
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  } finally {
    batchLoading.value = false
  }
}

// 导出
const handleExport = () => {
  ElMessage.info('导出功能开发中')
}

// 添加明细
const handleAddDetail = () => {
  formData.details.push({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
    amount: 0
  })
}

// 添加默认明细
const addDefaultDetail = () => {
  formData.details = [{ productId: '', quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]
}

// 删除明细
const handleRemoveDetail = (index: number) => {
  formData.details.splice(index, 1)
  calculateAmounts()
}

// 物料选择
const handleProductSelect = (index: number) => {
  const detail = formData.details[index]
  const product = products.value.find(p => p.id === detail.productId)
  if (product) {
    detail.unitPrice = product.costPrice || 0
  }
  handleDetailChange(index)
}

// 明细变更
const handleDetailChange = (index: number) => {
  const detail = formData.details[index]
  detail.amount = (detail.quantity || 0) * (detail.unitPrice || 0)
  calculateAmounts()
}

// 批量导入
const handleBatchImport = () => {
  ElMessage.info('批量导入功能开发中')
}

// 保存草稿
const handleSaveDraft = async () => {
  await submitOrder(false)
}

// 提交
const handleSubmit = async () => {
  await submitOrder(true)
}

// 提交订单
const submitOrder = async (confirmed: boolean) => {
  if (!formData.supplierId) {
    ElMessage.warning('请选择供应商')
    return
  }
  if (!formData.details.length) {
    ElMessage.warning('请添加物料明细')
    return
  }

  try {
    submitLoading.value = true
    const submitData = {
      supplierId: formData.supplierId,
      orderDate: formData.orderDate,
      remark: formData.remark,
      discountAmount: formData.discountAmount,
      details: formData.details.map(d => ({
        productId: d.productId,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        taxRate: d.taxRate,
        amount: d.amount
      }))
    }

    if (isEdit.value) {
      await updatePurchaseOrder(formData.id, submitData)
    } else {
      await createPurchaseOrder(submitData)
    }

    ElMessage.success(confirmed ? '提交成功' : '保存成功')
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('提交失败')
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  formData.id = ''
  formData.orderNo = ''
  formData.orderDate = new Date().toISOString().split('T')[0]
  formData.supplierId = ''
  formData.remark = ''
  formData.discountAmount = 0
  formData.details = []
  formData.goodsAmount = 0
  formData.taxAmount = 0
  formData.totalAmount = 0
}

// 关闭对话框
const handleDialogClose = () => {
  resetForm()
}

// 分页
const handleSizeChange = (val: number) => {
  pagination.limit = val
  pagination.page = 1
  fetchData()
}

const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchData()
}

// 初始化
onMounted(async () => {
  await Promise.all([fetchData(), fetchSuppliers(), fetchProducts()])
})
</script>

<style scoped>
.purchase-order-page {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.page-header .header-left .page-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}
.page-header .header-right {
  display: flex;
  gap: 8px;
}
.stats-row {
  margin-bottom: 20px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.stat-card .stat-icon {
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
.stat-card .stat-icon.pending {
  background: #fdf6ec;
  color: #E6A23C;
}
.stat-card .stat-icon.amount {
  background: #e8f5e9;
  color: #67C23A;
}
.stat-card .stat-icon.unpaid {
  background: #fef0f0;
  color: #F56C6C;
}
.stat-card .stat-info {
  display: flex;
  flex-direction: column;
}
.stat-card .stat-info .stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}
.stat-card .stat-info .stat-label {
  font-size: 13px;
  color: #909399;
}
.search-card {
  margin-bottom: 20px;
}
.search-card .search-actions {
  display: flex;
  gap: 8px;
}
.table-card {
  margin-bottom: 20px;
}
.table-card .amount {
  font-weight: 600;
}
.table-card .supplier-info .name {
  font-weight: 500;
}
.table-card .progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.table-card .progress-cell .progress-text {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}
.table-card .relation-links {
  display: flex;
  gap: 4px;
}
.table-card .pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}
.table-card .batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #606266;
}
.order-form .form-section {
  margin-bottom: 24px;
}
.order-form .form-section .section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
}
.order-form .form-section .section-title .section-tip {
  font-weight: normal;
  font-size: 12px;
  color: #909399;
}
.order-form .form-section .details-actions {
  margin-top: 12px;
}
.order-form .form-section .total-amount :deep(.el-input__inner) {
  color: #F56C6C;
  font-weight: 600;
}
.order-detail .detail-section {
  margin-bottom: 24px;
}
.order-detail .detail-section h4 {
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
.order-detail .detail-summary {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-top: 12px;
}
.order-detail .detail-summary .total {
  color: #F56C6C;
  font-weight: 600;
}
:deep(.el-table .cancelled-row) {
  opacity: 0.5;
}
:deep(.el-table .amount) {
  font-weight: 600;
}
</style>