<template>
  <div class="sales-outbound-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">销售出库</h2>
      </div>
      <div class="header-right">
        <el-button @click="handleImport">
          <el-icon><Download /></el-icon>
          导入
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button @click="handleHelp">
          <el-icon><QuestionFilled /></el-icon>
          帮助
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新增出库单
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
            <span class="stat-label">总出库数</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon pending"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">待确认</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon amount"><el-icon><Money /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.amount) }}</span>
            <span class="stat-label">出库总额</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon unpaid"><el-icon><Wallet /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.unpaid) }}</span>
            <span class="stat-label">应收未收</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 高级搜索 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="出库单号" class="search-item">
              <el-input v-model="searchForm.orderNo" placeholder="出库单号" clearable style="width: 100%;" @keyup.enter="handleSearch" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="客户" class="search-item">
              <el-select v-model="searchForm.customerId" placeholder="请选择客户" clearable filterable remote reserve-keyword :remote-method="searchCustomers" style="width: 100%;" @change="handleSearch">
                <el-option
                  v-for="customer in customers"
                  :key="customer.id"
                  :label="customer.name"
                  :value="customer.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="4">
            <el-form-item label="单据状态" class="search-item">
              <el-select v-model="searchForm.status" placeholder="状态" clearable style="width: 100%;" @change="handleSearch">
                <el-option label="草稿" value="draft" />
                <el-option label="已审核" value="confirmed" />
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

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
      >
        <el-table-column prop="outboundNo" label="出库单号" width="180" fixed>
          <template #default="{ row }">
            <el-link type="primary" @click="handleView(row)">{{ row.outboundNo }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="销售订单" width="150">
          <template #default="{ row }">
            {{ row.order?.orderNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="客户" min-width="150">
          <template #default="{ row }">
            <span>{{ row.customer?.name || row.order?.customer?.name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="业务员" width="100">
          <template #default="{ row }">
            <span>{{ row.salesman?.name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="出库日期" width="110">
          <template #default="{ row }">
            {{ formatDate(row.outboundDate) }}
          </template>
        </el-table-column>
        <el-table-column label="出库金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatAmount(row.totalAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status) || 'info'" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="仓库" width="120">
          <template #default="{ row }">
            {{ row.warehouse?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="制单人" width="120">
          <template #default="{ row }">
            {{ row.creator?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right" align="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-tag type="primary" size="small" @click="handleView(row)" style="cursor: pointer;">
                查看
              </el-tag>
              <el-tag
                v-if="row.status === 'draft'"
                type="warning"
                size="small"
                @click="handleEdit(row)"
                style="cursor: pointer;"
              >
                编辑
              </el-tag>
              <el-tag
                v-if="row.status === 'draft'"
                type="success"
                size="small"
                @click="handleCopy(row)"
                style="cursor: pointer;"
              >
                复制
              </el-tag>
              <el-tag
                v-if="row.status === 'draft'"
                type="info"
                size="small"
                @click="handleConfirm(row)"
                style="cursor: pointer;"
              >
                审核
              </el-tag>
              <el-tag
                v-if="row.status === 'draft'"
                type="danger"
                size="small"
                @click="handleDelete(row)"
                style="cursor: pointer;"
              >
                删除
              </el-tag>
              <el-tag
                v-if="row.status === 'confirmed'"
                type="warning"
                size="small"
                @click="handleUnconfirm(row)"
                style="cursor: pointer;"
              >
                反审核
              </el-tag>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <div class="batch-actions" v-if="selectedRows.length">
          <span>已选择 {{ selectedRows.length }} 项</span>
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
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="90px" class="outbound-form">
        <!-- 单据信息 -->
        <div class="form-section">
          <div class="section-title">
            <el-icon><Document /></el-icon>
            <span>单据信息</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="出库单号" prop="orderNo">
                <el-input v-model="formData.orderNo" placeholder="自动生成或手动输入" clearable />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="出库日期" prop="outboundDate">
                <el-date-picker
                  v-model="formData.outboundDate"
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
              <el-form-item label="销售订单" prop="salesOrderId">
                <el-select 
                  v-model="formData.salesOrderId" 
                  placeholder="请选择销售订单"
                  filterable
                  clearable
                  style="width: 100%;"
                  @change="handleOrderChange"
                >
                  <el-option
                    v-for="order in salesOrders"
                    :key="order.id"
                    :label="order.orderNo"
                    :value="order.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="仓库" prop="warehouseId">
                <el-select v-model="formData.warehouseId" placeholder="请选择仓库" filterable style="width: 100%;">
                  <el-option
                    v-for="warehouse in warehouses"
                    :key="warehouse.id"
                    :label="warehouse.name"
                    :value="warehouse.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="客户" prop="customerId">
                <el-select 
                  v-model="formData.customerId" 
                  placeholder="请选择客户" 
                  filterable
                  remote
                  reserve-keyword
                  :remote-method="searchCustomers"
                  :loading="loading"
                  style="width: 100%;"
                >
                  <el-option
                    v-for="customer in customers"
                    :key="customer.id"
                    :label="customer.name"
                    :value="customer.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="销售员">
                <el-select v-model="formData.salesmanId" placeholder="请选择销售员" filterable clearable style="width: 100%;">
                  <el-option
                    v-for="user in users"
                    :key="user.id"
                    :label="user.name"
                    :value="user.id"
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
            <el-popover trigger="click" placement="bottom-end" :width="120">
              <template #reference>
                <el-button size="small" link type="primary" style="margin-left: 12px">
                  <el-icon><Setting /></el-icon>
                  列设置
                </el-button>
              </template>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <el-checkbox v-model="visibleColumns.spec">规格</el-checkbox>
                <el-checkbox v-model="visibleColumns.unit">单位</el-checkbox>
                <el-checkbox v-model="visibleColumns.stock">可用库存</el-checkbox>
                <el-checkbox v-model="visibleColumns.plannedQty">计划数量</el-checkbox>
                <el-checkbox v-model="visibleColumns.outboundQty">已出库数量</el-checkbox>
              </div>
            </el-popover>
          </div>
          <el-table :data="formData.details" border size="small" show-summary :summary-method="getSummary">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="物料" min-width="200">
              <template #default="{ row, $index }">
                <el-select
                  v-model="row.productId"
                  placeholder="请选择物料"
                  filterable
                  remote
                  reserve-keyword
                  :remote-method="searchProducts"
                  :loading="loading"
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
            <el-table-column v-if="visibleColumns.spec" label="规格" width="100">
              <template #default="{ row }">
                {{ getProductAttr(row.productId, 'spec') }}
              </template>
            </el-table-column>
            <el-table-column v-if="visibleColumns.unit" label="单位" width="80">
              <template #default="{ row }">
                {{ getProductAttr(row.productId, 'unit') }}
              </template>
            </el-table-column>
            <el-table-column v-if="visibleColumns.stock" label="可用库存" width="90">
              <template #default="{ row }">
                <span :class="getStockClass(row.productId)">
                  {{ getAvailableStock(row.productId) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column v-if="visibleColumns.plannedQty" label="计划数量" width="90">
              <template #default="{ row }">
                {{ row.plannedQty || '-' }}
              </template>
            </el-table-column>
            <el-table-column v-if="visibleColumns.outboundQty" label="已出库数量" width="90">
              <template #default="{ row }">
                {{ row.outboundQty || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="本次出库" width="120">
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
              <el-form-item label="物流费用">
                <el-input-number
                  v-model="formData.logisticsCost"
                  :min="0"
                  :precision="2"
                  style="width: 100%;"
                  @change="calculateAmounts"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="优惠金额">
                <el-input-number
                  v-model="formData.extraDiscount"
                  :min="0"
                  :precision="2"
                  style="width: 100%;"
                  @change="calculateAmounts"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="出库总额">
                <el-input :value="'¥' + formatAmount(formData.totalAmount)" disabled class="total-amount" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="handleSaveDraft" :loading="submitLoading">保存草稿</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">提交单据</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情抽屉 -->
    <el-drawer v-model="viewDrawer" title="单据详情" size="800px">
      <div class="outbound-detail" v-if="currentOutbound">
        <!-- 单据信息 -->
        <div class="detail-section">
          <h4>单据信息</h4>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="出库单号">{{ currentOutbound.outboundNo }}</el-descriptions-item>
            <el-descriptions-item label="出库日期">{{ formatDate(currentOutbound.outboundDate) }}</el-descriptions-item>
            <el-descriptions-item label="单据状态">
              <el-tag :type="getStatusType(currentOutbound.status) || 'info'" size="small">
                {{ getStatusText(currentOutbound.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="客户">{{ currentOutbound.customer?.name || currentOutbound.order?.customer?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="业务员">{{ currentOutbound.salesman?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="仓库">{{ currentOutbound.warehouse?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="制单人">{{ currentOutbound.creator?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="制单时间">{{ formatDateTime(currentOutbound.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="3">{{ currentOutbound.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 物料明细 -->
        <div class="detail-section">
          <h4>物料明细</h4>
          <el-table :data="currentOutbound.details" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="product.code" label="物料编码" width="120" />
            <el-table-column prop="product.name" label="物料名称" min-width="150" />
            <el-table-column prop="product.spec" label="规格" width="100" />
            <el-table-column prop="product.unit" label="单位" width="60" />
            <el-table-column prop="plannedQty" label="计划数量" width="90" align="right" />
            <el-table-column prop="outboundQty" label="已出库数量" width="100" align="right" />
            <el-table-column prop="quantity" label="本次出库" width="100" align="right" />
            <el-table-column prop="unitPrice" label="单价" width="100" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.unitPrice) }}</template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.amount) }}</template>
            </el-table-column>
          </el-table>
          <div class="detail-summary">
            <span>物料总额：¥{{ formatAmount(currentOutbound.goodsAmount) }}</span>
            <span>物流费用：¥{{ formatAmount(currentOutbound.logisticsCost || 0) }}</span>
            <span>优惠：¥{{ formatAmount(currentOutbound.extraDiscount || 0) }}</span>
            <span class="total">出库总额：¥{{ formatAmount(currentOutbound.totalAmount) }}</span>
          </div>
        </div>

        <!-- 操作日志 -->
        <div class="detail-section" v-if="currentOutbound.logs?.length">
          <h4>操作记录</h4>
          <el-timeline size="small">
            <el-timeline-item
              v-for="log in currentOutbound.logs"
              :key="log.id"
              :timestamp="formatDateTime(log.createdAt)"
              :type="log.action === 'create' ? 'primary' : undefined"
            >
              <p>{{ log.actionText }} - {{ log.operator?.name || '系统' }}</p>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-drawer>

    <!-- 导入对话框 -->
    <CommonImportDialog
      v-model="importDialogVisible"
      title="销售出库单"
      :columns="importColumns"
      :format-tips="importFormatTips"
      :import-fn="handleImportSubmit"
      @success="handleImportSuccess"
    />

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      module-name="销售出库单"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Document, Clock, Money, Wallet, Goods, Delete, QuestionFilled, Setting } from '@element-plus/icons-vue'
import { getSalesOutbounds, getSalesOutboundById, createSalesOutbound, updateSalesOutbound, confirmSalesOutbound, unconfirmSalesOutbound, deleteSalesOutbound, importSalesOutbounds } from '@/api/sales-outbound'
import { getSalesOrders } from '@/api/sales-order'
import { getCustomers } from '@/api/customer'
import { getUsers } from '@/api/user'
import { getWarehouses, getDefaultWarehouse } from '@/api/warehouse'
import { getProducts } from '@/api/product'
import { getInventory } from '@/api/inventory'
import { getStatusColor, getSalesOutboundStatusText } from '@/utils/status.util'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'
import CommonImportDialog from '@/components/CommonImportDialog.vue'
import type { FormInstance, FormRules } from 'element-plus'

// 数据列表
const tableData = ref<any[]>([])
const loading = ref(false)
const selectedRows = ref<any[]>([])

// 统计
const stats = ref({
  total: 0,
  pending: 0,
  amount: 0,
  unpaid: 0
})

// 搜索表单
const searchForm = reactive({
  orderNo: '',
  status: '',
  customerId: '',
  dateRange: [] as string[]
})

// 下拉数据
const customers = ref<any[]>([])
const users = ref<any[]>([])
const salesOrders = ref<any[]>([])
const warehouses = ref<any[]>([])
const products = ref<any[]>([])
const inventoryMap = ref<Record<string, number>>({})

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 对话框
const dialogVisible = ref(false)
const viewDrawer = ref(false)
const currentOutbound = ref<any>(null)

// 明细列显隐控制
const visibleColumns = reactive({
  spec: true,
  unit: true,
  stock: true,
  plannedQty: true,
  outboundQty: true
})
const dialogTitle = ref('新增销售出库单')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const helpDialogVisible = ref(false)
const importDialogVisible = ref(false)

// 导入配置
const importColumns = [
  { prop: 'outboundNo', label: '出库单号', required: true, unique: false },
  { prop: 'outboundDate', label: '出库日期', required: true },
  { prop: 'warehouseName', label: '仓库名称', required: true },
  { prop: 'customerName', label: '客户名称', required: true },
  { prop: 'salesmanName', label: '业务员' },
  { prop: 'orderNo', label: '销售订单号' },
  { prop: 'productCode', label: '物料编码', required: true },
  { prop: 'productName', label: '物料名称', required: true },
  { prop: 'productSpec', label: '物料规格' },
  { prop: 'quantity', label: '数量', required: true },
  { prop: 'unitPrice', label: '单价' },
  { prop: 'amount', label: '金额' },
  { prop: 'batchNo', label: '批次号' },
  { prop: 'remark', label: '备注' }
]

const importFormatTips = [
  '出库单号：必填，用于合并同一出库单的多个明细行',
  '出库日期：必填，格式：YYYY-MM-DD',
  '仓库名称：必填，填写仓库名称',
  '客户名称：必填，填写客户名称',
  '业务员：可选，填写业务员姓名',
  '销售订单号：可选，填写关联的销售订单号',
  '物料编码：必填，填写物料编码',
  '物料名称：必填，填写物料名称',
  '物料规格：可选，填写物料规格',
  '数量：必填，数字格式',
  '单价：可选，数字格式',
  '金额：可选，数字格式，优先使用金额计算',
  '批次号：可选，填写批次号',
  '备注：可选',
  '',
  '金额计算规则：',
  '1. 如果填写了金额和数量，则金额优先，单价=金额/数量',
  '2. 如果只填写了单价和数量，则金额=单价×数量',
  '',
  '多明细出库单导入示例：',
  '出库单号相同的行会合并为一个出库单',
  '例如：出库单号 SO001 有2个物料明细',
  '第1行：SO001, 2026-04-20, 主仓库, 客户A, SO001, P001, 产品A, , 10, 100, 1000, , 备注1',
  '第2行：SO001, 2026-04-20, 主仓库, 客户A, SO001, P002, 产品B, , 5, 200, 1000, , 备注2',
  '这2行会合并为一个出库单 SO001，包含2个明细'
]

// 表单数据
const formData = reactive({
  id: '',
  orderNo: '',
  salesOrderId: '',
  customerId: '',
  salesmanId: '',
  outboundDate: new Date().toISOString().split('T')[0],
  warehouseId: '',
  remark: '',
  logisticsCost: 0,
  extraDiscount: 0,
  details: [] as any[],
  goodsAmount: 0,
  totalAmount: 0
})

// 表单验证规则
const formRules: FormRules = {
  outboundDate: [
    { required: true, message: '请选择出库日期', trigger: 'change' }
  ],
  warehouseId: [
    { required: true, message: '请选择仓库', trigger: 'change' }
  ]
}

// 计算金额
const calculateAmounts = () => {
  let goodsAmount = 0
  formData.details.forEach(detail => {
    detail.amount = Number((detail.quantity || 0) * (detail.unitPrice || 0))
    goodsAmount += detail.amount
  })
  formData.goodsAmount = Number(goodsAmount)
  formData.totalAmount = Number(formData.goodsAmount + (formData.logisticsCost || 0) - (formData.extraDiscount || 0))
}

// 获取物料属性
const getProductAttr = (productId: string, attr: string) => {
  const product = products.value.find(p => p.id === productId)
  return product ? product[attr] || '-' : '-'
}

// 获取库存样式
const getStockClass = (productId: string) => {
  const product = products.value.find(p => p.id === productId)
  const stock = getAvailableStock(productId)
  if (!product || stock <= 0) return 'stock-low'
  if (stock < product.minStock) return 'stock-warning'
  return ''
}

// 获取汇总数据
const getSummary = () => {
  calculateAmounts()
  const totalQty = formData.details.reduce((sum: number, d: any) => sum + (d.quantity || 0), 0)
  return [
    '', '', '', '', '', '', '', totalQty, '', '¥' + formatAmount(formData.goodsAmount), ''
  ]
}

// 获取销售出库单列表
const fetchSalesOutbounds = async () => {
  try {
    loading.value = true
    const params: any = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (searchForm.orderNo) {
      params.search = searchForm.orderNo
    }
    if (searchForm.status) {
      params.status = searchForm.status
    }
    if (searchForm.customerId) {
      params.customerId = searchForm.customerId
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    const response: any = await getSalesOutbounds(params)
    if (response.success) {
      tableData.value = response.data.items || []
      pagination.total = response.data.total
      
      // 计算统计数据
      const items = response.data.items || []
      stats.value = {
        total: response.data.total || 0,
        pending: items.filter((t: any) => t.status === 'draft').length,
        amount: items.reduce((sum: number, t: any) => sum + Number(t.totalAmount || 0), 0),
        unpaid: items.filter((t: any) => t.status === 'confirmed').reduce((sum: number, t: any) => sum + Number(t.totalAmount || 0), 0)
      }
    }
  } catch (error) {
    console.error('获取销售出库单列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取客户列表
const fetchCustomers = async () => {
  try {
    const response: any = await getCustomers({ page: 1, limit: 100 })
    if (response.success) {
      customers.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取客户列表失败:', error)
  }
}

// 远程搜索客户
const searchCustomers = async (keyword: string) => {
  try {
    const response: any = await getCustomers({ page: 1, limit: 100, search: keyword })
    if (response.success) {
      customers.value = response.data.items || []
    }
  } catch (error) {
    console.error('搜索客户列表失败:', error)
  }
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    const response: any = await getUsers({ page: 1, limit: 100, status: 'active' })
    if (response.success) {
      users.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

// 获取销售订单列表
const fetchSalesOrders = async () => {
  try {
    const response: any = await getSalesOrders({ page: 1, limit: 100, status: 'confirmed' })
    if (response.success) {
      salesOrders.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取销售订单列表失败:', error)
  }
}

// 获取仓库列表
const fetchWarehouses = async () => {
  try {
    const response: any = await getWarehouses({ page: 1, limit: 100 })
    if (response.success) {
      warehouses.value = response.data.items || []
      // 自动填充默认仓库
      if (warehouses.value.length > 0 && !formData.warehouseId) {
        const defaultWarehouse = warehouses.value.find(w => w.isDefault) || warehouses.value[0]
        formData.warehouseId = defaultWarehouse.id
      }
    }
  } catch (error) {
    console.error('获取仓库列表失败:', error)
  }
}

// 获取物料列表
const fetchProducts = async () => {
  try {
    const response: any = await getProducts({ page: 1, limit: 100 })
    if (response.success) {
      products.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取物料列表失败:', error)
  }
}

// 远程搜索物料
const searchProducts = async (keyword: string) => {
  try {
    const response: any = await getProducts({ page: 1, limit: 100, search: keyword })
    if (response.success) {
      products.value = response.data.items || []
    }
  } catch (error) {
    console.error('搜索物料列表失败:', error)
  }
}

// 获取库存数据
const fetchInventory = async () => {
  try {
    const response: any = await getInventory({ page: 1, limit: 100 })
    if (response.success) {
      const map: Record<string, number> = {}
      response.data.items?.forEach((item: any) => {
        map[item.productId] = (map[item.productId] || 0) + item.quantity
      })
      inventoryMap.value = map
    }
  } catch (error) {
    console.error('获取库存数据失败:', error)
  }
}

// 获取可用库存
const getAvailableStock = (productId: string) => {
  return inventoryMap.value[productId] || 0
}

// 销售订单变更
const handleOrderChange = (orderId: string) => {
  const order = salesOrders.value.find((o: any) => o.id === orderId)
  if (order) {
    formData.customerId = order.customerId
    formData.details = order.items?.map((detail: any) => ({
      id: detail.id,
      productId: detail.productId,
      plannedQty: detail.quantity,
      outboundQty: 0,
      quantity: detail.quantity,
      unitPrice: detail.unitPrice,
      taxRate: detail.taxRate || 0,
      taxAmount: detail.taxAmount || 0,
      amount: detail.amount || 0
    })) || []
    calculateAmounts()
  }
}

// 明细变更
const handleDetailChange = (index: number) => {
  calculateAmounts()
}

// 物料选择
const handleProductSelect = (index: number) => {
  const detail = formData.details[index]
  const product = products.value.find((p: any) => p.id === detail.productId)
  if (product) {
    detail.unitPrice = Number(product.costPrice) || 0
    calculateAmounts()
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchSalesOutbounds()
}

// 重置搜索
const handleReset = () => {
  searchForm.orderNo = ''
  searchForm.status = ''
  searchForm.customerId = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchSalesOutbounds()
}

// 导出
const handleExport = () => {
  ElMessage.info('导出功能开发中')
}

// 新增
const handleCreate = async () => {
  dialogTitle.value = '新增销售出库单'
  isEdit.value = false
  resetForm()
  
  // 按需加载数据，确保必要数据已加载
  if (!customers.value.length) {
    await fetchCustomers()
  }
  if (!products.value.length) {
    await fetchProducts()
  }
  if (!warehouses.value.length) {
    await fetchWarehouses()
  }
  if (!users.value.length) {
    await fetchUsers()
  }
  if (!salesOrders.value.length) {
    await fetchSalesOrders()
  }
  await fetchInventory()
  
  // 默认添加一行明细
  handleAddDetail()
  
  dialogVisible.value = true
}

// 添加明细行
const handleAddDetail = () => {
  formData.details.push({
    productId: '',
    plannedQty: 0,
    outboundQty: 0,
    quantity: 0,
    unitPrice: 0,
    taxRate: 0,
    taxAmount: 0,
    amount: 0
  })
}

// 删除明细行
const handleRemoveDetail = (index: number) => {
  formData.details.splice(index, 1)
  calculateAmounts()
}

// 查看
const handleView = async (row: any) => {
  try {
    const response: any = await getSalesOutboundById(row.id)
    if (response.success) {
      currentOutbound.value = response.data
      viewDrawer.value = true
    }
  } catch (error) {
    console.error('获取销售出库单详情失败:', error)
    ElMessage.error('获取销售出库单详情失败')
  }
}

// 编辑
const handleEdit = async (row: any) => {
  dialogTitle.value = '编辑销售出库单'
  isEdit.value = true
  
  try {
    const response: any = await getSalesOutboundById(row.id)
    if (response.success) {
      const outbound = response.data

      // 确保当前客户在选项列表中
      const customerObj = outbound.customer || outbound.order?.customer
      if (customerObj && !customers.value.find((c: any) => c.id === customerObj.id)) {
        customers.value = [customerObj, ...customers.value]
      }

      // 确保当前物料在选项列表中
      const allProducts = [...products.value]
      ;(outbound.details || []).forEach((detail: any) => {
        if (detail.product && !allProducts.find((p: any) => p.id === detail.productId)) {
          allProducts.push(detail.product)
        }
      })
      products.value = allProducts

      Object.assign(formData, {
        id: outbound.id,
        orderNo: outbound.outboundNo,
        salesOrderId: outbound.orderId || '',
        customerId: outbound.customer?.id || outbound.order?.customer?.id || '',
        outboundDate: outbound.outboundDate,
        warehouseId: outbound.warehouseId,
        salesmanId: outbound.salesman?.id || outbound.salesmanId || '',
        remark: outbound.remark || '',
        logisticsCost: Number(outbound.logisticsCost) || 0,
        extraDiscount: Number(outbound.extraDiscount) || 0,
        goodsAmount: Number(outbound.goodsAmount) || 0,
        totalAmount: Number(outbound.totalAmount) || 0,
        details: outbound.details?.map((detail: any) => ({
          id: detail.id,
          productId: detail.productId,
          product: detail.product,
          plannedQty: Number(detail.plannedQty) || 0,
          outboundQty: Number(detail.outboundQty) || 0,
          quantity: Number(detail.quantity) || 0,
          unitPrice: Number(detail.unitPrice) || 0,
          taxRate: Number(detail.taxRate) || 0,
          taxAmount: Number(detail.taxAmount) || 0,
          amount: Number(detail.amount) || 0
        })) || []
      })
      
      // 加载必要数据
      if (!customers.value.length) await fetchCustomers()
      if (!products.value.length) await fetchProducts()
      if (!warehouses.value.length) await fetchWarehouses()
      if (!users.value.length) await fetchUsers()
      if (!salesOrders.value.length) await fetchSalesOrders()
      await fetchInventory()
      
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取销售出库单详情失败:', error)
    ElMessage.error('获取销售出库单详情失败')
  }
}

// 复制
const handleCopy = async (row: any) => {
  await handleEdit(row)
  isEdit.value = false
  formData.id = ''
  formData.orderNo = ''
  formData.salesOrderId = ''
  dialogTitle.value = '复制销售出库单'
}

// 审核出库单
const handleConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要审核销售出库单 "${row.outboundNo}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await confirmSalesOutbound(row.id)
    ElMessage.success('审核成功')
    fetchSalesOutbounds()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('审核销售出库单失败:', error)
    }
  }
}

// 反审核出库单
const handleUnconfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要反审核销售出库单 "${row.outboundNo}" 吗？反审核后库存将恢复。`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await unconfirmSalesOutbound(row.id)
    ElMessage.success('反审核成功')
    fetchSalesOutbounds()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('反审核销售出库单失败:', error)
      ElMessage.error('反审核失败')
    }
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除销售出库单 "${row.outboundNo}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteSalesOutbound(row.id)
    ElMessage.success('删除成功')
    fetchSalesOutbounds()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除销售出库单失败:', error)
    }
  }
}

const getStatusType = (status: any): 'primary' | 'success' | 'info' | 'warning' | 'danger' => {
  const type = getStatusColor(status)
  const validTypes: Array<'primary' | 'success' | 'info' | 'warning' | 'danger'> = 
    ['primary', 'success', 'info', 'warning', 'danger']
  if (validTypes.includes(type)) {
    return type
  }
  return 'info'
}

const getStatusText = (status: string) => {
  return getSalesOutboundStatusText(status)
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

// 格式化金额
const formatAmount = (amount: any) => {
  if (amount === undefined || amount === null) return '0.00'
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  if (isNaN(numAmount)) return '0.00'
  return numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 保存草稿
const handleSaveDraft = async () => {
  if (!formRef.value) return
  
  if (formData.details.length === 0) {
    ElMessage.warning('请至少添加一条明细')
    return
  }
  
  try {
    await formRef.value.validate()
    
    // 验证明细
    for (const detail of formData.details) {
      if (!detail.productId) {
        ElMessage.warning('请选择物料')
        return
      }
      if (!detail.quantity || detail.quantity <= 0) {
        ElMessage.warning('出库数量必须大于0')
        return
      }
      const available = getAvailableStock(detail.productId)
      if (detail.quantity > available) {
        ElMessage.warning(`物料 "${getProductName(detail.productId)}" 库存不足`)
        return
      }
    }
    
    submitLoading.value = true
    await doSubmit(false)
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    submitLoading.value = false
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  if (formData.details.length === 0) {
    ElMessage.warning('请至少添加一条明细')
    return
  }
  
  try {
    await formRef.value.validate()
    
    // 验证明细
    for (const detail of formData.details) {
      if (!detail.productId) {
        ElMessage.warning('请选择物料')
        return
      }
      if (!detail.quantity || detail.quantity <= 0) {
        ElMessage.warning('出库数量必须大于0')
        return
      }
      const available = getAvailableStock(detail.productId)
      if (detail.quantity > available) {
        ElMessage.warning(`物料 "${getProductName(detail.productId)}" 库存不足`)
        return
      }
    }
    
    submitLoading.value = true
    await doSubmit(true)
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitLoading.value = false
  }
}

// 实际提交逻辑
const doSubmit = async (shouldConfirm: boolean) => {
  try {
    // 构建提交数据
    const submitData: any = {
      customerId: formData.customerId,
      salesmanId: formData.salesmanId,
      outboundDate: formData.outboundDate,
      warehouseId: formData.warehouseId,
      remark: formData.remark,
      logisticsCost: formData.logisticsCost,
      extraDiscount: formData.extraDiscount,
      goodsAmount: formData.goodsAmount,
      totalAmount: formData.totalAmount,
      details: formData.details.map(detail => ({
        productId: detail.productId,
        quantity: detail.quantity,
        unitPrice: detail.unitPrice,
        taxRate: detail.taxRate,
        taxAmount: detail.taxAmount,
        amount: detail.amount
      }))
    }

    if (isEdit.value) {
      submitData.outboundNo = formData.orderNo
      submitData.orderId = formData.salesOrderId || undefined
      await updateSalesOutbound(formData.id, submitData)
      ElMessage.success('更新成功')
    } else {
      // 新增时只传已有编号，由后端自动生成
      if (formData.orderNo) {
        submitData.outboundNo = formData.orderNo
      }
      if (formData.salesOrderId) {
        submitData.orderId = formData.salesOrderId
      }
      await createSalesOutbound(submitData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    fetchSalesOutbounds()
  } catch (error) {
    console.error('提交失败:', error)
  }
}

// 获取物料名称
const getProductName = (productId: string) => {
  const product = products.value.find((p: any) => p.id === productId)
  return product?.name || ''
}

// 重置表单
const resetForm = () => {
  formData.id = ''
  formData.orderNo = ''
  formData.salesOrderId = ''
  formData.customerId = ''
  formData.salesmanId = ''
  formData.outboundDate = new Date().toISOString().split('T')[0]
  formData.warehouseId = ''
  formData.remark = ''
  formData.logisticsCost = 0
  formData.extraDiscount = 0
  formData.goodsAmount = 0
  formData.totalAmount = 0
  formData.details = []
}

// 监听客户选择，自动带入专属业务员
watch(() => formData.customerId, (newCustomerId) => {
  if (newCustomerId) {
    const selectedCustomer: any = customers.value.find(c => c.id === newCustomerId)
    if (selectedCustomer?.salesmanId) {
      formData.salesmanId = selectedCustomer.salesmanId
    } else if (selectedCustomer?.user?.id) {
      formData.salesmanId = selectedCustomer.user.id
    }
  }
})

// 关闭对话框
const handleDialogClose = () => {
  resetForm()
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 导入
const handleImport = () => {
  importDialogVisible.value = true
}

const handleImportSubmit = async (data: any[]) => {
  const warehouseMap = new Map<string, string>()
  const customerMap = new Map<string, string>()
  const salesmanMap = new Map<string, string>()
  const productMap = new Map<string, string>()
  const orderMap = new Map<string, string>()

  try {
    const warehouseResponse: any = await getWarehouses({ page: 1, limit: 10000, status: '' })
    if (warehouseResponse.success) {
      const allWarehouses = warehouseResponse.data.items || []
      allWarehouses.forEach((w: any) => warehouseMap.set(w.name, w.id))
    }
  } catch (error) {
    console.error('获取仓库列表失败:', error)
  }

  try {
    const customerResponse: any = await getCustomers({ page: 1, limit: 10000, status: '' })
    if (customerResponse.success) {
      const allCustomers = customerResponse.data.items || []
      allCustomers.forEach((c: any) => customerMap.set(c.name, c.id))
    }
  } catch (error) {
    console.error('获取客户列表失败:', error)
  }

  try {
    const usersResponse: any = await getUsers({ page: 1, limit: 10000, status: '' })
    if (usersResponse.success) {
      const allUsers = usersResponse.data.items || []
      allUsers.forEach((u: any) => salesmanMap.set(u.name, u.id))
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }

  try {
    const productResponse: any = await getProducts({ page: 1, limit: 10000, status: '' })
    if (productResponse.success) {
      const allProducts = productResponse.data.items || []
      allProducts.forEach((p: any) => productMap.set(p.code, p.id))
    }
  } catch (error) {
    console.error('获取物料列表失败:', error)
  }

  try {
    const orderResponse: any = await getSalesOrders({ page: 1, limit: 10000, status: '' })
    if (orderResponse.success) {
      const allOrders = orderResponse.data.items || []
      allOrders.forEach((o: any) => orderMap.set(o.orderNo, o.id))
    }
  } catch (error) {
    console.error('获取销售订单列表失败:', error)
  }

  const processedData = data.map(item => {
    const newItem: any = { ...item }

    if (item.warehouseName && warehouseMap.has(item.warehouseName)) {
      newItem.warehouseId = warehouseMap.get(item.warehouseName)
      delete newItem.warehouseName
    } else if (item.warehouseName) {
      newItem.warehouseError = `仓库 "${item.warehouseName}" 不存在`
    }

    if (item.customerName && customerMap.has(item.customerName)) {
      newItem.customerId = customerMap.get(item.customerName)
      delete newItem.customerName
    } else if (item.customerName) {
      newItem.customerError = `客户 "${item.customerName}" 不存在`
    }

    if (item.salesmanName && salesmanMap.has(item.salesmanName)) {
      newItem.salesmanId = salesmanMap.get(item.salesmanName)
      delete newItem.salesmanName
    } else if (item.salesmanName) {
      console.warn(`业务员 "${item.salesmanName}" 不存在，已跳过设置业务员`)
      delete newItem.salesmanName
    }

    if (item.orderNo && orderMap.has(item.orderNo)) {
      newItem.orderId = orderMap.get(item.orderNo)
      delete newItem.orderNo
    } else if (item.orderNo) {
      console.warn(`销售订单 "${item.orderNo}" 不存在，已跳过设置订单`)
      delete newItem.orderNo
    }

    if (item.productCode && productMap.has(item.productCode)) {
      newItem.productId = productMap.get(item.productCode)
      delete newItem.productCode
    } else if (item.productCode) {
      newItem.productError = `物料编码 "${item.productCode}" 不存在`
    }

    const quantity = parseFloat(item.quantity) || 0
    const excelAmount = parseFloat(item.amount) || 0
    const excelUnitPrice = parseFloat(item.unitPrice) || 0

    let amount: number
    let unitPrice: number

    if (excelAmount > 0 && quantity > 0) {
      amount = excelAmount
      unitPrice = excelUnitPrice > 0 ? excelUnitPrice : (amount / quantity)
    } else if (quantity > 0 && excelUnitPrice > 0) {
      unitPrice = excelUnitPrice
      amount = quantity * unitPrice
    } else {
      unitPrice = 0
      amount = 0
    }

    newItem.quantity = quantity
    newItem.unitPrice = unitPrice
    newItem.amount = amount

    return newItem
  })

  const result: any = await importSalesOutbounds(processedData)
  return result
}

const handleImportSuccess = () => {
  fetchSalesOutbounds()
}

// 帮助数据
const helpData = {
  operations: [
    {
      title: '新增销售出库单',
      steps: [
        '点击"新增出库单"按钮',
        '选择客户和销售员',
        '选择出库仓库',
        '添加出库明细，选择物料和数量',
        '设置出库日期和备注',
        '点击"保存草稿"或"提交单据"'
      ]
    },
    {
      title: '关联销售订单',
      steps: [
        '在新增出库单时选择关联的销售订单',
        '系统会自动带入订单的物料明细',
        '修改出库数量',
        '确认出库'
      ]
    },
    {
      title: '确认出库单',
      steps: [
        '在出库单列表中找到草稿状态的出库单',
        '点击"确认"按钮',
        '确认后库存会相应减少'
      ]
    }
  ],
  notices: [
    '出库数量不能超过可用库存',
    '确认出库单会扣减库存',
    '已审核的出库单不能直接修改',
    '可以关联销售订单自动生成出库单',
    '支持部分出库'
  ],
  tips: [
    '可以使用销售订单快速出库功能',
    '支持批量出库操作',
    '出库单审核后不可撤销',
    '可以按客户、状态、日期等条件筛选出库单'
  ],
  shortcuts: [
    { key: 'Ctrl+N', description: '新增出库单' },
    { key: 'Ctrl+S', description: '保存草稿' },
    { key: 'F5', description: '刷新列表' }
  ],
  version: '1.0.0',
  lastUpdate: '2025-05-28',
  changes: [
    '新增销售出库单功能',
    '支持关联销售订单',
    '新增帮助文档功能'
  ]
}

// 打开帮助
const handleHelp = () => {
  helpDialogVisible.value = true
}

// 分页大小改变
const handleSizeChange = (val: number) => {
  pagination.limit = val
  pagination.page = 1
  fetchSalesOutbounds()
}

// 当前页改变
const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchSalesOutbounds()
}

// 初始化
onMounted(async () => {
  // 加载列表数据和基础数据
  await Promise.all([
    fetchSalesOutbounds(),
    fetchCustomers(),
    fetchWarehouses(),
    fetchProducts()
  ])
})
</script>

<style scoped>
.sales-outbound-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  gap: 8px;
}

.stats-row {
  padding: 0 20px;
  margin-bottom: 16px !important;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 24px;
  margin-right: 16px;
}

.stat-icon.pending {
  background: #fdf6ec;
  color: #e6a23c;
}

.stat-icon.amount {
  background: #f0f9eb;
  color: #67c23a;
}

.stat-icon.unpaid {
  background: #fef0f0;
  color: #f56c6c;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.search-card {
  margin: 0 20px 16px;
}

.search-card :deep(.el-card__body) {
  padding: 16px;
}

.search-item {
  width: 100%;
}

.search-actions {
  display: flex;
  gap: 8px;
}

.table-card {
  margin: 0 20px;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.batch-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.batch-actions span {
  color: #606266;
  font-size: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.outbound-form {
  max-height: 70vh;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 24px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.details-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.amount {
  color: #67c23a;
  font-weight: 500;
}

.total-amount :deep(.el-input__wrapper) {
  background: #f0f9eb;
}

.total-amount :deep(.el-input__inner) {
  color: #67c23a;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.outbound-detail {
  padding: 16px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.detail-summary {
  display: flex;
  gap: 24px;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.detail-summary span {
  font-size: 14px;
  color: #606266;
}

.detail-summary .total {
  font-size: 16px;
  font-weight: 600;
  color: #67c23a;
}

.stock-low {
  color: #f56c6c;
  font-weight: 500;
}

.stock-warning {
  color: #e6a23c;
  font-weight: 500;
}
</style>
