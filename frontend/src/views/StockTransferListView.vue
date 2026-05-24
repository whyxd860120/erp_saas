<template>
  <div class="stock-transfer-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>调拨单</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新增调拨单
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="调拨单号" clearable @keyup.enter="handleSearch" />
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
        <el-table-column prop="transferNo" label="调拨单号" width="180" />
        <el-table-column label="调出仓库" width="150">
          <template #default="{ row }">
            {{ row.fromWarehouse?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="调入仓库" width="150">
          <template #default="{ row }">
            {{ row.toWarehouse?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="调拨日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.transferDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalQty" label="总数量" width="100" align="right" />
        <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.totalAmount) }}
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

    <!-- 创建对话框 -->
    <el-dialog v-model="createDialogVisible" :title="createDialogTitle" width="900px" @close="createDialogVisible = false">
      <el-form :model="createForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="单据编号">
              <el-input v-model="createForm.transferNo" placeholder="自动生成" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="调出仓库" required>
              <el-select v-model="createForm.fromWarehouseId" placeholder="请选择仓库" style="width: 100%" @change="handleFromWarehouseChange">
                <el-option v-for="wh in warehouses" :key="wh.id" :label="wh.name" :value="wh.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="调入仓库" required>
              <el-select v-model="createForm.toWarehouseId" placeholder="请选择仓库" style="width: 100%">
                <el-option v-for="wh in warehouses.filter(w => w.id !== createForm.fromWarehouseId)" :key="wh.id" :label="wh.name" :value="wh.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="调拨日期">
              <el-date-picker v-model="createForm.transferDate" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="备注">
              <el-input v-model="createForm.remark" placeholder="备注信息" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <el-divider content-position="left">调拨明细</el-divider>

      <el-button type="primary" size="small" @click="addDetailRow" style="margin-bottom: 10px">
        <el-icon><Plus /></el-icon> 添加明细
      </el-button>

      <el-table :data="createForm.details" border max-height="300" style="margin-bottom: 10px">
        <el-table-column label="物料" min-width="180">
          <template #default="{ row, $index }">
            <el-select
              v-model="createForm.details[$index].productId"
              placeholder="请选择物料"
              filterable
              style="width: 100%"
              @change="(val) => handleProductSelect($index, products.find(p => p.id === val))"
            >
              <el-option v-for="p in products" :key="p.id" :label="`${p.code} - ${p.name}`" :value="p.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="100">
          <template #default="{ row, $index }">
            <el-input-number v-model="createForm.details[$index].quantity" :min="0" style="width: 100%" @change="() => calculateAmount($index)" />
          </template>
        </el-table-column>
        <el-table-column label="单位成本" width="120">
          <template #default="{ row, $index }">
            <el-input-number v-model="createForm.details[$index].unitCost" :min="0" :precision="2" style="width: 100%" @change="() => calculateAmount($index)" />
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            {{ ((row.quantity || 0) * (row.unitCost || 0)).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="批次号" width="120">
          <template #default="{ row, $index }">
            <el-input v-model="createForm.details[$index].batchNo" placeholder="批次号" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ $index }">
            <el-button type="danger" size="small" link @click="removeDetailRow($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="text-align: right; margin-top: 10px">
        <span style="margin-right: 20px">合计数量: {{ createForm.details.reduce((sum, d) => sum + (d.quantity || 0), 0) }}</span>
        <span>合计金额: ¥{{ createForm.details.reduce((sum, d) => sum + (d.quantity || 0) * (d.unitCost || 0), 0).toFixed(2) }}</span>
      </div>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreateSubmit">创建</el-button>
      </template>
    </el-dialog>

    <!-- 单据详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`调拨单详情 - ${currentTransfer?.transferNo || ''}`"
      width="900px"
      @close="handleCloseDetailDialog"
    >
      <div class="detail-content">
        <!-- 基本信息 -->
        <div class="section-title">基本信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="调拨单号">{{ currentTransfer?.transferNo }}</el-descriptions-item>
          <el-descriptions-item label="调出仓库">{{ currentTransfer?.fromWarehouse?.name }}</el-descriptions-item>
          <el-descriptions-item label="调入仓库">{{ currentTransfer?.toWarehouse?.name }}</el-descriptions-item>
          <el-descriptions-item label="调拨日期">{{ formatDate(currentTransfer?.transferDate) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentTransfer?.status)">
              {{ getStatusText(currentTransfer?.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="总数量">{{ currentTransfer?.totalQty }}</el-descriptions-item>
          <el-descriptions-item label="总金额">{{ formatCurrency(currentTransfer?.totalAmount) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentTransfer?.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 调拨明细 -->
        <div class="section-title">调拨明细</div>
        <el-table :data="detailItems" border max-height="400" style="margin-top: 16px">
          <el-table-column prop="productCode" label="物料编码" width="120" />
          <el-table-column prop="productName" label="物料名称" min-width="150" />
          <el-table-column prop="batchNo" label="批次号" width="120" />
          <el-table-column prop="quantity" label="数量" width="100" align="right" />
          <el-table-column prop="unitCost" label="单位成本" width="100" align="right">
            <template #default="{ row }">
              {{ formatCurrency(row.unitCost) }}
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="120" align="right">
            <template #default="{ row }">
              {{ formatCurrency(row.amount) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getStockTransfers, getStockTransferById, createStockTransfer, confirmStockTransfer, deleteStockTransfer } from '@/api/stock-transfer'
import { getWarehouses } from '@/api/warehouse'
import { getProducts } from '@/api/product'
import { getInventory } from '@/api/inventory'
import { generateNextNumber } from '@/api/numbering-rule'

interface StockTransfer {
  id: string
  transferNo: string
  fromWarehouseId: string
  fromWarehouse?: { id: string; name: string }
  toWarehouseId: string
  toWarehouse?: { id: string; name: string }
  transferDate: string
  status: string
  totalQty: number
  totalAmount: number
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
const tableData = ref<StockTransfer[]>([])
const loading = ref(false)
const warehouses = ref<any[]>([])
const products = ref<any[]>([])
const inventoryMap = ref<Record<string, number>>({})

// 详情对话框
const detailDialogVisible = ref(false)
const currentTransfer = ref<StockTransfer | null>(null)
const detailItems = ref<any[]>([])

// 创建对话框
const createDialogVisible = ref(false)
const createDialogTitle = ref('新增调拨单')
const createLoading = ref(false)
const createForm = reactive({
  transferNo: '',
  fromWarehouseId: '',
  toWarehouseId: '',
  transferDate: new Date(),
  remark: '',
  details: [] as any[]
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
      params.transferNo = searchForm.keyword
    }
    if (searchForm.status) {
      params.status = searchForm.status
    }

    const response = await getStockTransfers(params) as any
    if (response.success) {
      tableData.value = response.data.items || []
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('获取调拨单列表失败:', error)
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
    const response = await getProducts({ page: 1, limit: 1000 }) as any
    if (response.success) {
      products.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取产品列表失败:', error)
  }
}

// 调出仓库变更
const handleFromWarehouseChange = () => {
  // 重置调入仓库和明细
  createForm.toWarehouseId = ''
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

// 新增调拨单
const handleCreate = async () => {
  createForm.transferNo = ''
  createForm.fromWarehouseId = ''
  createForm.toWarehouseId = ''
  createForm.transferDate = new Date()
  createForm.remark = ''
  createForm.details = []
  createDialogVisible.value = true

  // 自动生成编号
  try {
    const res = await generateNextNumber('stock_transfer') as any
    if (res.success && res.data?.number) {
      createForm.transferNo = res.data.number
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
    quantity: 1,
    unitCost: 0,
    amount: 0,
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
    calculateAmount(index)
  }
}

// 计算金额
const calculateAmount = (index: number) => {
  const detail = createForm.details[index]
  detail.amount = (detail.quantity || 0) * (detail.unitCost || 0)
}

// 提交创建
const handleCreateSubmit = async () => {
  if (!createForm.fromWarehouseId) {
    ElMessage.warning('请选择调出仓库')
    return
  }
  if (!createForm.toWarehouseId) {
    ElMessage.warning('请选择调入仓库')
    return
  }
  if (createForm.fromWarehouseId === createForm.toWarehouseId) {
    ElMessage.warning('调出仓库和调入仓库不能相同')
    return
  }
  if (createForm.details.length === 0) {
    ElMessage.warning('请添加调拨明细')
    return
  }

  const invalidDetail = createForm.details.find(d => !d.productId || !d.quantity || d.quantity <= 0)
  if (invalidDetail) {
    ElMessage.warning('调拨明细中的商品、数量不能为空')
    return
  }

  createLoading.value = true
  try {
    const res = await createStockTransfer({
      transferNo: createForm.transferNo,
      fromWarehouseId: createForm.fromWarehouseId,
      toWarehouseId: createForm.toWarehouseId,
      transferDate: createForm.transferDate,
      remark: createForm.remark,
      details: createForm.details.map(d => ({
        productId: d.productId,
        quantity: d.quantity,
        unitCost: d.unitCost || 0,
        amount: d.quantity * (d.unitCost || 0),
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
const handleView = async (row: StockTransfer) => {
  try {
    const response = await getStockTransferById(row.id) as any
    if (response.success) {
      currentTransfer.value = response.data
      detailItems.value = response.data.details || []
      detailDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取调拨单详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}

// 确认调拨单
const handleConfirm = async (row: StockTransfer) => {
  try {
    await ElMessageBox.confirm(
      `确认调拨单「${row.transferNo}」吗？确认后将调整库存。`,
      '确认调拨单',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )

    const response = await confirmStockTransfer(row.id) as any
    if (response.success) {
      ElMessage.success('确认成功')
      fetchList()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('确认调拨单失败:', error)
      ElMessage.error(error.response?.data?.message || '确认失败')
    }
  }
}

// 删除调拨单
const handleDelete = async (row: StockTransfer) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除调拨单「${row.transferNo}」吗？`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )

    const response = await deleteStockTransfer(row.id) as any
    if (response.success) {
      ElMessage.success('删除成功')
      fetchList()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除调拨单失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// 关闭详情对话框
const handleCloseDetailDialog = () => {
  detailDialogVisible.value = false
  currentTransfer.value = null
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
const formatCurrency = (value: number | string | any): string => {
  const num = typeof value === 'string' ? parseFloat(value) : (Number(value) || 0)
  return `¥${num.toFixed(2)}`
}

// 获取状态标签类型
const getStatusType = (status: string): string => {
  const map: Record<string, string> = {
    draft: 'info',
    confirmed: 'success',
    cancelled: 'danger'
  }
  return map[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    cancelled: '已取消'
  }
  return map[status] || status
}

// 初始化
onMounted(() => {
  fetchWarehouses()
  fetchProducts()
  fetchList()
})
</script>

<style scoped>
.stock-transfer-page {
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
</style>