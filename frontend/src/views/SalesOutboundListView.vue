<template>
  <div class="sales-outbound-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>销售出库单</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新增出库单
          </el-button>
        </div>
      </template>
      
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="出库单号">
          <el-input v-model="searchForm.orderNo" placeholder="出库单号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="草稿" value="draft" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="searchForm.customerId" placeholder="请选择客户" clearable filterable>
            <el-option
              v-for="customer in customers"
              :key="customer.id"
              :label="customer.name"
              :value="customer.id"
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
        <el-table-column prop="orderNo" label="出库单号" width="180" />
        <el-table-column label="销售订单" width="180">
          <template #default="{ row }">
            {{ row.salesOrder?.orderNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="客户" width="180">
          <template #default="{ row }">
            {{ row.customer?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="出库日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.outboundDate) }}
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
            <el-form-item label="出库单号" prop="orderNo">
              <el-input v-model="formData.orderNo" placeholder="请输入出库单号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="销售订单" prop="salesOrderId">
              <el-select 
                v-model="formData.salesOrderId" 
                placeholder="请选择销售订单"
                filterable
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
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出库日期" prop="outboundDate">
              <el-date-picker
                v-model="formData.outboundDate"
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
            <el-form-item label="客户" prop="customerId">
              <el-select v-model="formData.customerId" placeholder="请选择客户" filterable>
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
              <el-select v-model="formData.salesmanId" placeholder="请选择销售员" filterable clearable>
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
        
        <!-- 出库明细 -->
        <div class="details-section">
          <div class="details-header">
            <h3>出库明细</h3>
          </div>
          
          <el-table :data="formData.details" border style="width: 100%">
            <el-table-column label="物料" width="250">
              <template #default="{ row, $index }">
                <el-select
                  v-model="formData.details[$index].productId"
                  placeholder="请选择物料"
                  filterable
                  style="width: 100%"
                  @change="(val) => handleProductChange(val, $index)"
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
            <el-table-column label="可用库存" width="120">
              <template #default="{ row }">
                {{ getAvailableStock(row.productId) }}
              </template>
            </el-table-column>
            <el-table-column label="计划数量" width="120">
              <template #default="{ row }">
                {{ row.plannedQty || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="已出库数量" width="120">
              <template #default="{ row }">
                {{ row.outboundQty || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="本次出库" width="150">
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getSalesOutbounds, getSalesOutboundById, createSalesOutbound, updateSalesOutbound, confirmSalesOutbound, deleteSalesOutbound } from '@/api/sales-outbound'
import { getSalesOrders } from '@/api/sales-order'
import { getCustomers } from '@/api/customer'
import { getUsers } from '@/api/user'
import { getWarehouses } from '@/api/warehouse'
import { getProducts } from '@/api/product'
import { getInventory } from '@/api/inventory'
import type { FormInstance, FormRules } from 'element-plus'

// 数据列表
const tableData = ref([])
const loading = ref(false)

// 搜索表单
const searchForm = reactive({
  orderNo: '',
  status: '',
  customerId: ''
})

// 下拉数据
const customers = ref([])
const users = ref([])
const salesOrders = ref([])
const warehouses = ref([])
const products = ref([])
const inventoryMap = ref<Record<string, number>>({})

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增销售出库单')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive({
  id: '',
  orderNo: '',
  salesOrderId: '',
  customerId: '',
  salesmanId: '',
  outboundDate: new Date(),
  warehouseId: '',
  remark: '',
  logisticsCost: 0,
  details: [] as any[]
})

// 表单验证规则
const formRules: FormRules = {
  orderNo: [
    { required: true, message: '请输入出库单号', trigger: 'blur' }
  ],
  outboundDate: [
    { required: true, message: '请选择出库日期', trigger: 'change' }
  ],
  warehouseId: [
    { required: true, message: '请选择仓库', trigger: 'change' }
  ]
}

// 获取销售出库单列表
const fetchSalesOutbounds = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    
    const response = await getSalesOutbounds(params)
    if (response.success) {
      tableData.value = response.data.items
      pagination.total = response.data.total
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
    const response = await getCustomers({ page: 1, limit: 1000 })
    if (response.success) {
      customers.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取客户列表失败:', error)
  }
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    const response = await getUsers()
    if (response.success) {
      users.value = response.data || []
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

// 获取销售订单列表
const fetchSalesOrders = async () => {
  try {
    const response = await getSalesOrders({ page: 1, limit: 1000, status: 'confirmed' })
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
    const response = await getWarehouses({ page: 1, limit: 1000 })
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
    const response = await getProducts({ page: 1, limit: 1000 })
    if (response.success) {
      products.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取物料列表失败:', error)
  }
}

  // 获取库存数据
  const fetchInventory = async () => {
    try {
      const response = await getInventory({ page: 1, limit: 1000 })
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

// 销售订单变更
const handleOrderChange = (orderId: string) => {
  const order = salesOrders.value.find((o: any) => o.id === orderId)
  if (order) {
    formData.customerId = order.customerId
    formData.details = order.details?.map((detail: any) => ({
      id: detail.id,
      productId: detail.productId,
      plannedQty: detail.quantity,
      outboundQty: 0,
      quantity: 0,
      unitPrice: detail.unitPrice
    })) || []
  }
}

// 获取可用库存
const getAvailableStock = (productId: string) => {
  return inventoryMap.value[productId] || 0
}

// 获取最大出库数量
const getMaxOutboundQty = (row: any) => {
  const available = getAvailableStock(row.productId)
  const remaining = (row.plannedQty || Infinity) - (row.outboundQty || 0)
  return Math.min(available, remaining)
}

// 明细变更
const handleDetailChange = (index: number) => {
  // 可以在这里添加明细变更后的逻辑
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
  pagination.page = 1
  fetchSalesOutbounds()
}

// 新增
const handleCreate = () => {
  dialogTitle.value = '新增销售出库单'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
  // 不在这里预生成编号，用户保存时才生成
}

// 添加明细行
const addDetailRow = () => {
  formData.details.push({
    productId: '',
    plannedQty: 0,
    outboundQty: 0,
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

// 查看
const handleView = async (row: any) => {
  try {
    dialogTitle.value = '查看销售出库单'
    isEdit.value = true
    
    const response = await getSalesOutboundById(row.id)
    if (response.success) {
      const outbound = response.data.data
      Object.assign(formData, {
        id: outbound.id,
        orderNo: outbound.orderNo,
        salesOrderId: outbound.salesOrderId,
        customerId: outbound.customerId,
        outboundDate: new Date(outbound.outboundDate),
        warehouseId: outbound.warehouseId,
        remark: outbound.remark,
        details: outbound.details?.map((detail: any) => ({
          id: detail.id,
          productId: detail.productId,
          plannedQty: detail.plannedQty,
          outboundQty: detail.outboundQty,
          quantity: 0,
          unitPrice: detail.unitPrice
        })) || []
      })
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取销售出库单详情失败:', error)
  }
}

// 确认出库单
const handleConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要确认销售出库单 "${row.orderNo}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await confirmSalesOutbound(row.id)
    ElMessage.success('确认成功')
    fetchSalesOutbounds()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('确认销售出库单失败:', error)
    }
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除销售出库单 "${row.orderNo}" 吗？`,
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
  const map: Record<string, string> = {
    'draft': 'info',
    'confirmed': 'success',
    'cancelled': 'danger'
  }
  return map[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'draft': '草稿',
    'confirmed': '已确认',
    'cancelled': '已取消'
  }
  return map[status] || status
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
    
    // 构建提交数据
    const submitData: any = {
      customerId: formData.customerId,
      salesmanId: formData.salesmanId,
      outboundDate: formData.outboundDate,
      warehouseId: formData.warehouseId,
      remark: formData.remark,
      logisticsCost: formData.logisticsCost,
      details: formData.details.map(detail => ({
        productId: detail.productId,
        quantity: detail.quantity,
        unitPrice: detail.unitPrice
      }))
    }

    if (isEdit.value) {
      submitData.orderNo = formData.orderNo
      submitData.salesOrderId = formData.salesOrderId || undefined
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
  } finally {
    submitLoading.value = false
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
  formData.outboundDate = new Date()
  formData.warehouseId = ''
  formData.remark = ''
  formData.logisticsCost = 0
  formData.details = []
}

// 监听客户选择，自动带入专属业务员
watch(() => formData.customerId, (newCustomerId) => {
  if (newCustomerId) {
    const selectedCustomer = customers.value.find(c => c.id === newCustomerId)
    if (selectedCustomer?.salesmanId) {
      formData.salesmanId = selectedCustomer.salesmanId
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
  await Promise.all([
    fetchSalesOutbounds(),
    fetchCustomers(),
    fetchUsers(),
    fetchSalesOrders(),
    fetchWarehouses(),
    fetchProducts(),
    fetchInventory()
  ])
})
</script>

<style scoped>
.sales-outbound-list {
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