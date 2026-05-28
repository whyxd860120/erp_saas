<template>
  <div class="inventory-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">库存管理</h2>
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="库存查询" name="query" />
          <el-tab-pane label="库调调整" name="adjust" />
          <el-tab-pane label="库存盘点" name="check" />
          <el-tab-pane label="预警设置" name="warning" />
        </el-tabs>
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
        <el-button type="primary" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon"><el-icon><Box /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ formatNumber(stats.totalSKUs) }}</span>
            <span class="stat-label">物料种类</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon warning"><el-icon><Warning /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.lowStock }}</span>
            <span class="stat-label">低库存预警</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon amount"><el-icon><Money /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.totalValue) }}</span>
            <span class="stat-label">库存总值</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon warehouse"><el-icon><OfficeBuilding /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.totalStock }}</span>
            <span class="stat-label">库存总量</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="物料" class="search-item">
              <el-input v-model="searchForm.keyword" placeholder="编码/名称/规格" clearable />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="仓库" class="search-item">
              <el-select v-model="searchForm.warehouseId" placeholder="请选择仓库" clearable filterable>
                <el-option
                  v-for="warehouse in warehouses"
                  :key="warehouse.id"
                  :label="warehouse.name"
                  :value="warehouse.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="分类" class="search-item">
              <el-select v-model="searchForm.categoryId" placeholder="请选择分类" clearable>
                <el-option
                  v-for="category in categories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="状态" class="search-item">
              <el-select v-model="searchForm.stockStatus" placeholder="库存状态" clearable>
                <el-option label="正常" value="normal" />
                <el-option label="低库存" value="low" />
                <el-option label="超库存" value="high" />
                <el-option label="零库存" value="zero" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="search-actions">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button link type="primary" @click="showAdvanced = !showAdvanced">
            {{ showAdvanced ? '收起' : '展开' }}筛选
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
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="物料信息" min-width="280" fixed>
          <template #default="{ row }">
            <div class="product-info">
              <el-image
                v-if="row.product?.image"
                :src="row.product.image"
                class="product-image"
                fit="cover"
              />
              <div v-else class="product-image-placeholder">
                <el-icon><Picture /></el-icon>
              </div>
              <div class="product-detail">
                <div class="product-name">{{ row.product?.name || '-' }}</div>
                <div class="product-code">{{ row.product?.code || '-' }}</div>
                <div class="product-spec">{{ row.product?.spec || '-' }} / {{ row.product?.unit || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="仓库" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.warehouse?.name || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            {{ row.product?.category?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="即时库存" width="120" align="right">
          <template #default="{ row }">
            <span :class="getStockClass(row)">
              {{ formatNumber(row.quantity) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="采购在途" width="120" align="right">
          <template #default="{ row }">
            {{ formatNumber(row.purchaseInTransit || 0) }}
          </template>
        </el-table-column>
        <el-table-column label="销售在途" width="120" align="right">
          <template #default="{ row }">
            {{ formatNumber(row.salesInTransit || 0) }}
          </template>
        </el-table-column>
        <el-table-column label="可用库存" width="120" align="right">
          <template #default="{ row }">
            <span :class="getStockClass(row)">
              {{ formatNumber(row.availableQuantity || (row.quantity + (row.purchaseInTransit || 0) - (row.salesInTransit || 0))) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="库存状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStockStatusType(row)" size="small">
              {{ getStockStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="成本价" width="100" align="right">
          <template #default="{ row }">
            ¥{{ formatAmount(row.costPrice) }}
          </template>
        </el-table-column>
        <el-table-column label="库存价值" width="120" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatAmount(row.quantity * row.costPrice) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
            <el-button link type="warning" size="small" @click="handleAdjust(row)">调整</el-button>
            <el-button link type="success" size="small" @click="handleTransfer(row)">调拨</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <div class="batch-actions" v-if="selectedRows.length">
          <span>已选择 {{ selectedRows.length }} 项</span>
          <el-button size="small" @click="handleBatchAdjust" :loading="batchLoading">批量调整</el-button>
          <el-button size="small" type="primary" @click="handleBatchExport">导出选中</el-button>
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

    <!-- 库存调整对话框 -->
    <el-dialog
      v-model="adjustDialogVisible"
      title="库存调整"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="adjustForm" label-width="100px">
        <el-form-item label="物料">
          <div class="adjust-product">
            <span class="name">{{ adjustForm.productName }}</span>
            <span class="code">{{ adjustForm.productCode }}</span>
          </div>
        </el-form-item>
        <el-form-item label="仓库">
          <span>{{ adjustForm.warehouseName }}</span>
        </el-form-item>
        <el-form-item label="当前库存">
          <span class="current-stock">{{ adjustForm.currentQty }}</span>
        </el-form-item>
        <el-form-item label="调整类型" required>
          <el-radio-group v-model="adjustForm.adjustType">
            <el-radio label="increase">增加</el-radio>
            <el-radio label="decrease">减少</el-radio>
            <el-radio label="set">设为</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="调整数量" required>
          <el-input-number
            v-model="adjustForm.adjustQty"
            :min="0"
            :precision="0"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="调整后库存">
          <span :class="['result-stock', getResultStockClass()]">
            {{ getResultStock() }}
          </span>
        </el-form-item>
        <el-form-item label="调整原因">
          <el-select v-model="adjustForm.reason" placeholder="请选择调整原因" style="width: 100%;">
            <el-option label="盘点调整" value="check" />
            <el-option label="损溢调整" value="loss" />
            <el-option label="其他调整" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="adjustForm.remark" type="textarea" :rows="3" placeholder="请输入备注信息" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdjustSubmit" :loading="adjustLoading">确认调整</el-button>
      </template>
    </el-dialog>

    <!-- 库存详情抽屉 -->
    <el-drawer v-model="detailDrawer" title="库存详情" size="600px">
      <div class="inventory-detail" v-if="currentInventory">
        <!-- 物料信息 -->
        <div class="detail-section">
          <h4>物料信息</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="物料编码">{{ currentInventory.product?.code }}</el-descriptions-item>
            <el-descriptions-item label="物料名称">{{ currentInventory.product?.name }}</el-descriptions-item>
            <el-descriptions-item label="规格">{{ currentInventory.product?.spec || '-' }}</el-descriptions-item>
            <el-descriptions-item label="单位">{{ currentInventory.product?.unit || '-' }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ currentInventory.product?.category?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="品牌">{{ currentInventory.product?.brand?.name || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 库存信息 -->
        <div class="detail-section">
          <h4>库存信息</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="仓库">{{ currentInventory.warehouse?.name }}</el-descriptions-item>
            <el-descriptions-item label="库存数量">
              <span :class="getStockClass(currentInventory)">
                {{ formatNumber(currentInventory.quantity) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="成本价">¥{{ formatAmount(currentInventory.costPrice) }}</el-descriptions-item>
            <el-descriptions-item label="库存价值">
              <span class="amount">¥{{ formatAmount(currentInventory.quantity * currentInventory.costPrice) }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 库存流水 -->
        <div class="detail-section">
          <h4>库存流水（最近10条）</h4>
          <el-table :data="currentInventory.flows || []" border size="small">
            <el-table-column prop="flowNo" label="单据编号" width="150" />
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getFlowTypeColor(row.type)" size="small">
                  {{ getFlowTypeText(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="数量" width="80" align="right">
              <template #default="{ row }">
                <span :class="row.type === 'in' ? 'text-success' : 'text-danger'">
                  {{ row.type === 'in' ? '+' : '-' }}{{ row.quantity }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="100" />
            <el-table-column prop="createdAt" label="时间" width="150">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-drawer>

    <!-- 库存调拨对话框 -->
    <el-dialog
      v-model="transferDialogVisible"
      title="库存调拨"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="transferForm" label-width="100px">
        <el-form-item label="物料">
          <div class="adjust-product">
            <span class="name">{{ transferForm.productName }}</span>
            <span class="code">{{ transferForm.productCode }}</span>
          </div>
        </el-form-item>
        <el-form-item label="源仓库">
          <span>{{ transferForm.sourceWarehouseName }}</span>
        </el-form-item>
        <el-form-item label="目标仓库" required>
          <el-select v-model="transferForm.targetWarehouseId" placeholder="请选择目标仓库" style="width: 100%;">
            <el-option
              v-for="warehouse in availableWarehouses"
              :key="warehouse.id"
              :label="warehouse.name"
              :value="warehouse.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调拨数量" required>
          <el-input-number
            v-model="transferForm.quantity"
            :min="1"
            :max="transferForm.availableQty"
            :precision="0"
            style="width: 100%;"
          />
          <div class="form-tip">可用库存：{{ transferForm.availableQty }}</div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="transferForm.remark" type="textarea" :rows="3" placeholder="请输入备注信息" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="transferDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleTransferSubmit" :loading="transferLoading">确认调拨</el-button>
      </template>
    </el-dialog>

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      :module-name="activeTab === 'query' ? '库存查询' : '库存操作'"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh, Download, Box, Warning, Money, OfficeBuilding, Picture, QuestionFilled
} from '@element-plus/icons-vue'
import { getInventory, getInventorySummary, adjustInventory, transferInventory } from '@/api/inventory'
import { getWarehouses } from '@/api/warehouse'
import { getCategories } from '@/api/product'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'

// 状态
const loading = ref(false)
const batchLoading = ref(false)
const adjustLoading = ref(false)
const transferLoading = ref(false)
const activeTab = ref('query')
const showAdvanced = ref(false)
const selectedRows = ref<any[]>([])
const adjustDialogVisible = ref(false)
const detailDrawer = ref(false)
const transferDialogVisible = ref(false)
const currentInventory = ref<any>(null)
const helpDialogVisible = ref(false)

// 数据
const tableData = ref<any[]>([])
const warehouses = ref<any[]>([])
const categories = ref<any[]>([])
const partners = ref<any[]>([])
const accounts = ref<any[]>([])
const orders = ref<any[]>([])

// 统计
const stats = ref({
  totalSKUs: 0,
  lowStock: 0,
  totalValue: 0,
  totalStock: 0
})

// 搜索表单
const searchForm = reactive({
  keyword: '',
  warehouseId: '',
  categoryId: '',
  stockStatus: ''
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 调整表单
const adjustForm = reactive({
  id: '',
  productId: '',
  productName: '',
  productCode: '',
  warehouseId: '',
  warehouseName: '',
  currentQty: 0,
  adjustType: 'increase',
  adjustQty: 0,
  reason: '',
  remark: ''
})

// 调拨表单
const transferForm = reactive({
  id: '',
  productId: '',
  productName: '',
  productCode: '',
  sourceWarehouseId: '',
  sourceWarehouseName: '',
  targetWarehouseId: '',
  quantity: 1,
  availableQty: 0,
  remark: ''
})

// 可用仓库
const availableWarehouses = computed(() => {
  return warehouses.value.filter(w => w.id !== transferForm.sourceWarehouseId)
})

// 格式化数字
const formatNumber = (num: number) => {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString()
}

// 格式化金额
const formatAmount = (amount: number) => {
  if (amount === undefined || amount === null) return '0.00'
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 格式化日期时间
const formatDateTime = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 获取库存样式
const getStockClass = (row: any) => {
  if (!row.quantity || row.quantity <= 0) return 'stock-zero'
  return ''
}

// 获取库存状态类型
const getStockStatusType = (row: any) => {
  if (!row.quantity || row.quantity <= 0) return 'info'
  return 'success'
}

// 获取库存状态文本
const getStockStatusText = (row: any) => {
  if (!row.quantity || row.quantity <= 0) return '缺货'
  return '正常'
}

// 获取调整后库存
const getResultStock = () => {
  if (adjustForm.adjustType === 'set') {
    return adjustForm.adjustQty
  } else if (adjustForm.adjustType === 'increase') {
    return adjustForm.currentQty + adjustForm.adjustQty
  } else {
    return Math.max(0, adjustForm.currentQty - adjustForm.adjustQty)
  }
}

// 获取结果库存样式
const getResultStockClass = () => {
  const result = getResultStock()
  if (result <= 0) return 'stock-zero'
  return ''
}

// 获取流水类型颜色
const getFlowTypeColor = (type: string) => {
  const map: Record<string, string> = {
    in: 'success',
    out: 'danger',
    adjust: 'warning'
  }
  return map[type] || ''
}

// 获取流水类型文本
const getFlowTypeText = (type: string) => {
  const map: Record<string, string> = {
    in: '入库',
    out: '出库',
    adjust: '调整'
  }
  return map[type] || type
}

// 获取数据
const fetchData = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      keyword: searchForm.keyword,
      warehouseId: searchForm.warehouseId,
      categoryId: searchForm.categoryId,
      stockStatus: searchForm.stockStatus
    }
    const response: any = await getInventory(params)
    if (response.success) {
      tableData.value = response.data.items || []
      pagination.total = response.data.total
      // 更新统计
      stats.value = {
        totalSKUs: response.data.totalSKUs || response.data.total,
        lowStock: response.data.lowStock || 0,
        totalValue: response.data.totalValue || 0,
        totalStock: response.data.totalStock || 0
      }
    }
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取仓库
const fetchWarehouses = async () => {
  try {
    const response: any = await getWarehouses({ page: 1, limit: 1000 })
    if (response.success) {
      warehouses.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取仓库失败:', error)
  }
}

// 获取分类
const fetchCategories = async () => {
  try {
    const response: any = await getCategories()
    if (response.success) {
      categories.value = response.data || []
    }
  } catch (error) {
    console.error('获取分类失败:', error)
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
  searchForm.warehouseId = ''
  searchForm.categoryId = ''
  searchForm.stockStatus = ''
  pagination.page = 1
  fetchData()
}

// Tab切换
const handleTabChange = () => {
  handleReset()
}

// 刷新
const handleRefresh = () => {
  fetchData()
}

// 选中行
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 查看
const handleView = async (row: any) => {
  currentInventory.value = row
  detailDrawer.value = true
}

// 调整
const handleAdjust = (row: any) => {
  adjustForm.id = row.id
  adjustForm.productId = row.productId
  adjustForm.productName = row.product?.name
  adjustForm.productCode = row.product?.code
  adjustForm.warehouseId = row.warehouseId
  adjustForm.warehouseName = row.warehouse?.name
  adjustForm.currentQty = row.quantity
  adjustForm.adjustType = 'increase'
  adjustForm.adjustQty = 0
  adjustForm.reason = ''
  adjustForm.remark = ''
  adjustDialogVisible.value = true
}

// 调拨
const handleTransfer = (row: any) => {
  transferForm.id = row.id
  transferForm.productId = row.productId
  transferForm.productName = row.product?.name
  transferForm.productCode = row.product?.code
  transferForm.sourceWarehouseId = row.warehouseId
  transferForm.sourceWarehouseName = row.warehouse?.name
  transferForm.targetWarehouseId = ''
  transferForm.quantity = 1
  transferForm.availableQty = row.quantity
  transferForm.remark = ''
  transferDialogVisible.value = true
}

// 提交调整
const handleAdjustSubmit = async () => {
  if (adjustForm.adjustQty <= 0 && adjustForm.adjustType !== 'set') {
    ElMessage.warning('调整数量必须大于0')
    return
  }
  try {
    adjustLoading.value = true
    const resultQty = getResultStock()
    await adjustInventory(adjustForm.id, {
      quantity: adjustForm.adjustType === 'set' ? adjustForm.adjustQty : adjustForm.adjustQty,
      type: adjustForm.adjustType as 'increase' | 'decrease' | 'set',
      reason: adjustForm.reason,
      remark: adjustForm.remark
    })
    ElMessage.success('库存调整成功')
    adjustDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('库存调整失败:', error)
    ElMessage.error('库存调整失败')
  } finally {
    adjustLoading.value = false
  }
}

// 提交调拨
const handleTransferSubmit = async () => {
  if (!transferForm.targetWarehouseId) {
    ElMessage.warning('请选择目标仓库')
    return
  }
  if (transferForm.quantity <= 0) {
    ElMessage.warning('调拨数量必须大于0')
    return
  }
  try {
    transferLoading.value = true
    await transferInventory(transferForm.id, {
      targetWarehouseId: transferForm.targetWarehouseId,
      quantity: transferForm.quantity,
      remark: transferForm.remark
    })
    ElMessage.success('库存调拨成功')
    transferDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('库存调拨失败:', error)
    ElMessage.error('库存调拨失败')
  } finally {
    transferLoading.value = false
  }
}

// 批量调整
const handleBatchAdjust = () => {
  ElMessage.info('批量调整功能开发中')
}

// 导出
const handleExport = () => {
  ElMessage.info('导出功能开发中')
}

// 批量导出
const handleBatchExport = () => {
  ElMessage.info('导出选中功能开发中')
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
  await Promise.all([fetchData(), fetchWarehouses(), fetchCategories()])
})

// 帮助数据
const helpData = computed(() => {
  if (activeTab.value === 'query') {
    return {
      operations: [
        {
          title: '查询库存',
          steps: [
            '选择查询条件：仓库、物料分类、物料编码/名称',
            '点击"查询"按钮或按回车键执行查询',
            '查看库存明细，包括即时库存、采购在途、销售在途、可用库存',
            '可以按物料编码、名称、仓库等条件进行筛选'
          ]
        },
        {
          title: '查看库存详情',
          steps: [
            '点击物料编码链接查看详细信息',
            '查看物料的库存变化历史',
            '查看物料的出入库记录'
          ]
        },
        {
          title: '导出库存数据',
          steps: [
            '设置查询条件筛选需要导出的数据',
            '点击"导出"按钮',
            '选择导出格式（Excel）',
            '下载导出的文件'
          ]
        }
      ],
      notices: [
        '即时库存：仓库中实际存在的库存数量',
        '采购在途：已采购但未入库的物料数量',
        '销售在途：已销售但未出库的物料数量',
        '可用库存：即时库存 + 采购在途 - 销售在途',
        '库存数据实时更新，建议定期刷新'
      ],
      tips: [
        '可以按F5键快速刷新数据',
        '支持批量选择物料进行操作',
        '可用库存为负数表示库存不足',
        '可以设置库存预警，当库存低于安全库存时提醒',
        '支持导出库存数据用于分析'
      ],
      shortcuts: [
        { key: 'F5', description: '刷新数据' },
        { key: 'Ctrl+E', description: '导出数据' },
        { key: 'Enter', description: '执行查询' }
      ],
      version: '1.0.0',
      lastUpdate: '2025-05-28',
      changes: [
        '新增可用库存计算',
        '优化查询性能',
        '增加库存预警功能'
      ]
    }
  } else {
    return {
      operations: [
        {
          title: '库存调整',
          steps: [
            '选择需要调整的库存记录',
            '点击"库存调整"按钮',
            '选择调整类型：盘盈或盘亏',
            '输入调整数量和原因',
            '点击"确认"提交调整'
          ]
        },
        {
          title: '库存调拨',
          steps: [
            '选择需要调拨的库存记录',
            '点击"库存调拨"按钮',
            '选择目标仓库',
            '输入调拨数量',
            '填写调拨原因',
            '点击"确认"提交调拨'
          ]
        }
      ],
      notices: [
        '库存调整会改变实际库存数量',
        '库存调拨不会改变总库存，只是在不同仓库间转移',
        '所有库存操作都会记录操作日志',
        '库存调整需要审核权限',
        '调拨数量不能超过可用库存'
      ],
      tips: [
        '定期进行库存盘点确保账实相符',
        '库存调整应该有充分的理由和记录',
        '调拨操作建议在库存充足时进行',
        '可以批量选择物料进行批量操作'
      ],
      shortcuts: [
        { key: 'F5', description: '刷新数据' },
        { key: 'Ctrl+A', description: '全选' }
      ],
      version: '1.0.0',
      lastUpdate: '2025-05-28'
    }
  }
})

// 打开帮助
const handleHelp = () => {
  helpDialogVisible.value = true
}
</script>

<style scoped>
.inventory-page {
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
.stat-card .stat-icon.warning {
  background: #fdf6ec;
  color: #E6A23C;
}
.stat-card .stat-icon.amount {
  background: #e8f5e9;
  color: #67C23A;
}
.stat-card .stat-icon.warehouse {
  background: #f0f9ff;
  color: #0084FF;
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
.search-card .advanced-search {
  margin-top: 12px;
}
.table-card {
  margin-bottom: 20px;
}
.table-card .product-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.table-card .product-image {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
}
.table-card .product-image-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}
.table-card .product-detail .product-name {
  font-weight: 600;
  color: #303133;
}
.table-card .product-detail .product-code {
  font-size: 12px;
  color: #909399;
}
.table-card .product-detail .product-spec {
  font-size: 12px;
  color: #606266;
}
.table-card .stock-range {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}
.table-card .stock-range .min {
  color: #E6A23C;
}
.table-card .stock-range .max {
  color: #67C23A;
}
.table-card .amount {
  font-weight: 600;
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
.adjust-product {
  display: flex;
  flex-direction: column;
}
.adjust-product .name {
  font-weight: 600;
  color: #303133;
}
.adjust-product .code {
  font-size: 12px;
  color: #909399;
}
.current-stock {
  font-size: 18px;
  font-weight: 700;
  color: #409EFF;
}
.result-stock {
  font-size: 18px;
  font-weight: 700;
  color: #67C23A;
}
.stock-zero {
  color: #909399;
}
.stock-low {
  color: #E6A23C;
}
.stock-high {
  color: #F56C6C;
}
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.inventory-detail .detail-section {
  margin-bottom: 24px;
}
.inventory-detail .detail-section h4 {
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
.inventory-detail .amount {
  font-weight: 600;
  color: #F56C6C;
}
.text-success {
  color: #67C23A;
}
.text-danger {
  color: #F56C6C;
}
</style>