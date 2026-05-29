<template>
  <div class="stock-take-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>盘点单</span>
          <div class="header-actions">
            <el-button @click="handleHelp">
              <el-icon><QuestionFilled /></el-icon>
              帮助
            </el-button>
            <el-button type="primary" @click="handleCreate">
              <el-icon><Plus /></el-icon>
              新增盘点单
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="盘点单号" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px">
            <el-option label="草稿" value="draft" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="tableData" stripe border style="width: 100%" v-loading="loading">
        <el-table-column prop="takeNo" label="盘点单号" width="180" />
        <el-table-column label="仓库" width="150">
          <template #default="{ row }">
            {{ row.warehouse?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="盘点日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.takeDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalDiffQty" label="总差异数量" width="120" align="right">
          <template #default="{ row }">
            <span :class="row.totalDiffQty > 0 ? 'positive' : row.totalDiffQty < 0 ? 'negative' : ''">
              {{ row.totalDiffQty > 0 ? '+' : '' }}{{ row.totalDiffQty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="totalDiffCost" label="总差异金额" width="120" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.totalDiffCost) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button
              v-if="row.status === 'draft'"
              type="success"
              size="small"
              @click="handleConfirm(row)"
            >
              确认
            </el-button>
            <el-button
              v-if="row.status === 'draft'"
              type="danger"
              size="small"
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
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 盘点单详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`盘点单详情 - ${currentStockTake?.takeNo || ''}`"
      width="900px"
      @close="handleCloseDetailDialog"
    >
      <div class="detail-content">
        <!-- 基本信息 -->
        <div class="section-title">基本信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="盘点单号">{{ currentStockTake?.takeNo }}</el-descriptions-item>
          <el-descriptions-item label="仓库">{{ currentStockTake?.warehouse?.name }}</el-descriptions-item>
          <el-descriptions-item label="盘点日期">{{ currentStockTake?.takeDate ? formatDate(currentStockTake.takeDate) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag v-if="currentStockTake?.status" :type="getStatusType(currentStockTake.status)">
              {{ getStatusText(currentStockTake.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="总差异数量">
            <span v-if="currentStockTake?.totalDiffQty !== undefined" :class="currentStockTake.totalDiffQty > 0 ? 'positive' : currentStockTake.totalDiffQty < 0 ? 'negative' : ''">
              {{ currentStockTake.totalDiffQty > 0 ? '+' : '' }}{{ currentStockTake.totalDiffQty }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="总差异金额">{{ currentStockTake?.totalDiffCost !== undefined ? formatCurrency(currentStockTake.totalDiffCost) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentStockTake?.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 盘点明细 -->
        <div class="section-title">盘点明细</div>
        <el-table :data="detailItems" border max-height="400" style="margin-top: 16px">
          <el-table-column prop="productCode" label="物料编码" width="120" />
          <el-table-column prop="productName" label="物料名称" min-width="150" />
          <el-table-column prop="batchNo" label="批次号" width="120" v-if="hasBatchData" />
          <el-table-column prop="bookQty" label="账面数量" width="100" align="right" />
          <el-table-column prop="actualQty" label="实际数量" width="100" align="right" />
          <el-table-column prop="diffQty" label="差异数量" width="100" align="right">
            <template #default="{ row }">
              <span :class="row.diffQty > 0 ? 'positive' : row.diffQty < 0 ? 'negative' : ''">
                {{ row.diffQty > 0 ? '+' : '' }}{{ row.diffQty }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="unitCost" label="单位成本" width="100" align="right">
            <template #default="{ row }">
              {{ formatCurrency(row.unitCost) }}
            </template>
          </el-table-column>
          <el-table-column prop="diffCost" label="差异金额" width="120" align="right">
            <template #default="{ row }">
              {{ formatCurrency(row.diffCost) }}
            </template>
          </el-table-column>
          <el-table-column prop="snCount" label="SN码数量" width="100" align="right" v-if="hasSNData">
            <template #default="{ row }">
              <el-tag v-if="row.snCount > 0" size="small" type="success">{{ row.snCount }}个</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 新增盘点单对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      :title="createDialogTitle"
      width="900px"
      @close="createDialogVisible = false"
    >
      <el-form :model="createForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="盘点单号">
              <el-input v-model="createForm.takeNo" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="仓库" required>
              <el-select v-model="createForm.warehouseId" placeholder="请选择仓库" style="width: 100%">
                <el-option v-for="wh in warehouses" :key="wh.id" :label="wh.name" :value="wh.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="盘点日期">
              <el-date-picker v-model="createForm.takeDate" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="createForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 盘点明细 -->
      <div class="detail-toolbar" style="display: flex; align-items: center; justify-content: space-between;">
        <el-button type="primary" plain @click="addDetailRow">
          <el-icon><Plus /></el-icon>
          添加物料
        </el-button>
        <el-popover trigger="click" placement="bottom-end" :width="100">
          <template #reference>
            <el-button size="small" link type="primary">
              <el-icon><Setting /></el-icon>
              列设置
            </el-button>
          </template>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <el-checkbox v-model="visibleColumns.batchNo">批次号</el-checkbox>
            <el-checkbox v-model="visibleColumns.unitCost">单位成本</el-checkbox>
            <el-checkbox v-model="visibleColumns.diffCost">差异金额</el-checkbox>
          </div>
        </el-popover>
      </div>

      <el-table :data="createForm.details" border max-height="350" style="margin-top: 10px">
        <el-table-column label="物料编码" width="200">
          <template #default="{ row, $index }">
            <el-select
              v-model="row.productId"
              placeholder="选择物料"
              filterable
              @change="(val: string) => handleProductChange(val, $index)"
              style="width: 100%"
            >
              <el-option v-for="p in products" :key="p.id" :label="`${p.code} - ${p.name}`" :value="p.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="productName" label="物料名称" min-width="120" />
        <el-table-column prop="systemQty" label="账面数量" width="100" align="right">
          <template #default="{ row, $index }">
            <el-input-number v-model="row.systemQty" :min="0" controls-position="right" @change="() => calculateDiff($index)" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column prop="countQty" label="实盘数量" width="100" align="right">
          <template #default="{ row, $index }">
            <el-input-number v-model="row.countQty" :min="0" controls-position="right" @change="() => calculateDiff($index)" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="差异数量" width="100" align="right">
          <template #default="{ row }">
            <span :class="row.diffQty > 0 ? 'positive' : row.diffQty < 0 ? 'negative' : ''">
              {{ row.diffQty > 0 ? '+' : '' }}{{ row.diffQty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column v-if="visibleColumns.unitCost" prop="unitCost" label="单位成本" width="120" align="right">
              <template #default="{ row, $index }">
                <el-input-number v-model="row.unitCost" :min="0" :precision="2" controls-position="right" @change="() => calculateDiff($index)" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column v-if="visibleColumns.diffCost" label="差异金额" width="120" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.diffCost) }}
          </template>
        </el-table-column>
        <el-table-column v-if="visibleColumns.batchNo" label="批次号" width="130">
              <template #default="{ row }">
                <el-input v-model="row.batchNo" placeholder="批次号" />
              </template>
            </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ $index }">
            <el-button type="danger" size="small" text @click="removeDetailRow($index)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreateSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      module-name="盘点单"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, QuestionFilled, Setting } from '@element-plus/icons-vue'
import { getStockTakes, getStockTakeDetail, createStockTake, confirmStockTake, deleteStockTake } from '@/api/stock-take'
import { getWarehouses } from '@/api/warehouse'
import { getProducts } from '@/api/product'
import { generateNextNumber } from '@/api/numbering-rule'
import { getStatusColor, getStockTakeStatusText } from '@/utils/status.util'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'
import type { FormInstance, FormRules } from 'element-plus'

interface StockTake {
  id: string
  takeNo: string
  warehouseId: string
  warehouse?: { id: string; name: string }
  takeDate: string
  status: string
  totalDiffQty: number
  totalDiffCost: number
  remark?: string
}

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 数据列表
const tableData = ref<StockTake[]>([])
const loading = ref(false)
const warehouses = ref<any[]>([])
const products = ref<any[]>([])

// 详情对话框
const detailDialogVisible = ref(false)
const currentStockTake = ref<StockTake | null>(null)
const detailItems = ref<any[]>([])

// 创建对话框
const createDialogVisible = ref(false)

// 明细列显隐控制
const visibleColumns = reactive({
  batchNo: true,
  unitCost: true,
  diffCost: true
})
const createDialogTitle = ref('新增盘点单')
const createLoading = ref(false)
const helpDialogVisible = ref(false)
const createForm = reactive({
  takeNo: '',
  warehouseId: '',
  takeDate: new Date(),
  remark: '',
  details: [] as any[]
})

// 是否有批次数据
const hasBatchData = computed(() => {
  return detailItems.value.some((item: any) => item.batchNo)
})

// 是否有SN码数据
const hasSNData = computed(() => {
  return detailItems.value.some((item: any) => item.snCount > 0)
})

// 获取列表数据
const fetchList = async () => {
  try {
    loading.value = true
    const params: any = {
      page: pagination.page,
      limit: pagination.limit
    }

    if (searchForm.keyword) {
      params.takeNo = searchForm.keyword
    }
    if (searchForm.status) {
      params.status = searchForm.status
    }

    const response = await getStockTakes(params) as any
    if (response.success) {
      tableData.value = response.data.items || []
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('获取盘点单列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取仓库列表
const fetchWarehouses = async () => {
  try {
    const response = await getWarehouses({ page: 1, limit: 100 }) as any
    if (response.success) {
      warehouses.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取仓库列表失败:', error)
  }
}

// 获取产品列表
const fetchProducts = async () => {
  try {
    const response = await getProducts({ page: 1, limit: 10000 }) as any
    if (response.success) {
      products.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取产品列表失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchList()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: ''
  })
  pagination.page = 1
  fetchList()
}

// 新增盘点单
const handleCreate = async () => {
  createForm.takeNo = ''
  createForm.warehouseId = ''
  createForm.takeDate = new Date()
  createForm.remark = ''
  createForm.details = []
  createDialogVisible.value = true

  try {
    const res = await generateNextNumber('stock_take') as any
    if (res.success && res.data?.number) {
      createForm.takeNo = res.data.number
    }
  } catch (e) {
    console.error('生成编号失败:', e)
  }
}

// 添加明细行
const addDetailRow = () => {
  createForm.details.push({
    productId: '',
    productCode: '',
    productName: '',
    systemQty: 0,
    countQty: 0,
    diffQty: 0,
    unitCost: 0,
    diffCost: 0,
    batchNo: ''
  })
}

// 删除明细行
const removeDetailRow = (index: number) => {
  createForm.details.splice(index, 1)
}

// 选择产品
const handleProductSelect = (index: number, product: any) => {
  if (product) {
    createForm.details[index].productId = product.id
    createForm.details[index].productCode = product.code
    createForm.details[index].productName = product.name
    createForm.details[index].unitCost = Number(product.costPrice) || 0
    calculateDiff(index)
  }
}

// 产品变更
const handleProductChange = (productId: string, index: number) => {
  const product = products.value.find(p => p.id === productId)
  if (product) {
    createForm.details[index].productCode = product.code
    createForm.details[index].productName = product.name
    createForm.details[index].unitCost = Number(product.costPrice) || 0
  }
}

// 计算差异
const calculateDiff = (index: number) => {
  const detail = createForm.details[index]
  detail.diffQty = (detail.countQty || 0) - (detail.systemQty || 0)
  detail.diffCost = detail.diffQty * (detail.unitCost || 0)
}

// 提交创建
const handleCreateSubmit = async () => {
  if (!createForm.warehouseId) {
    ElMessage.warning('请选择仓库')
    return
  }
  if (createForm.details.length === 0) {
    ElMessage.warning('请添加盘点明细')
    return
  }

  const invalidDetail = createForm.details.find(d => !d.productId)
  if (invalidDetail) {
    ElMessage.warning('盘点明细中的商品不能为空')
    return
  }

  createLoading.value = true
  try {
    const res = await createStockTake({
      takeNo: createForm.takeNo,
      warehouseId: createForm.warehouseId,
      takeDate: createForm.takeDate,
      remark: createForm.remark,
      details: createForm.details.map(d => ({
        productId: d.productId,
        systemQty: d.systemQty || 0,
        countQty: d.countQty || 0,
        unitCost: d.unitCost || 0,
        batchNo: d.batchNo || undefined
      }))
    }) as any

    if (res.success) {
      ElMessage.success('创建成功')
      createDialogVisible.value = false
      fetchList()
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '创建失败')
  } finally {
    createLoading.value = false
  }
}

// 查看详情
const handleView = async (row: StockTake) => {
  try {
    const response = await getStockTakeDetail(row.id) as any
    if (response.success) {
      currentStockTake.value = response.data.stockTake
      detailItems.value = response.data.details || []
      detailDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取盘点单详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}

// 确认盘点单
const handleConfirm = async (row: StockTake) => {
  try {
    await ElMessageBox.confirm(
      `确认盘点单「${row.takeNo}」吗？确认后将根据盘盈盘亏调整库存。`,
      '确认盘点单',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )

    const response = await confirmStockTake(row.id) as any
    if (response.success) {
      ElMessage.success('确认成功')
      fetchList()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('确认盘点单失败:', error)
      ElMessage.error(error.response?.data?.message || '确认失败')
    }
  }
}

// 删除盘点单
const handleDelete = async (row: StockTake) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除盘点单「${row.takeNo}」吗？`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )

    const response = await deleteStockTake(row.id) as any
    if (response.success) {
      ElMessage.success('删除成功')
      fetchList()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除盘点单失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// 关闭详情对话框
const handleCloseDetailDialog = () => {
  detailDialogVisible.value = false
  currentStockTake.value = null
  detailItems.value = []
}

// 分页大小改变
const handleSizeChange = (val: number) => {
  pagination.limit = val
  pagination.page = 1
  fetchList()
}

// 当前页改变
const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchList()
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

// 格式化货币
const formatCurrency = (value: number): string => {
  return `¥${(value || 0).toFixed(2)}`
}

// 获取状态标签类型
const getStatusType = (status: string): string => {
  return getStatusColor(status)
}

const getStatusText = (status: string): string => {
  return getStockTakeStatusText(status)
}

// 帮助数据
const helpData = {
  operations: [
    {
      title: '新增盘点单',
      steps: [
        '点击"新增盘点单"按钮',
        '选择盘点仓库',
        '设置盘点日期',
        '添加盘点明细，选择物料',
        '输入账面数量和实际数量',
        '系统自动计算差异数量',
        '填写备注信息',
        '点击"确定"保存或确认'
      ]
    },
    {
      title: '确认盘点单',
      steps: [
        '在盘点单列表中找到草稿状态的盘点单',
        '点击"确认"按钮',
        '确认后库存会根据盘点结果进行调整'
      ]
    }
  ],
  notices: [
    '盘点单用于定期或不定期的库存盘点',
    '确认盘点单会根据盘点结果调整库存',
    '已确认的盘点单不能直接修改',
    '盘点差异会影响库存数量和成本',
    '建议定期进行库存盘点确保账实相符'
  ],
  tips: [
    '盘点前建议先暂停相关仓库的出入库操作',
    '可以按仓库、物料类别等条件进行盘点',
    '盘点差异需要及时查明原因',
    '盘点单确认后会自动生成库存调整记录',
    '可以按状态、日期等条件筛选盘点单'
  ],
  shortcuts: [
    { key: 'Ctrl+N', description: '新增盘点单' },
    { key: 'Ctrl+S', description: '保存草稿' },
    { key: 'F5', description: '刷新列表' }
  ],
  version: '1.0.0',
  lastUpdate: '2025-05-28',
  changes: [
    '新增盘点单功能',
    '支持库存盘点和调整',
    '新增帮助文档功能'
  ]
}

// 打开帮助
const handleHelp = () => {
  helpDialogVisible.value = true
}

// 初始化
onMounted(() => {
  fetchWarehouses()
  fetchProducts()
  fetchList()
})
</script>

<style scoped>
.stock-take-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}

.detail-toolbar {
  margin: 10px 0;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 20px 0 10px 0;
}

.positive {
  color: #67c23a;
  font-weight: 600;
}

.negative {
  color: #f56c6c;
  font-weight: 600;
}
</style>