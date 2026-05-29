<template>
  <div class="payment-payment-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>付款单</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新增付款单
          </el-button>
        </div>
      </template>
      
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="付款单号">
          <el-input v-model="searchForm.paymentNo" placeholder="付款单号" clearable />
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
        <el-table-column prop="paymentNo" label="付款单号" width="180" />
        <el-table-column label="供应商" width="180">
          <template #default="{ row }">
            {{ row.supplier?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="付款日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.paymentDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="付款金额" width="120">
          <template #default="{ row }">
            {{ row.amount?.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="关联订单" width="180">
          <template #default="{ row }">
            {{ row.purchaseOrder?.orderNo || '-' }}
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
      width="600px"
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
            <el-form-item label="付款单号" prop="paymentNo">
              <el-input v-model="formData.paymentNo" placeholder="请输入付款单号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplierId">
              <el-select v-model="formData.supplierId" placeholder="请选择供应商" filterable>
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
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="付款日期" prop="paymentDate">
              <el-date-picker
                v-model="formData.paymentDate"
                type="date"
                placeholder="请选择日期"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="付款金额" prop="amount">
              <el-input-number 
                v-model="formData.amount" 
                :min="0" 
                :precision="2" 
                :step="100"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="付款账户" prop="accountId">
              <el-select v-model="formData.accountId" placeholder="请选择账户" filterable>
                <el-option
                  v-for="account in accounts"
                  :key="account.id"
                  :label="`${account.name} (${account.balance?.toFixed(2)})`"
                  :value="account.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联订单" prop="purchaseOrderId">
              <el-select 
                v-model="formData.purchaseOrderId" 
                placeholder="请选择采购订单（可选）"
                filterable
                clearable
              >
                <el-option
                  v-for="order in purchaseOrders"
                  :key="order.id"
                  :label="`${order.orderNo} - ${order.totalAmount?.toFixed(2)}`"
                  :value="order.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getPaymentPayments, getPaymentPaymentById, createPaymentPayment, updatePaymentPayment, confirmPaymentPayment, deletePaymentPayment } from '@/api/payment-payment'
import { getSuppliers } from '@/api/supplier'
import { getAccounts } from '@/api/account'
import { getPurchaseOrders } from '@/api/purchase-order'
import { getStatusColor, getPaymentPaymentStatusText } from '@/utils/status.util'
import type { FormInstance, FormRules } from 'element-plus'

// 数据列表
const tableData = ref([])
const loading = ref(false)

// 搜索表单
const searchForm = reactive({
  paymentNo: '',
  status: '',
  supplierId: ''
})

// 下拉数据
const suppliers = ref<any[]>([])
const accounts = ref<any[]>([])
const purchaseOrders = ref<any[]>([])

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增付款单')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive({
  id: '',
  paymentNo: '',
  supplierId: '',
  paymentDate: new Date().toISOString().split('T')[0],
  amount: 0,
  accountId: '',
  purchaseOrderId: '',
  remark: ''
})

// 表单验证规则
const formRules: FormRules = {
  paymentNo: [
    { required: true, message: '请输入付款单号', trigger: 'blur' }
  ],
  supplierId: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ],
  paymentDate: [
    { required: true, message: '请选择付款日期', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '请输入付款金额', trigger: 'blur' }
  ],
  accountId: [
    { required: true, message: '请选择付款账户', trigger: 'change' }
  ]
}

// 获取付款单列表
const fetchPaymentPayments = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    
    const response: any = await getPaymentPayments(params)
    if (response.success) {
      tableData.value = response.data.items
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('获取付款单列表失败:', error)
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

// 获取账户列表
const fetchAccounts = async () => {
  try {
    const response: any = await getAccounts({ page: 1, limit: 1000 })
    if (response.success) {
      accounts.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取账户列表失败:', error)
  }
}

// 获取采购订单列表
const fetchPurchaseOrders = async () => {
  try {
    const response: any = await getPurchaseOrders({ page: 1, limit: 1000, status: 'confirmed,partial,completed' })
    if (response.success) {
      purchaseOrders.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取采购订单列表失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchPaymentPayments()
}

// 重置搜索
const handleReset = () => {
  searchForm.paymentNo = ''
  searchForm.status = ''
  searchForm.supplierId = ''
  pagination.page = 1
  fetchPaymentPayments()
}

// 新增
const handleCreate = () => {
  dialogTitle.value = '新增付款单'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 查看
const handleView = async (row: any) => {
  try {
    dialogTitle.value = '查看付款单'
    isEdit.value = true
    
    const response: any = await getPaymentPaymentById(row.id)
    if (response.success) {
      const payment = response.data.data
      Object.assign(formData, {
        id: payment.id,
        paymentNo: payment.paymentNo,
        supplierId: payment.supplierId,
        paymentDate: new Date(payment.paymentDate),
        amount: payment.amount,
        accountId: payment.accountId,
        purchaseOrderId: payment.purchaseOrderId || '',
        remark: payment.remark
      })
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取付款单详情失败:', error)
  }
}

// 确认付款单
const handleConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要确认付款单 "${row.paymentNo}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await confirmPaymentPayment(row.id)
    ElMessage.success('确认成功')
    fetchPaymentPayments()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('确认付款单失败:', error)
    }
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除付款单 "${row.paymentNo}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deletePaymentPayment(row.id)
    ElMessage.success('删除成功')
    fetchPaymentPayments()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除付款单失败:', error)
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
  return getPaymentPaymentStatusText(status)
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitLoading.value = true
    
    // 构建提交数据
    const submitData = {
      paymentNo: formData.paymentNo,
      supplierId: formData.supplierId,
      paymentDate: formData.paymentDate,
      amount: formData.amount,
      accountId: formData.accountId,
      purchaseOrderId: formData.purchaseOrderId || undefined,
      remark: formData.remark
    }
    
    if (isEdit.value) {
      await updatePaymentPayment(formData.id, submitData)
      ElMessage.success('更新成功')
    } else {
      await createPaymentPayment(submitData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    fetchPaymentPayments()
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  formData.id = ''
  formData.paymentNo = ''
  formData.supplierId = ''
  formData.paymentDate = new Date().toISOString().split('T')[0]
  formData.amount = 0
  formData.accountId = ''
  formData.purchaseOrderId = ''
  formData.remark = ''
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
  fetchPaymentPayments()
}

// 当前页改变
const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchPaymentPayments()
}

// 初始化
onMounted(async () => {
  await Promise.all([
    fetchPaymentPayments(),
    fetchSuppliers(),
    fetchAccounts(),
    fetchPurchaseOrders()
  ])
})
</script>

<style scoped>
.payment-payment-list {
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
</style>