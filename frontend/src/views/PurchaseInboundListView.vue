<template>
  <div class="purchase-inbound-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>采购入库单</span>
          <div class="header-actions">
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
      </template>
      
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="入库单号">
          <el-input v-model="searchForm.orderNo" placeholder="入库单号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="草稿" value="draft" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="searchForm.supplierId" placeholder="请选择供应商" clearable filterable>
            <el-option
              v-for="supplier in suppliers"
              :key="supplier.id"
              :label="supplier.name"
              :value="supplier.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 表格 -->
      <el-table :data="tableData" stripe border style="width: 100%">
        <el-table-column prop="orderNo" label="入库单号" width="180" />
        <el-table-column label="采购订单" width="180">
          <template #default="{ row }">
            {{ row.purchaseOrder?.orderNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="供应商" width="180">
          <template #default="{ row }">
            {{ row.supplier?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="入库日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.inboundDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="总金额" width="120">
          <template #default="{ row }">
            {{ row.totalAmount?.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button 
              v-if="row.status === 'draft'"
              type="warning" 
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
    
    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="900px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入库单号" prop="orderNo">
              <el-input v-model="formData.orderNo" placeholder="请输入入库单号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="采购订单" prop="purchaseOrderId">
              <el-select 
                v-model="formData.purchaseOrderId" 
                placeholder="请选择采购订单"
                filterable
                @change="handleOrderChange"
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
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入库日期" prop="inboundDate">
              <el-date-picker
                v-model="formData.inboundDate"
                type="date"
                placeholder="请选择日期"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="仓库" prop="warehouseId">
              <el-select v-model="formData.warehouseId" placeholder="请选择仓库" filterable>
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
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物流/快递费用">
              <el-input-number
                v-model="formData.logisticsCost"
                :min="0"
                :precision="2"
                placeholder="请输入物流费用"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
        
        <!-- 入库明细 -->
        <div class="details-section">
          <div class="details-header">
            <h3>入库明细</h3>
          </div>
          
          <el-table :data="formData.details" border style="width: 100%">
            <el-table-column label="物料" width="250">
              <template #default="{ row, $index }">
                <el-select
                  v-model="formData.details[$index].productId"
                  placeholder="请选择物料"
                  filterable
                  style="width: 100%"
                  @change="(val: any) => handleProductChange(val, $index)"
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
            <el-table-column label="规格" width="120">
              <template #default="{ row }">
                {{ getProductSpec(row.productId) }}
              </template>
            </el-table-column>
            <el-table-column label="单位" width="80">
              <template #default="{ row }">
                {{ getProductUnit(row.productId) }}
              </template>
            </el-table-column>
            <el-table-column label="计划数量" width="120">
              <template #default="{ row }">
                {{ row.plannedQty || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="已入库数量" width="120">
              <template #default="{ row }">
                {{ row.inboundQty || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="本次入库" width="150">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="formData.details[$index].quantity"
                  :min="0"
                  :precision="0"
                  style="width: 100%;"
                />
              </template>
            </el-table-column>
            <el-table-column label="单价" width="150">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="formData.details[$index].unitPrice"
                  :min="0"
                  :precision="2"
                  style="width: 100%;"
                />
              </template>
            </el-table-column>
            <el-table-column label="金额" width="120">
              <template #default="{ row }">
                {{ (row.quantity * row.unitPrice)?.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ $index }">
                <el-button type="danger" size="small" link @click="removeDetailRow($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div style="margin-top: 10px">
            <el-button type="primary" size="small" @click="addDetailRow">
              <el-icon><Plus /></el-icon> 添加物料
            </el-button>
          </div>
        </div>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      module-name="采购入库单"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, QuestionFilled } from '@element-plus/icons-vue'
import { getPurchaseInbounds, getPurchaseInboundById, createPurchaseInbound, updatePurchaseInbound, confirmPurchaseInbound, deletePurchaseInbound } from '@/api/purchase-inbound'
import { getPurchaseOrders } from '@/api/purchase-order'
import { getSuppliers } from '@/api/supplier'
import { getWarehouses } from '@/api/warehouse'
import { getProducts } from '@/api/product'
import { generateNextNumber } from '@/api/numbering-rule'
import { getStatusColor, getPurchaseInboundStatusText } from '@/utils/status.util'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'
import type { FormInstance, FormRules } from 'element-plus'

// 数据列表
const tableData = ref([])
const loading = ref(false)

// 搜索表单
const searchForm = reactive({
  orderNo: '',
  status: '',
  supplierId: ''
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
const dialogTitle = ref('新增采购入库单')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const helpDialogVisible = ref(false)

// 表单数据
const formData = reactive({
  id: '',
  orderNo: '',
  purchaseOrderId: '',
  supplierId: '',
  inboundDate: new Date(),
  warehouseId: '',
  remark: '',
  logisticsCost: 0,
  details: [] as any[]
})

// 表单验证规则
const formRules: FormRules = {
  orderNo: [
    { required: true, message: '请输入入库单号', trigger: 'blur' }
  ],
  inboundDate: [
    { required: true, message: '请选择入库日期', trigger: 'change' }
  ],
  warehouseId: [
    { required: true, message: '请选择仓库', trigger: 'change' }
  ]
}

// 获取采购入库单列表
const fetchPurchaseInbounds = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    
    const response: any = await getPurchaseInbounds(params)
    if (response.success) {
      tableData.value = response.data.items
      pagination.total = response.data.total
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
    const response: any = await getSuppliers({ page: 1, limit: 10000, status: '' })
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

// 添加明细行
const addDetailRow = () => {
  formData.details.push({
    productId: '',
    plannedQty: 0,
    inboundQty: 0,
    quantity: 0,
    unitPrice: 0
  })
}

// 删除明细行
const removeDetailRow = (index: number) => {
  formData.details.splice(index, 1)
}

// 产品变更
const handleProductChange = (productId: string, index: number) => {
  const product = products.value.find((p: any) => p.id === productId)
  if (product) {
    formData.details[index].unitPrice = Number(product.costPrice) || 0
  }
}

// 采购订单变更
const handleOrderChange = (orderId: string) => {
  const order = purchaseOrders.value.find((o: any) => o.id === orderId)
  if (order) {
    formData.supplierId = order.supplierId
    formData.details = order.details?.map((detail: any) => ({
      id: detail.id,
      productId: detail.productId,
      plannedQty: detail.quantity,
      inboundQty: 0,
      quantity: 0,
      unitPrice: detail.unitPrice
    })) || []
  }
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
  pagination.page = 1
  fetchPurchaseInbounds()
}

// 新增
const handleCreate = async () => {
  dialogTitle.value = '新增采购入库单'
  isEdit.value = false
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
    dialogTitle.value = '查看采购入库单'
    isEdit.value = true
    
    const response: any = await getPurchaseInboundById(row.id)
    if (response.success) {
      const inbound = response.data.data
      Object.assign(formData, {
        id: inbound.id,
        orderNo: inbound.orderNo,
        purchaseOrderId: inbound.purchaseOrderId,
        supplierId: inbound.supplierId,
        inboundDate: new Date(inbound.inboundDate),
        warehouseId: inbound.warehouseId,
        remark: inbound.remark,
        details: inbound.details?.map((detail: any) => ({
          id: detail.id,
          productId: detail.productId,
          plannedQty: detail.plannedQty,
          inboundQty: detail.inboundQty,
          quantity: 0,
          unitPrice: detail.unitPrice
        })) || []
      })
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取采购入库单详情失败:', error)
  }
}

// 确认入库单
const handleConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要确认采购入库单 "${row.orderNo}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await confirmPurchaseInbound(row.id)
    ElMessage.success('确认成功')
    fetchPurchaseInbounds()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('确认采购入库单失败:', error)
    }
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除采购入库单 "${row.orderNo}" 吗？`,
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

// 获取物料规格
const getProductSpec = (productId: string) => {
  const product = products.value.find((p: any) => p.id === productId)
  return product?.spec || '-'
}

// 获取物料单位
const getProductUnit = (productId: string) => {
  const product = products.value.find((p: any) => p.id === productId)
  return product?.unit || '-'
}

// 获取状态类型
const getStatusType = (status: string) => {
  return getStatusColor(status)
}

const getStatusText = (status: string) => {
  return getPurchaseInboundStatusText(status)
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
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
        ElMessage.warning('入库数量必须大于0')
        return
      }
    }

    submitLoading.value = true

    // 构建提交数据
    const submitData: any = {
      purchaseOrderId: formData.purchaseOrderId || undefined,
      inboundDate: formData.inboundDate,
      warehouseId: formData.warehouseId,
      remark: formData.remark,
      details: formData.details.map(detail => ({
        productId: detail.productId,
        quantity: detail.quantity,
        unitPrice: detail.unitPrice
      }))
    }

    if (isEdit.value) {
      submitData.inboundNo = formData.orderNo
      await updatePurchaseInbound(formData.id, submitData)
      ElMessage.success('更新成功')
    } else {
      // 新增时使用当前编号
      submitData.inboundNo = formData.orderNo

      try {
        const res = await createPurchaseInbound(submitData) as any
        if (res.success) {
          ElMessage.success('创建成功')
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
              ElMessage.success('创建成功')
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

// 重置表单
const resetForm = () => {
  formData.id = ''
  formData.orderNo = ''
  formData.purchaseOrderId = ''
  formData.supplierId = ''
  formData.inboundDate = new Date()
  formData.warehouseId = ''
  formData.remark = ''
  formData.details = []
}

// 关闭对话框
const handleDialogClose = () => {
  resetForm()
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
        '选择供应商',
        '选择入库仓库',
        '添加入库明细，选择物料和数量',
        '设置入库日期和备注',
        '点击"确定"保存草稿或直接确认'
      ]
    },
    {
      title: '关联采购订单',
      steps: [
        '在新增入库单时选择关联的采购订单',
        '系统会自动带入订单的物料明细',
        '修改入库数量',
        '确认入库'
      ]
    },
    {
      title: '确认入库单',
      steps: [
        '在入库单列表中找到草稿状态的入库单',
        '点击"确认"按钮',
        '确认后库存会相应增加'
      ]
    }
  ],
  notices: [
    '入库数量必须与采购订单数量一致',
    '确认入库单会增加库存',
    '已确认的入库单不能直接修改',
    '可以关联采购订单自动生成入库单',
    '支持部分入库'
  ],
  tips: [
    '可以使用采购订单快速入库功能',
    '支持批量入库操作',
    '入库单确认后不可撤销',
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
    '新增帮助文档功能'
  ]
}

// 打开帮助
const handleHelp = () => {
  helpDialogVisible.value = true
}

// 初始化
onMounted(async () => {
  await Promise.all([
    fetchPurchaseInbounds(),
    fetchSuppliers(),
    fetchPurchaseOrders(),
    fetchWarehouses(),
    fetchProducts()
  ])
})
</script>

<style scoped>
.purchase-inbound-list {
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

.details-section {
  margin-top: 20px;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.details-header h3 {
  margin: 0;
  font-size: 16px;
}
</style>