<template>
  <div class="other-inbound-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>其他入库单</span>
          <div class="header-actions">
            <el-button @click="handleHelp">
              <el-icon><QuestionFilled /></el-icon>
              帮助
            </el-button>
            <el-button type="primary" @click="handleCreate">
              <el-icon><Plus /></el-icon>
              新增其他入库单
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="单据编号" clearable @keyup.enter="handleSearch" />
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
        <el-table-column prop="inboundNo" label="单据编号" width="180" />
        <el-table-column label="仓库" width="150">
          <template #default="{ row }">
            {{ row.warehouse?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="inboundType" label="入库类型" width="120">
          <template #default="{ row }">
            {{ getInboundTypeText(row.inboundType) }}
          </template>
        </el-table-column>
        <el-table-column label="单据日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.inboundDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalQty" label="入库数量" width="100" align="right" />
        <el-table-column prop="totalAmount" label="入库金额" width="120" align="right">
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
            <el-form-item label="单据编号" required>
              <el-input v-model="createForm.inboundNo" placeholder="自动生成" />
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
            <el-form-item label="入库类型">
              <el-select v-model="createForm.inboundType" placeholder="请选择" style="width: 100%">
                <el-option label="其他入库" value="other" />
                <el-option label="退货入库" value="return" />
                <el-option label="调拨入库" value="transfer" />
                <el-option label="生产入库" value="production" />
                <el-option label="赠品入库" value="gift" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="入库日期">
              <el-date-picker v-model="createForm.inboundDate" type="date" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="备注">
              <el-input v-model="createForm.remark" placeholder="备注信息" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <el-divider content-position="left">
        <span style="display: flex; align-items: center; gap: 8px;">
          入库明细
          <el-popover trigger="click" placement="bottom-end" :width="100">
            <template #reference>
              <el-button size="small" link type="primary">
                <el-icon><Setting /></el-icon>
                列设置
              </el-button>
            </template>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <el-checkbox v-model="visibleColumns.batchNo">批次号</el-checkbox>
            </div>
          </el-popover>
        </span>
      </el-divider>

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
              @change="(val: any) => handleProductSelect($index, products.find(p => p.id === val))"
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
        <el-table-column label="单价" width="120">
          <template #default="{ row, $index }">
            <el-input-number v-model="createForm.details[$index].unitPrice" :min="0" :precision="2" style="width: 100%" @change="() => calculateAmount($index)" />
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            {{ ((row.quantity || 0) * (row.unitPrice || 0)).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column v-if="visibleColumns.batchNo" label="批次号" width="120">
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
        <span>合计金额: ¥{{ createForm.details.reduce((sum, d) => sum + (d.quantity || 0) * (d.unitPrice || 0), 0).toFixed(2) }}</span>
      </div>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreateSubmit">创建</el-button>
      </template>
    </el-dialog>

    <!-- 单据详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`其他入库单详情 - ${currentInbound?.inboundNo || ''}`"
      width="900px"
      @close="handleCloseDetailDialog"
    >
      <div class="detail-content">
        <!-- 基本信息 -->
        <div class="section-title">基本信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="单据编号">{{ currentInbound?.inboundNo }}</el-descriptions-item>
          <el-descriptions-item label="仓库">{{ currentInbound?.warehouse?.name }}</el-descriptions-item>
          <el-descriptions-item label="入库类型">{{ getInboundTypeText(currentInbound?.inboundType || '') }}</el-descriptions-item>
          <el-descriptions-item label="单据日期">{{ formatDate(currentInbound?.inboundDate || '') }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentInbound?.status || '')">
              {{ getStatusText(currentInbound?.status || '') }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="入库数量">{{ currentInbound?.totalQty }}</el-descriptions-item>
          <el-descriptions-item label="入库金额">{{ formatCurrency(currentInbound?.totalAmount || 0) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentInbound?.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 入库明细 -->
        <div class="section-title">入库明细</div>
        <el-table :data="detailItems" border max-height="400" style="margin-top: 16px">
          <el-table-column prop="productCode" label="物料编码" width="120" />
          <el-table-column prop="productName" label="物料名称" min-width="150" />
          <el-table-column prop="batchNo" label="批次号" width="120" v-if="hasBatchData" />
          <el-table-column prop="quantity" label="数量" width="100" align="right" />
          <el-table-column prop="unitPrice" label="单价" width="100" align="right">
            <template #default="{ row }">
              {{ formatCurrency(row.unitPrice) }}
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="120" align="right">
            <template #default="{ row }">
              {{ formatCurrency(row.amount) }}
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

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      module-name="其他入库单"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, QuestionFilled, Setting } from '@element-plus/icons-vue'
import { getOtherInbounds, getOtherInboundDetail, confirmOtherInbound, deleteOtherInbound, createOtherInbound } from '@/api/other-inbound'
import { getWarehouses } from '@/api/warehouse'
import { getProducts } from '@/api/product'
import { generateNextNumber } from '@/api/numbering-rule'
import { getStatusColor, getOtherInboundStatusText } from '@/utils/status.util'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'
import type { FormInstance } from 'element-plus'

interface OtherInbound {
  id: string
  inboundNo: string
  warehouseId: string
  warehouse?: { id: string; name: string }
  inboundType: string
  inboundDate: string
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
const tableData = ref<OtherInbound[]>([])
const loading = ref(false)
const warehouses = ref<any[]>([])
const products = ref<any[]>([])

// 详情对话框
const detailDialogVisible = ref(false)
const currentInbound = ref<OtherInbound | null>(null)
const detailItems = ref<any[]>([])

// 创建对话框
const createDialogVisible = ref(false)

// 明细列显隐控制
const visibleColumns = reactive({
  batchNo: true
})
const createDialogTitle = ref('新增其他入库单')
const createLoading = ref(false)
const createFormRef = ref<FormInstance>()
const helpDialogVisible = ref(false)
const createForm = reactive({
  inboundNo: '',
  warehouseId: '',
  inboundType: 'other',
  inboundDate: new Date(),
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
      params.inboundNo = searchForm.keyword
    }
    if (searchForm.status) {
      params.status = searchForm.status
    }

    const response = await getOtherInbounds(params) as any
    if (response.success) {
      tableData.value = response.data.items || []
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('获取其他入库单列表失败:', error)
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

// 新增其他入库单
const handleCreate = async () => {
  createForm.inboundNo = ''
  createForm.warehouseId = ''
  createForm.inboundType = 'other'
  createForm.inboundDate = new Date()
  createForm.remark = ''
  createForm.details = []
  createDialogVisible.value = true

  // 自动生成编号
  try {
    const res = await generateNextNumber('other_inbound') as any
    if (res.success && res.data?.number) {
      createForm.inboundNo = res.data.number
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
    warehouseId: createForm.warehouseId,
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    batchNo: '',
    productionDate: '',
    expiryDate: '',
    snCount: 0
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
    createForm.details[index].unitPrice = Number(product.costPrice) || 0
    calculateAmount(index)
  }
}

// 计算金额
const calculateAmount = (index: number) => {
  const detail = createForm.details[index]
  detail.amount = (detail.quantity || 0) * (detail.unitPrice || 0)
}

// 提交创建
const handleCreateSubmit = async () => {
  if (!createForm.warehouseId) {
    ElMessage.warning('请选择仓库')
    return
  }
  if (createForm.details.length === 0) {
    ElMessage.warning('请添加入库明细')
    return
  }

  const invalidDetail = createForm.details.find(d => !d.productId || !d.quantity || d.quantity <= 0)
  if (invalidDetail) {
    ElMessage.warning('入库明细中的商品、数量不能为空')
    return
  }

  createLoading.value = true
  try {
    const res = await createOtherInbound({
      inboundNo: createForm.inboundNo,
      warehouseId: createForm.warehouseId,
      inboundType: createForm.inboundType,
      inboundDate: createForm.inboundDate,
      remark: createForm.remark,
      details: createForm.details.map(d => ({
        productId: d.productId,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        amount: d.quantity * d.unitPrice,
        batchNo: d.batchNo || undefined,
        productionDate: d.productionDate || undefined,
        expiryDate: d.expiryDate || undefined
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
const handleView = async (row: OtherInbound) => {
  try {
    const response = await getOtherInboundDetail(row.id) as any
    if (response.success) {
      currentInbound.value = response.data.inbound
      detailItems.value = response.data.details || []
      detailDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取其他入库单详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}

// 确认其他入库单
const handleConfirm = async (row: OtherInbound) => {
  try {
    await ElMessageBox.confirm(
      `确认其他入库单「${row.inboundNo}」吗？确认后将增加库存。`,
      '确认其他入库单',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )

    const response = await confirmOtherInbound(row.id) as any
    if (response.success) {
      ElMessage.success('确认成功')
      fetchList()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('确认其他入库单失败:', error)
      ElMessage.error(error.response?.data?.message || '确认失败')
    }
  }
}

// 删除其他入库单
const handleDelete = async (row: OtherInbound) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除其他入库单「${row.inboundNo}」吗？`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )

    const response = await deleteOtherInbound(row.id) as any
    if (response.success) {
      ElMessage.success('删除成功')
      fetchList()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除其他入库单失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// 关闭详情对话框
const handleCloseDetailDialog = () => {
  detailDialogVisible.value = false
  currentInbound.value = null
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
const getStatusType = (status: any): 'primary' | 'success' | 'info' | 'warning' | 'danger' => {
  const type = getStatusColor(status)
  const validTypes: Array<'primary' | 'success' | 'info' | 'warning' | 'danger'> = 
    ['primary', 'success', 'info', 'warning', 'danger']
  if (validTypes.includes(type)) {
    return type
  }
  return 'info'
}

const getStatusText = (status: string): string => {
  return getOtherInboundStatusText(status)
}

// 获取入库类型文本
const getInboundTypeText = (type: string): string => {
  const map: Record<string, string> = {
    return: '退货入库',
    transfer: '调拨入库',
    production: '生产入库',
    gift: '赠品入库',
    other: '其他入库'
  }
  return map[type] || type
}

// 帮助数据
const helpData = {
  operations: [
    {
      title: '新增其他入库单',
      steps: [
        '点击"新增其他入库单"按钮',
        '选择入库类型（退货入库、调拨入库、生产入库、赠品入库、其他入库）',
        '选择入库仓库',
        '设置入库日期',
        '添加入库明细，选择物料和数量',
        '填写备注信息',
        '点击"确定"保存或确认'
      ]
    },
    {
      title: '确认其他入库单',
      steps: [
        '在其他入库单列表中找到草稿状态的入库单',
        '点击"确认"按钮',
        '确认后库存会相应增加'
      ]
    }
  ],
  notices: [
    '其他入库单用于处理非采购订单的入库业务',
    '确认入库单会增加库存',
    '已确认的入库单不能直接修改',
    '支持多种入库类型：退货、调拨、生产、赠品等',
    '入库类型会影响库存的会计处理'
  ],
  tips: [
    '退货入库用于客户退货的物料入库',
    '调拨入库用于仓库间调拨的入库',
    '生产入库用于生产完成的产品入库',
    '赠品入库用于收到的赠品入库',
    '可以按类型、状态、日期等条件筛选入库单'
  ],
  shortcuts: [
    { key: 'Ctrl+N', description: '新增入库单' },
    { key: 'Ctrl+S', description: '保存草稿' },
    { key: 'F5', description: '刷新列表' }
  ],
  version: '1.0.0',
  lastUpdate: '2025-05-28',
  changes: [
    '新增其他入库单功能',
    '支持多种入库类型',
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
.other-inbound-page {
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