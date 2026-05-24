<template>
  <div class="finance-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">财务管理</h2>
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="收款单" name="receipt" />
          <el-tab-pane label="付款单" name="payment" />
          <el-tab-pane label="账户管理" name="account" />
          <el-tab-pane label="应收账款" name="receivable" />
          <el-tab-pane label="应付账款" name="payable" />
        </el-tabs>
      </div>
      <div class="header-right">
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新增{{ activeTab === 'receipt' ? '收款单' : activeTab === 'payment' ? '付款单' : '账户' }}
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon income"><el-icon><Money /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.totalReceipt) }}</span>
            <span class="stat-label">收款总额</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon expense"><el-icon><Wallet /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.totalPayment) }}</span>
            <span class="stat-label">付款总额</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon receivable"><el-icon><TrendCharts /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.receivable) }}</span>
            <span class="stat-label">应收账款</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon payable"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.payable) }}</span>
            <span class="stat-label">应付账款</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="单据编号" class="search-item">
              <el-input v-model="searchForm.keyword" placeholder="单据编号" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="客户/供应商" class="search-item">
              <el-select
                v-model="searchForm.partnerId"
                placeholder="请选择"
                clearable
                filterable
                style="width: 100%;"
              >
                <el-option
                  v-for="partner in partners"
                  :key="partner.id"
                  :label="partner.name"
                  :value="partner.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="单据状态" class="search-item">
              <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
                <el-option label="草稿" value="draft" />
                <el-option label="已确认" value="confirmed" />
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
        </div>
      </el-form>
    </el-card>

    <!-- 收款/付款表格 -->
    <el-card v-if="activeTab !== 'account'" class="table-card" shadow="never">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="单据编号" width="180" fixed>
          <template #default="{ row }">
            <el-link type="primary" @click="handleView(row)">{{ row.billNo }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="客户/供应商" min-width="150">
          <template #default="{ row }">
            <div class="partner-info">
              <span class="name">{{ row.partner?.name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="单据日期" width="110">
          <template #default="{ row }">
            {{ formatDate(row.billDate) }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="130" align="right">
          <template #default="{ row }">
            <span :class="['amount', activeTab === 'receipt' ? 'income' : 'expense']">
              {{ activeTab === 'receipt' ? '+' : '-' }}¥{{ formatAmount(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="账户" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.account?.name || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关联单据" width="150">
          <template #default="{ row }">
            <el-tag v-if="row.orderNo" size="small" type="info">{{ row.orderNo }}</el-tag>
            <span v-else>-</span>
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
                  <el-dropdown-item @click="handleConfirm(row)" divided>确认</el-dropdown-item>
                  <el-dropdown-item @click="handleCancel(row)" style="color: #F56C6C;">取消</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button link type="success" size="small" @click="handlePrint(row)">打印</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <div class="batch-actions" v-if="selectedRows.length && activeTab !== 'account'">
          <span>已选择 {{ selectedRows.length }} 项</span>
          <el-button size="small" @click="handleBatchConfirm" :loading="batchLoading">批量确认</el-button>
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

    <!-- 账户管理表格 -->
    <el-card v-if="activeTab === 'account'" class="table-card" shadow="never">
      <el-table :data="accountData" v-loading="loading" stripe>
        <el-table-column label="账户名称" min-width="150">
          <template #default="{ row }">
            <div class="account-info">
              <el-icon class="account-icon" :style="{ color: row.color }"><Wallet /></el-icon>
              <span class="name">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="accountNo" label="账户账号" width="180" />
        <el-table-column label="账户类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getAccountTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="期初余额" width="130" align="right">
          <template #default="{ row }">
            ¥{{ formatAmount(row.initialBalance) }}
          </template>
        </el-table-column>
        <el-table-column label="当前余额" width="130" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatAmount(row.balance) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="期初余额" width="130" align="right">
          <template #default="{ row }">
            <span :class="getChangeClass(row.receipt - row.payment)">
              {{ formatAmount(row.receipt - row.payment) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEditAccount(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="handleAccountRecord(row)">记录</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 应收/应付表格 -->
    <el-card v-if="activeTab === 'receivable' || activeTab === 'payable'" class="table-card" shadow="never">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column label="单据编号" width="180">
          <template #default="{ row }">
            <el-link type="primary">{{ row.orderNo }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="客户/供应商" min-width="150">
          <template #default="{ row }">
            {{ row.partner?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="单据日期" width="110">
          <template #default="{ row }">
            {{ formatDate(row.orderDate) }}
          </template>
        </el-table-column>
        <el-table-column label="单据金额" width="130" align="right">
          <template #default="{ row }">
            ¥{{ formatAmount(row.totalAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="已收/付" width="130" align="right">
          <template #default="{ row }">
            ¥{{ formatAmount(row.paidAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="未收/付" width="130" align="right">
          <template #default="{ row }">
            <span :class="['amount', activeTab === 'receivable' ? 'income' : 'expense']">
              ¥{{ formatAmount(row.totalAmount - row.paidAmount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="账龄" width="100">
          <template #default="{ row }">
            <span :class="getAgeClass(row.overdueDays)">
              {{ row.overdueDays || 0 }}天
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getReceivableStatusType(row)" size="small">
              {{ getReceivableStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="success" size="small" @click="handleCreateBill(row)">
              {{ activeTab === 'receivable' ? '收款' : '付款' }}
            </el-button>
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="单据编号" prop="billNo">
              <el-input v-model="formData.billNo" placeholder="自动生成" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单据日期" prop="billDate">
              <el-date-picker
                v-model="formData.billDate"
                type="date"
                placeholder="选择日期"
                style="width: 100%;"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item :label="activeTab === 'receipt' ? '客户' : '供应商'" prop="partnerId">
              <el-select v-model="formData.partnerId" placeholder="请选择" filterable style="width: 100%;">
                <el-option
                  v-for="partner in partners"
                  :key="partner.id"
                  :label="partner.name"
                  :value="partner.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="账户" prop="accountId">
              <el-select v-model="formData.accountId" placeholder="请选择账户" filterable style="width: 100%;">
                <el-option
                  v-for="account in accounts"
                  :key="account.id"
                  :label="`${account.name} (余额: ¥${formatAmount(account.balance)})`"
                  :value="account.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="金额" prop="amount">
              <el-input-number
                v-model="formData.amount"
                :min="0"
                :precision="2"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联单据">
              <el-select v-model="formData.orderId" placeholder="请选择（可选）" clearable filterable style="width: 100%;">
                <el-option
                  v-for="order in orders"
                  :key="order.id"
                  :label="`${order.orderNo} - ¥${formatAmount(order.unpaidAmount)}`"
                  :value="order.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="收款方式">
              <el-select v-model="formData.paymentMethod" placeholder="请选择" style="width: 100%;">
                <el-option label="现金" value="cash" />
                <el-option label="银行转账" value="bank" />
                <el-option label="微信" value="wechat" />
                <el-option label="支付宝" value="alipay" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注信息" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="handleSaveDraft" :loading="submitLoading">保存草稿</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确认{{ activeTab === 'receipt' ? '收款' : '付款' }}</el-button>
      </template>
    </el-dialog>

    <!-- 账户编辑对话框 -->
    <el-dialog v-model="accountDialogVisible" title="编辑账户" width="500px">
      <el-form :model="accountForm" label-width="100px">
        <el-form-item label="账户名称">
          <el-input v-model="accountForm.name" placeholder="请输入账户名称" />
        </el-form-item>
        <el-form-item label="账户账号">
          <el-input v-model="accountForm.accountNo" placeholder="请输入账户账号" />
        </el-form-item>
        <el-form-item label="账户类型">
          <el-select v-model="accountForm.type" placeholder="请选择" style="width: 100%;">
            <el-option label="现金账户" value="cash" />
            <el-option label="银行账户" value="bank" />
            <el-option label="微信账户" value="wechat" />
            <el-option label="支付宝账户" value="alipay" />
          </el-select>
        </el-form-item>
        <el-form-item label="期初余额">
          <el-input-number v-model="accountForm.initialBalance" :precision="2" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="accountForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="accountDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveAccount">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="viewDrawer" title="单据详情" size="600px">
      <div class="bill-detail" v-if="currentBill">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="单据编号">{{ currentBill.billNo }}</el-descriptions-item>
          <el-descriptions-item label="单据状态">
            <el-tag :type="getStatusType(currentBill.status)" size="small">
              {{ getStatusText(currentBill.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="单据日期">{{ formatDate(currentBill.billDate) }}</el-descriptions-item>
          <el-descriptions-item label="账户">{{ currentBill.account?.name }}</el-descriptions-item>
          <el-descriptions-item label="客户/供应商">{{ currentBill.partner?.name }}</el-descriptions-item>
          <el-descriptions-item label="金额">
            <span class="amount">¥{{ formatAmount(currentBill.amount) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="收款方式">{{ getPaymentMethodText(currentBill.paymentMethod) }}</el-descriptions-item>
          <el-descriptions-item label="制单人">{{ currentBill.creator?.name }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="currentBill.remark" class="remark-section">
          <h4>备注</h4>
          <p>{{ currentBill.remark }}</p>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Download, Money, Wallet, TrendCharts, Clock, ArrowDown
} from '@element-plus/icons-vue'
import { paymentReceiptApi } from '@/api'
import { getAccounts, updateAccount } from '@/api/account'
import { getCustomers } from '@/api/customer'
import { getSuppliers } from '@/api/supplier'

// 状态
const loading = ref(false)
const batchLoading = ref(false)
const submitLoading = ref(false)
const activeTab = ref('receipt')
const selectedRows = ref<any[]>([])
const dialogVisible = ref(false)
const accountDialogVisible = ref(false)
const viewDrawer = ref(false)
const dialogTitle = ref('新增收款单')
const isEdit = ref(false)
const currentBill = ref<any>(null)

// 数据
const tableData = ref<any[]>([])
const accountData = ref<any[]>([])
const partners = ref<any[]>([])
const accounts = ref<any[]>([])
const orders = ref<any[]>([])

// 统计
const stats = ref({
  totalReceipt: 0,
  totalPayment: 0,
  receivable: 0,
  payable: 0
})

// 搜索表单
const searchForm = reactive({
  keyword: '',
  partnerId: '',
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
  billNo: '',
  billDate: new Date().toISOString().split('T')[0],
  partnerId: '',
  accountId: '',
  amount: 0,
  orderId: '',
  paymentMethod: 'bank',
  remark: ''
})

// 账户表单
const accountForm = reactive({
  id: '',
  name: '',
  accountNo: '',
  type: 'bank',
  initialBalance: 0,
  remark: ''
})

// 表单验证
const formRules = {
  partnerId: [{ required: true, message: '请选择客户/供应商', trigger: 'change' }],
  accountId: [{ required: true, message: '请选择账户', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
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

// 获取状态类型
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    draft: 'info',
    confirmed: 'success',
    cancelled: 'danger'
  }
  return map[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    cancelled: '已取消'
  }
  return map[status] || status
}

// 获取账户类型文本
const getAccountTypeText = (type: string) => {
  const map: Record<string, string> = {
    cash: '现金账户',
    bank: '银行账户',
    wechat: '微信账户',
    alipay: '支付宝账户'
  }
  return map[type] || type
}

// 获取收款方式文本
const getPaymentMethodText = (method: string) => {
  const map: Record<string, string> = {
    cash: '现金',
    bank: '银行转账',
    wechat: '微信',
    alipay: '支付宝',
    other: '其他'
  }
  return map[method] || method
}

// 获取余额变化样式
const getChangeClass = (change: number) => {
  if (change > 0) return 'change-positive'
  if (change < 0) return 'change-negative'
  return ''
}

// 获取账龄样式
const getAgeClass = (days: number) => {
  if (days > 90) return 'age-danger'
  if (days > 30) return 'age-warning'
  return ''
}

// 获取应收/应付状态类型
const getReceivableStatusType = (row: any) => {
  const unpaid = row.totalAmount - row.paidAmount
  if (unpaid <= 0) return 'success'
  if (row.overdueDays > 30) return 'danger'
  if (row.overdueDays > 0) return 'warning'
  return 'info'
}

// 获取应收/应付状态文本
const getReceivableStatusText = (row: any) => {
  const unpaid = row.totalAmount - row.paidAmount
  if (unpaid <= 0) return '已结清'
  if (row.overdueDays > 30) return '严重逾期'
  if (row.overdueDays > 0) return '逾期'
  return '正常'
}

// 获取数据
const fetchData = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      keyword: searchForm.keyword,
      partnerId: searchForm.partnerId,
      status: searchForm.status,
      startDate: searchForm.dateRange?.[0],
      endDate: searchForm.dateRange?.[1],
      type: activeTab.value
    }
    const response = await paymentReceiptApi.getPaymentReceipts(params)
    if (response.success) {
      tableData.value = response.data.items || []
      pagination.total = response.data.total
      // 更新统计
      stats.value = {
        totalReceipt: response.data.totalReceipt || 0,
        totalPayment: response.data.totalPayment || 0,
        receivable: response.data.receivable || 0,
        payable: response.data.payable || 0
      }
    }
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取账户数据
const fetchAccounts = async () => {
  try {
    const response = await getAccounts({ page: 1, limit: 1000 })
    if (response.success) {
      accountData.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取账户失败:', error)
  }
}

// 获取合作伙伴（客户/供应商）
const fetchPartners = async () => {
  try {
    const [customerRes, supplierRes] = await Promise.all([
      getCustomers({ page: 1, limit: 1000 }),
      getSuppliers({ page: 1, limit: 1000 })
    ])
    partners.value = [
      ...(customerRes.data?.items || []),
      ...(supplierRes.data?.items || [])
    ]
  } catch (error) {
    console.error('获取合作伙伴失败:', error)
  }
}

// 获取账户列表
const fetchAccountList = async () => {
  try {
    const response = await getAccounts({ page: 1, limit: 1000 })
    if (response.success) {
      accounts.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取账户列表失败:', error)
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
  searchForm.partnerId = ''
  searchForm.status = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchData()
}

// Tab切换
const handleTabChange = () => {
  pagination.page = 1
  if (activeTab.value === 'account') {
    fetchAccounts()
  } else {
    fetchData()
  }
}

// 选中行
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 新增
const handleCreate = () => {
  if (activeTab.value === 'account') {
    dialogTitle.value = '新增账户'
    isEdit.value = false
    Object.assign(accountForm, { id: '', name: '', accountNo: '', type: 'bank', initialBalance: 0, remark: '' })
    accountDialogVisible.value = true
  } else {
    dialogTitle.value = activeTab.value === 'receipt' ? '新增收款单' : '新增付款单'
    isEdit.value = false
    resetForm()
    dialogVisible.value = true
  }
}

// 编辑账户
const handleEditAccount = (row: any) => {
  isEdit.value = true
  Object.assign(accountForm, row)
  accountDialogVisible.value = true
}

// 编辑
const handleEdit = async (row: any) => {
  dialogTitle.value = activeTab.value === 'receipt' ? '编辑收款单' : '编辑付款单'
  isEdit.value = true
  try {
    const response = await paymentReceiptApi.getPaymentReceiptById(row.id)
    if (response.success) {
      const bill = response.data.data
      Object.assign(formData, {
        id: bill.id,
        billNo: bill.billNo,
        billDate: bill.billDate?.split('T')[0],
        partnerId: bill.partnerId,
        accountId: bill.accountId,
        amount: bill.amount,
        orderId: bill.orderId || '',
        paymentMethod: bill.paymentMethod || 'bank',
        remark: bill.remark || ''
      })
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取详情失败:', error)
  }
}

// 查看
const handleView = async (row: any) => {
  try {
    const response = await paymentReceiptApi.getPaymentReceiptById(row.id)
    if (response.success) {
      currentBill.value = response.data.data
      viewDrawer.value = true
    }
  } catch (error) {
    console.error('获取详情失败:', error)
  }
}

// 确认
const handleConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要确认此单据吗？`, '确认', { type: 'warning' })
    await paymentReceiptApi.confirmPaymentReceipt(row.id)
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
    await ElMessageBox.confirm(`确定要取消此单据吗？`, '确认取消', { type: 'warning' })
    ElMessage.success('取消成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('取消失败')
    }
  }
}

// 批量确认
const handleBatchConfirm = async () => {
  if (!selectedRows.value.length) return
  try {
    await ElMessageBox.confirm(`确定要确认选中的 ${selectedRows.value.length} 个单据吗？`, '批量确认', { type: 'warning' })
    batchLoading.value = true
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

// 保存账户
const handleSaveAccount = async () => {
  try {
    await updateAccount(accountForm.id, accountForm)
    ElMessage.success('保存成功')
    accountDialogVisible.value = false
    fetchAccounts()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 账户记录
const handleAccountRecord = (row: any) => {
  ElMessage.info('账户记录功能开发中')
}

// 创建收/付款单
const handleCreateBill = (row: any) => {
  formData.orderId = row.id
  formData.partnerId = row.partnerId
  formData.amount = row.totalAmount - row.paidAmount
  dialogVisible.value = true
}

// 打印
const handlePrint = (row: any) => {
  ElMessage.info('打印功能开发中')
}

// 导出
const handleExport = () => {
  ElMessage.info('导出功能开发中')
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
  try {
    submitLoading.value = true
    const submitData = {
      type: activeTab.value === 'receipt' ? 'receipt' : 'payment',
      partnerId: formData.partnerId,
      accountId: formData.accountId,
      billDate: formData.billDate,
      amount: formData.amount,
      orderId: formData.orderId || undefined,
      paymentMethod: formData.paymentMethod,
      remark: formData.remark
    }

    if (isEdit.value) {
      await paymentReceiptApi.updatePaymentReceipt(formData.id, submitData)
    } else {
      await paymentReceiptApi.createPaymentReceipt(submitData)
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
  formData.billNo = ''
  formData.billDate = new Date().toISOString().split('T')[0]
  formData.partnerId = ''
  formData.accountId = ''
  formData.amount = 0
  formData.orderId = ''
  formData.paymentMethod = 'bank'
  formData.remark = ''
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
  await Promise.all([fetchData(), fetchPartners(), fetchAccountList()])
})
</script>

<style scoped>
.finance-page {
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
.stat-card .stat-icon.income {
  background: #e8f5e9;
  color: #67C23A;
}
.stat-card .stat-icon.expense {
  background: #fef0f0;
  color: #F56C6C;
}
.stat-card .stat-icon.receivable {
  background: #fdf6ec;
  color: #E6A23C;
}
.stat-card .stat-icon.payable {
  background: #ecf5ff;
  color: #409EFF;
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
.table-card .amount.income {
  color: #67C23A;
}
.table-card .amount.expense {
  color: #F56C6C;
}
.table-card .partner-info .name,
.table-card .account-info .name {
  font-weight: 500;
}
.table-card .account-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.table-card .account-info .account-icon {
  font-size: 20px;
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
.change-positive {
  color: #67C23A;
}
.change-negative {
  color: #F56C6C;
}
.age-warning {
  color: #E6A23C;
}
.age-danger {
  color: #F56C6C;
}
.bill-detail .remark-section {
  margin-top: 20px;
}
.bill-detail .remark-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
}
.bill-detail .remark-section p {
  margin: 0;
  color: #606266;
}
</style>