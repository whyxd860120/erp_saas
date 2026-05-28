<template>
  <div class="account-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>账户管理</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新增账户
          </el-button>
        </div>
      </template>
      
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="编码 / 名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button :type="showInactive ? 'warning' : 'default'" @click="toggleShowInactive">
            {{ showInactive ? '隐藏禁用' : '显示禁用' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <!-- 表格 -->
      <el-table :data="tableData" stripe border style="width: 100%">
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column prop="name" label="名称" width="180" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            {{ row.type === 'bank' ? '银行账户' : row.type === 'cash' ? '现金账户' : '第三方支付' }}
          </template>
        </el-table-column>
        <el-table-column prop="balance" label="余额" width="150">
          <template #default="{ row }">
            <span :class="{ 'negative-balance': Number(row.balance) < 0 }">
              {{ Number(row.balance || 0).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="bankName" label="开户行" width="180" />
        <el-table-column prop="accountNo" label="账号" width="200" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusColor(row.status)">
              {{ getResourceStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
销售订单的管理界面销售管理里面，销售订单界面，嗯，下边搜索条件有客户还有状态。这两个搜索条件，它的后边的太窄了，放不开放不下那些字儿        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
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
        <el-form-item label="编码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入账户编码" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入账户名称" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择类型">
            <el-option label="银行账户" value="bank" />
            <el-option label="现金账户" value="cash" />
            <el-option label="第三方支付" value="third_party" />
          </el-select>
        </el-form-item>
        <el-form-item label="开户行" prop="bankName">
          <el-input v-model="formData.bankName" placeholder="请输入开户行" />
        </el-form-item>
        <el-form-item label="账号" prop="accountNo">
          <el-input v-model="formData.accountNo" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="初始余额" prop="balance">
          <el-input-number v-model="formData.balance" :precision="2" :step="100" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">停用</el-radio>
          </el-radio-group>
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
import { Plus, View, Hide } from '@element-plus/icons-vue'
import { getAccounts, getAccountById, createAccount, updateAccount, deleteAccount } from '@/api/account'
import { getStatusColor, getResourceStatusText } from '@/utils/status.util'
import type { FormInstance, FormRules } from 'element-plus'

// 数据列表
const tableData = ref([])
const loading = ref(false)

// 搜索表单
const searchForm = reactive({
  keyword: ''
})

// 显示停用数据
const showInactive = ref(false)

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 主对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增账户')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive({
  id: '',
  code: '',
  name: '',
  type: 'bank',
  bankName: '',
  accountNo: '',
  balance: 0,
  status: 'active'
})

// 表单验证规则
const formRules: FormRules = {
  code: [
    { required: true, message: '请输入账户编码', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入账户名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择类型', trigger: 'change' }
  ]
}
const fetchAccounts = async () => {
  try {
    loading.value = true
    const params: any = {
      page: pagination.page,
      limit: pagination.limit,
    }
    
    // 根据showInactive状态决定是否显示禁用数据
    if (!showInactive.value) {
      params.status = 'active'
    }
    
    // 如果有搜索关键词
    if (searchForm.keyword) {
      params.search = searchForm.keyword
    }
    
    const response = await getAccounts(params)
    if (response.success) {
      tableData.value = response.data.items
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('获取账户列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchAccounts()
}

// 重置搜索
const handleReset = () => {
  searchForm.keyword = ''
  pagination.page = 1
  fetchAccounts()
}

// 切换显示停用数据
const toggleShowInactive = () => {
  showInactive.value = !showInactive.value
  fetchAccounts()
}

// 新增
const handleCreate = () => {
  dialogTitle.value = '新增账户'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row: any) => {
  try {
    dialogTitle.value = '编辑账户'
    isEdit.value = true
    
    const response = await getAccountById(row.id)
    if (response.success) {
      const account = response.data
      Object.assign(formData, account)
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取账户详情失败:', error)
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除账户 "${row.name}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteAccount(row.id)
    ElMessage.success('删除成功')
    fetchAccounts()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除账户失败:', error)
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitLoading.value = true
    
    if (isEdit.value) {
      await updateAccount(formData.id, formData)
      ElMessage.success('更新成功')
    } else {
      await createAccount(formData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    fetchAccounts()
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  formData.id = ''
  formData.code = ''
  formData.name = ''
  formData.type = 'bank'
  formData.bankName = ''
  formData.accountNo = ''
  formData.balance = 0
  formData.status = 'active'
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
  fetchAccounts()
}

// 当前页改变
const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchAccounts()
}

// 初始化
onMounted(() => {
  fetchAccounts()
})
</script>

<style scoped>
.account-list {
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

.negative-balance {
  color: #F56C6C;
  font-weight: bold;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}
</style>