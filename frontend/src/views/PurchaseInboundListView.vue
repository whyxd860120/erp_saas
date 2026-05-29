<template>
  <div class="purchase-inbound-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">采购入库</h2>
      </div>
      <div class="header-right">
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
          新增入库单
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
            <span class="stat-label">总入库数</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon pending"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">待审核</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon amount"><el-icon><Money /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.amount) }}</span>
            <span class="stat-label">入库总额</span>
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
            <el-form-item label="入库单号" class="search-item">
              <el-input v-model="searchForm.orderNo" placeholder="入库单号" clearable style="width: 100%;" @keyup.enter="handleSearch" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="供应商" class="search-item">
              <el-select v-model="searchForm.supplierId" placeholder="请选择供应商" clearable filterable style="width: 100%;" @change="handleSearch">
                <el-option
                  v-for="supplier in suppliers"
                  :key="supplier.id"
                  :label="supplier.name"
                  :value="supplier.id"
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
                @change="handleSearch"
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
        <el-table-column prop="inboundNo" label="入库单号" width="180" fixed>
          <template #default="{ row }">
            <el-link type="primary" @click="handleView(row)">{{ row.inboundNo }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="采购订单" width="150">
          <template #default="{ row }">
            {{ row.order?.orderNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="供应商" min-width="150">
          <template #default="{ row }">
            <span>{{ row.order?.supplier?.name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="入库日期" width="110">
          <template #default="{ row }">
            {{ formatDate(row.inboundDate) }}
          </template>
        </el-table-column>
        <el-table-column label="入库金额" width="120" align="right">
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
        <el-table-column label="操作" width="240" fixed="right" align="right">
          <template #default="{ row }">
            <div class="action-buttons">
            <el-tag type="primary" size="small" @click="handleView(row)" style="cursor: pointer;">
              查看
            </el-tag>
            <el-button
              v-if="row.status === 'draft'"
              type="warning"
              size="small"
              link
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
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
            <el-tag
              v-if="row.status === 'draft'"
              type="success"
              size="small"
              @click="handleCopy(row)"
              style="cursor: pointer;"
            >
              复制
            </el-tag>
            </div>
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
    
    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="1000px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <div class="inbound-form">
        <!-- 单据信息 -->
        <div class="form-section">
          <div class="section-title">
            <el-icon><Document /></el-icon>
            <span>单据信息</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="入库单号">
                <el-input v-model="formData.orderNo" placeholder="自动生成" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="入库日期">
                <el-date-picker
                  v-model="formData.inboundDate"
                  type="date"
                  placeholder="选择日期"
                  style="width: 100%;"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="仓库">
                <el-select
                  v-model="formData.warehouseId"
                  placeholder="请选择仓库"
                  filterable
                  style="width: 100%;"
                >
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
            <el-col :span="24">
              <el-form-item label="采购订单">
                <el-select
                  v-model="formData.purchaseOrderId"
                  placeholder="请选择采购订单（可选）"
                  filterable
                  @change="handleOrderChange"
                  style="width: 100%;"
                >
                  <el-option
                    v-for="order in purchaseOrders"
                    :key="order.id"
                    :label="order.orderNo"
                    :value="order.id"
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
            <el-popover trigger="click" placement="bottom-end" :width="140">
              <template #reference>
                <el-button size="small" link type="primary" style="margin-left: 12px">
                  <el-icon><Setting /></el-icon>
                  列设置
                </el-button>
              </template>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <el-checkbox v-model="visibleColumns.spec">规格</el-checkbox>
                <el-checkbox v-model="visibleColumns.unit">单位</el-checkbox>
                <el-checkbox v-model="visibleColumns.plannedQty">计划数量</el-checkbox>
                <el-checkbox v-model="visibleColumns.taxRate">税率(%)</el-checkbox>
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
                  @change="handleProductChange(row.productId, $index)"
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
            <el-table-column v-if="visibleColumns.plannedQty" label="计划数量" width="120" align="right">
              <template #default="{ row }">
                {{ row.plannedQty || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="本次入库" width="120" prop="quantity">
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
            <el-table-column v-if="visibleColumns.taxRate" label="税率(%)" width="100">
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
            <el-table-column label="金额" width="130" prop="amount">
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
              <el-form-item label="税额">
                <el-input :value="'¥' + formatAmount(formData.taxAmount)" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="物流/快递费用">
                <el-input-number
                  v-model="formData.logisticsCost"
                  :min="0"
                  :precision="2"
                  placeholder="请输入物流费用"
                  style="width: 100%;"
                  @change="calculateAmounts"
                />
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
                  @change="calculateAmounts"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="实际金额">
                <el-input :value="'¥' + formatAmount(formData.finalAmount)" disabled class="total-amount" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="handleSaveDraft" :loading="submitLoading">保存草稿</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">提交单据</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-drawer v-model="viewDrawer" title="单据详情" size="800px">
      <div class="inbound-detail" v-if="currentInbound">
        <!-- 单据信息 -->
        <div class="detail-section">
          <h4>单据信息</h4>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="入库单号">{{ currentInbound.inboundNo }}</el-descriptions-item>
            <el-descriptions-item label="入库日期">{{ formatDate(currentInbound.inboundDate) }}</el-descriptions-item>
            <el-descriptions-item label="单据状态">
              <el-tag :type="getStatusType(currentInbound.status) || 'info'" size="small">
                {{ getStatusText(currentInbound.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="仓库">{{ currentInbound.warehouse?.name }}</el-descriptions-item>
            <el-descriptions-item label="制单人">{{ currentInbound.creator?.name }}</el-descriptions-item>
            <el-descriptions-item label="制单时间">{{ formatDateTime(currentInbound.createdAt) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 物料明细 -->
        <div class="detail-section">
          <h4>物料明细</h4>
          <el-table :data="(currentInbound.items || currentInbound.details || [])" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="物料编码" width="120">
              <template #default="{ row }">{{ row.product?.code || row.productCode || '-' }}</template>
            </el-table-column>
            <el-table-column label="物料名称" min-width="150">
              <template #default="{ row }">{{ row.product?.name || row.productName || '-' }}</template>
            </el-table-column>
            <el-table-column label="规格" width="100">
              <template #default="{ row }">{{ row.product?.spec || row.spec || '-' }}</template>
            </el-table-column>
            <el-table-column label="单位" width="60">
              <template #default="{ row }">{{ row.product?.unit || row.unit || '-' }}</template>
            </el-table-column>
            <el-table-column label="计划数量" width="100" align="right">
              <template #default="{ row }">{{ row.plannedQty || row.plannedQuantity || 0 }}</template>
            </el-table-column>
            <el-table-column label="入库数量" width="100" align="right">
              <template #default="{ row }">{{ row.quantity || 0 }}</template>
            </el-table-column>
            <el-table-column label="单价" width="100" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.unitPrice) }}</template>
            </el-table-column>
            <el-table-column label="税率(%)" width="80" align="right">
              <template #default="{ row }">{{ row.taxRate || 0 }}</template>
            </el-table-column>
            <el-table-column label="税额" width="100" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.taxAmount) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="120" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.amount) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 费用汇总 -->
        <div class="detail-section">
          <h4>费用汇总</h4>
          <div class="detail-summary">
            <span>物料总额：¥{{ formatAmount(getGoodsAmount()) }}</span>
            <span>税额：¥{{ formatAmount(getTaxAmount()) }}</span>
            <span>物流/快递费用：¥{{ formatAmount(currentInbound.logisticsCost || 0) }}</span>
            <span>优惠：¥{{ formatAmount(currentInbound.discountAmount || 0) }}</span>
            <span class="total">入库总额：¥{{ formatAmount(currentInbound.finalAmount || currentInbound.totalAmount) }}</span>
          </div>
        </div>

        <!-- 备注信息 -->
        <div class="detail-section" v-if="currentInbound.remark">
          <h4>备注信息</h4>
          <p>{{ currentInbound.remark }}</p>
        </div>

        <!-- 操作日志 -->
        <div class="detail-section" v-if="currentInbound.logs?.length">
          <h4>操作记录</h4>
          <el-timeline size="small">
            <el-timeline-item
              v-for="log in currentInbound.logs"
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

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      module-name="采购入库单"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, QuestionFilled, Download, Document, Clock, Money, Wallet, Setting, Goods, Delete } from '@element-plus/icons-vue'
import { getPurchaseInbounds, getPurchaseInboundById, createPurchaseInbound, updatePurchaseInbound, confirmPurchaseInbound, unconfirmPurchaseInbound, deletePurchaseInbound } from '@/api/purchase-inbound'
import { getPurchaseOrders } from '@/api/purchase-order'
import { getSuppliers } from '@/api/supplier'
import { getWarehouses, getDefaultWarehouse } from '@/api/warehouse'
import { getProducts } from '@/api/product'
import { generateNextNumber } from '@/api/numbering-rule'
import { getStatusColor, getPurchaseInboundStatusText } from '@/utils/status.util'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'
import type { FormInstance, FormRules } from 'element-plus'

// 数据列表
const tableData = ref<any[]>([])
const loading = ref(false)

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
  supplierId: '',
  dateRange: [] as string[]
})

// 下拉数据
const suppliers = ref<any[]>([])
const purchaseOrders = ref<any[]>([])
const warehouses = ref<any[]>([])
const products = ref<any[]>([])

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 对话框
const dialogVisible = ref(false)
const viewDrawer = ref(false)
const currentInbound = ref<any>(null)

// 明细列显隐控制
const visibleColumns = reactive({
  spec: true,
  unit: true,
  plannedQty: true,
  taxRate: true
})
const dialogTitle = ref('新增采购入库单')
const isEdit = ref(false)
const isView = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const helpDialogVisible = ref(false)

// 表单数据
const formData = reactive({
  id: '',
  orderNo: '',
  purchaseOrderId: '',
  supplierId: '',
  inboundDate: '',
  warehouseId: '',
  remark: '',
  logisticsCost: 0,
  discountAmount: 0,
  goodsAmount: 0,
  taxAmount: 0,
  finalAmount: 0,
  details: [] as any[]
})

// 获取采购入库单列表
const fetchPurchaseInbounds = async () => {
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
    if (searchForm.supplierId) {
      params.supplierId = searchForm.supplierId
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    const response: any = await getPurchaseInbounds(params)
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
    console.error('获取采购入库单列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取供应商列表
const fetchSuppliers = async () => {
  try {
    const response: any = await getSuppliers({ page: 1, limit: 10000 })
    if (response.success) {
      suppliers.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取供应商列表失败:', error)
  }
}

// 获取采购订单列表
const fetchPurchaseOrders = async () => {
  try {
    const response: any = await getPurchaseOrders({ page: 1, limit: 1000, status: 'confirmed' })
    if (response.success) {
      purchaseOrders.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取采购订单列表失败:', error)
  }
}

// 获取仓库列表
const fetchWarehouses = async () => {
  try {
    const response: any = await getWarehouses({ page: 1, limit: 1000 })
    if (response.success) {
      warehouses.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取仓库列表失败:', error)
  }
}

// 获取物料列表
const fetchProducts = async () => {
  try {
    const response: any = await getProducts({ page: 1, limit: 10000 })
    if (response.success) {
      products.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取物料列表失败:', error)
  }
}

// 搜索物料
const searchProducts = (query: string) => {
  if (query) {
    const filtered = products.value.filter((product: any) =>
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.code.toLowerCase().includes(query.toLowerCase())
    )
    products.value = filtered
  } else {
      fetchProducts()
  }
}

// 添加明细行
const handleAddDetail = () => {
  formData.details.push({
    productId: '',
    plannedQty: 0,
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

// 明细变更
const handleDetailChange = (index: number) => {
  const item = formData.details[index]
  if (item.quantity && item.unitPrice) {
    item.amount = item.quantity * item.unitPrice
    item.taxRate = item.taxRate || 0
    item.taxAmount = (item.amount * item.taxRate) / 100
  }
  calculateAmounts()
}

// 产品变更
const handleProductChange = (productId: string, index: number) => {
  const product = products.value.find((p: any) => p.id === productId)
  if (product) {
    formData.details[index].unitPrice = Number(product.costPrice) || 0
    handleDetailChange(index)
  }
}

// 采购订单变更
const handleOrderChange = (orderId: string) => {
  const order = purchaseOrders.value.find((o: any) => o.id === orderId)
  if (order) {
    formData.supplierId = order.supplierId
    formData.details = (order.items || order.details || []).map((detail: any) => ({
      id: detail.id,
      productId: detail.productId,
      plannedQty: detail.quantity,
      quantity: 0,
      unitPrice: detail.unitPrice,
      taxRate: detail.taxRate || 0,
      taxAmount: detail.taxAmount || 0,
      amount: detail.amount || 0
    }))
    calculateAmounts()
  }
}

// 计算金额
const calculateAmounts = () => {
  let goodsAmount = 0
  let totalTaxAmount = 0
  
  for (const item of formData.details) {
    if (item.quantity && item.unitPrice) {
      item.amount = item.quantity * item.unitPrice
      item.taxRate = item.taxRate || 0
      item.taxAmount = (item.amount * item.taxRate) / 100
      goodsAmount += item.amount
      totalTaxAmount += item.taxAmount
    }
  }
  
  formData.goodsAmount = goodsAmount
  formData.taxAmount = totalTaxAmount
  const totalAmount = goodsAmount + totalTaxAmount + (formData.logisticsCost || 0)
  formData.finalAmount = totalAmount - (formData.discountAmount || 0)
}

// 获取物料属性
const getProductAttr = (productId: string, attr: string) => {
  const product = products.value.find((p: any) => p.id === productId)
  return product ? (product as any)[attr] || '-' : '-'
}

// 获取汇总
const getSummary = ({ columns }: any) => {
  calculateAmounts()
  const totalQty = formData.details.reduce((sum: number, d: any) => sum + (d.quantity || 0), 0)
  return columns.map((column: any, index: number) => {
    if (index === 0) {
      return '合计'
    }
    if (column.property === 'quantity') {
      return totalQty
    }
    if (column.property === 'amount') {
      return `¥${formatAmount(formData.goodsAmount)}`
    }
    return ''
  })
}

// 获取物料总额（查看用）
const getGoodsAmount = () => {
  if (!currentInbound.value) return 0
  return (currentInbound.value.items || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
}

// 获取税额（查看用）
const getTaxAmount = () => {
  if (!currentInbound.value) return 0
  return (currentInbound.value.items || []).reduce((sum: number, item: any) => sum + (item.taxAmount || 0), 0)
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchPurchaseInbounds()
}

// 重置搜索
const handleReset = () => {
  searchForm.orderNo = ''
  searchForm.status = ''
  searchForm.supplierId = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchPurchaseInbounds()
}

// 新增
const handleCreate = async () => {
  dialogTitle.value = '新增采购入库单'
  isEdit.value = false
  isView.value = false
  resetForm()

  // 按需加载数据，确保必要数据已加载
  if (!suppliers.value.length) {
    await fetchSuppliers()
  }
  if (!products.value.length) {
    await fetchProducts()
  }
  if (!warehouses.value.length) {
    await fetchWarehouses()
  }
  if (!purchaseOrders.value.length) {
    await fetchPurchaseOrders()
  }

  // 设置默认仓库
  try {
    const res: any = await getDefaultWarehouse()
    if (res.success && res.data?.id) {
      formData.warehouseId = res.data.id
    }
  } catch (e) {
    console.error('获取默认仓库失败:', e)
  }

  // 默认添加一行明细
  handleAddDetail()

  dialogVisible.value = true

  // 打开时生成编号
  try {
    const res = await generateNextNumber('purchase_inbound') as any
    if (res.success && res.data?.number) {
      formData.orderNo = res.data.number
    }
  } catch (e) {
    console.error('生成编号失败:', e)
  }
}

// 查看
const handleView = async (row: any) => {
  try {
    const response: any = await getPurchaseInboundById(row.id)
    if (response.success) {
      const data = response.data
      // 确保明细数据正确映射
      if (!data.items && data.details) {
        data.items = data.details
      }
      currentInbound.value = data
      viewDrawer.value = true
    }
  } catch (error) {
    console.error('获取采购入库单详情失败:', error)
    ElMessage.error('获取采购入库单详情失败')
  }
}

// 编辑
const handleEdit = async (row: any) => {
  dialogTitle.value = '编辑采购入库单'
  isEdit.value = true
  isView.value = false
  try {
    if (!suppliers.value.length) {
      await fetchSuppliers()
    }
    if (!products.value.length) {
      await fetchProducts()
    }
    if (!warehouses.value.length) {
      await fetchWarehouses()
    }
    if (!purchaseOrders.value.length) {
      await fetchPurchaseOrders()
    }

    const response: any = await getPurchaseInboundById(row.id)
    if (response.success) {
      const inbound = response.data
      Object.assign(formData, {
        id: inbound.id,
        orderNo: inbound.inboundNo,
        purchaseOrderId: inbound.orderId,
        supplierId: inbound.order?.supplier?.id || '',
        inboundDate: inbound.inboundDate,
        warehouseId: inbound.warehouseId,
        remark: inbound.remark || '',
        logisticsCost: inbound.logisticsCost || 0,
        discountAmount: inbound.discountAmount || 0,
        goodsAmount: 0,
        taxAmount: 0,
        finalAmount: inbound.finalAmount || inbound.totalAmount || 0,
        details: (inbound.items || inbound.details || []).map((item: any) => ({
          id: item.id,
          productId: item.productId,
          plannedQty: item.plannedQty || 0,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
          taxAmount: item.taxAmount || 0,
          amount: item.amount
        }))
      })
      calculateAmounts()
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取采购入库单详情失败:', error)
    ElMessage.error('获取采购入库单详情失败')
  }
}

// 复制
const handleCopy = async (row: any) => {
  await handleEdit(row)
  isEdit.value = false
  isView.value = false
  formData.id = ''
  formData.orderNo = ''
  formData.purchaseOrderId = ''
  dialogTitle.value = '复制采购入库单'
  
  // 重新生成编号
  try {
    const res = await generateNextNumber('purchase_inbound') as any
    if (res.success && res.data?.number) {
      formData.orderNo = res.data.number
    }
  } catch (e) {
    console.error('生成编号失败:', e)
  }
}

// 保存草稿
const handleSaveDraft = async () => {
  await doSubmit(false)
}

// 提交单据
const handleSubmit = async () => {
  await doSubmit(true)
}

// 实际提交
const doSubmit = async (isConfirm: boolean) => {
  if (formData.details.length === 0) {
    ElMessage.warning('请至少添加一条明细')
    return
  }

  try {
    // 验证明细
    for (const detail of formData.details) {
      if (!detail.productId) {
        ElMessage.warning('请选择物料')
        return
      }
      if (!detail.quantity || detail.quantity <= 0) {
        ElMessage.warning('入库数量必须大于0')
        return
      }
    }

    submitLoading.value = true

    // 构建提交数据 - 注意API期望的参数名称是 orderId 而不是 purchaseOrderId
    const submitData: any = {
      inboundNo: formData.orderNo,
      orderId: formData.purchaseOrderId || undefined,
      inboundDate: formData.inboundDate,
      warehouseId: formData.warehouseId,
      remark: formData.remark,
      logisticsCost: formData.logisticsCost,
      details: formData.details.map(detail => ({
        productId: detail.productId,
        quantity: detail.quantity,
        unitPrice: detail.unitPrice,
        taxRate: detail.taxRate || 0,
        taxAmount: detail.taxAmount || 0,
        amount: detail.amount,
        plannedQty: detail.plannedQty || 0
      }))
    }

    if (isEdit.value) {
      await updatePurchaseInbound(formData.id, submitData)
      ElMessage.success('更新成功')
    } else {
      try {
        const res = await createPurchaseInbound(submitData) as any
        if (res.success) {
          // 如果需要直接确认，则调用确认接口
          if (isConfirm) {
            await confirmPurchaseInbound(res.data.id)
            ElMessage.success('入库成功')
          } else {
            ElMessage.success('创建成功')
          }
          dialogVisible.value = false
          fetchPurchaseInbounds()
        }
      } catch (error: any) {
        // 如果编号冲突，重新生成编号并重试
        if (error?.response?.data?.message?.includes('编号已存在')) {
          console.log('编号冲突，重新生成...')
          const res = await generateNextNumber('purchase_inbound') as any
          if (res.success && res.data?.number) {
            formData.orderNo = res.data.number
            submitData.inboundNo = res.data.number
            // 重试保存
            const retryRes = await createPurchaseInbound(submitData) as any
            if (retryRes.success) {
              // 如果需要直接确认，则调用确认接口
              if (isConfirm) {
                await confirmPurchaseInbound(retryRes.data.id)
                ElMessage.success('入库成功')
              } else {
                ElMessage.success('创建成功')
              }
              dialogVisible.value = false
              fetchPurchaseInbounds()
              return
            }
          }
        }
        throw error
      }
    }

    dialogVisible.value = false
    fetchPurchaseInbounds()
  } catch (error: any) {
    console.error('提交失败:', error)
    if (error?.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    }
  } finally {
    submitLoading.value = false
  }
}

// 审核入库单
const handleConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要审核采购入库单 "${row.inboundNo}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await confirmPurchaseInbound(row.id)
    ElMessage.success('审核成功')
    fetchPurchaseInbounds()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('审核采购入库单失败:', error)
    }
  }
}

// 反审核入库单
const handleUnconfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要反审核采购入库单 "${row.inboundNo}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await unconfirmPurchaseInbound(row.id)
    ElMessage.success('反审核成功')
    fetchPurchaseInbounds()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('反审核采购入库单失败:', error)
    }
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除采购入库单 "${row.inboundNo}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deletePurchaseInbound(row.id)
    ElMessage.success('删除成功')
    fetchPurchaseInbounds()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除采购入库单失败:', error)
    }
  }
}

// 获取状态类型
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
  return getPurchaseInboundStatusText(status)
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 格式化日期时间
const formatDateTime = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${formatDate(date)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

// 格式化金额
const formatAmount = (amount: any) => {
  if (amount === undefined || amount === null) return '0.00'
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  if (isNaN(numAmount)) return '0.00'
  return numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 重置表单
const resetForm = () => {
  formData.id = ''
  formData.orderNo = ''
  formData.purchaseOrderId = ''
  formData.supplierId = ''
  formData.inboundDate = formatDate(new Date())
  formData.warehouseId = ''
  formData.remark = ''
  formData.logisticsCost = 0
  formData.discountAmount = 0
  formData.goodsAmount = 0
  formData.taxAmount = 0
  formData.finalAmount = 0
  formData.details = []
}

// 关闭对话框
const handleDialogClose = () => {
  resetForm()
  isView.value = false
  isEdit.value = false
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 分页大小改变
const handleSizeChange = (val: number) => {
  pagination.limit = val
  pagination.page = 1
  fetchPurchaseInbounds()
}

// 当前页改变
const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchPurchaseInbounds()
}

// 帮助数据
const helpData = {
  operations: [
    {
      title: '新增采购入库单',
      steps: [
        '点击"新增入库单"按钮',
        '选择入库仓库',
        '添加入库明细，选择物料和数量',
        '设置入库日期和备注',
        '点击"保存草稿"保存或"提交单据"直接审核'
      ]
    },
    {
      title: '关联采购订单',
      steps: [
        '在新增入库单时选择关联的采购订单',
        '系统会自动带入订单的物料明细',
        '修改入库数量',
        '审核入库'
      ]
    },
    {
      title: '审核入库单',
      steps: [
        '在入库单列表中找到草稿状态的入库单',
        '点击"审核"按钮',
        '审核后库存会相应增加'
      ]
    }
  ],
  notices: [
    '入库数量必须与采购订单数量一致',
    '确认入库单会增加库存',
    '已审核的入库单不能直接修改',
    '可以关联采购订单自动生成入库单',
    '支持部分入库'
  ],
  tips: [
    '可以使用采购订单快速入库功能',
    '支持批量入库操作',
    '入库单审核后可反审核',
    '可以按供应商、状态、日期等条件筛选入库单'
  ],
  shortcuts: [
    { key: 'Ctrl+N', description: '新增入库单' },
    { key: 'Ctrl+S', description: '保存草稿' },
    { key: 'F5', description: '刷新列表' }
  ],
  version: '1.0.0',
  lastUpdate: '2025-05-28',
  changes: [
    '新增采购入库单功能',
    '支持关联采购订单',
    '新增帮助文档功能',
    '优化新增/编辑界面升级'
  ]
}

// 导出
const handleExport = () => {
  ElMessage.info('导出功能开发中')
}

// 打开帮助
const handleHelp = () => {
  helpDialogVisible.value = true
}

// 初始化
onMounted(async () => {
  // 加载供应商列表用于搜索
  await fetchSuppliers()
  // 只加载列表数据，其他数据按需加载
  await fetchPurchaseInbounds()
})
</script>

<style scoped>
.purchase-inbound-page {
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

.search-card :deep(.el-select) {
  width: 100%;
}

.search-card :deep(.el-select .el-input__wrapper) {
  width: 100%;
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
  justify-content: flex-end;
  padding: 16px;
}

.inbound-form {
  padding: 0 10px;
}

.form-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.section-title .el-icon {
  margin-right: 8px;
  color: #409eff;
}

.details-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
}

.total-amount :deep(.el-input__wrapper) {
  background-color: #f0f9eb;
}

.total-amount :deep(.el-input__inner) {
  color: #67c23a;
  font-weight: 600;
}

.inbound-detail {
  padding: 0 20px 20px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.detail-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.detail-summary span {
  font-size: 14px;
  color: #606266;
}

.detail-summary .total {
  font-size: 16px;
  font-weight: 600;
  color: #f56c6c;
}

.detail-section p {
  margin: 0;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  color: #606266;
}

.amount {
  color: #67c23a;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}
</style>
