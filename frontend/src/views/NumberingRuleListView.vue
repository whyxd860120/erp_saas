<template>
  <div class="numbering-rule-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>单据编码规则</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新增规则
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="业务类型">
          <el-select v-model="searchForm.businessType" placeholder="请选择业务类型" clearable>
            <el-option
              v-for="(name, value) in businessTypeOptions"
              :key="value"
              :label="name"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="tableData" stripe border style="width: 100%">
        <el-table-column prop="tenantName" label="所属租户" width="150" v-if="isSuperAdmin" />
        <el-table-column prop="businessTypeName" label="业务类型" width="150" />
        <el-table-column prop="name" label="规则名称" width="180" />
        <el-table-column label="编号格式" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="getPreviewNo(row)" placement="top">
              <span class="number-preview">{{ getPreviewNo(row) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="sequenceLength" label="序号位数" width="100" align="center" />
        <el-table-column prop="resetTypeName" label="重置周期" width="100" align="center" />
        <el-table-column prop="currentNumber" label="当前序号" width="100" align="center" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small" 
              @click="handleEdit(row)"
              :disabled="isSuperAdmin"
            >
              编辑
            </el-button>
            <el-button 
              type="success" 
              size="small" 
              @click="handleGenerateNumber(row)"
              :disabled="isSuperAdmin"
            >
              生成编号
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="handleDelete(row)"
              :disabled="isSuperAdmin"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 系统管理员提示 -->
    <el-alert
      v-if="isSuperAdmin"
      title="系统管理员提示"
      type="info"
      :closable="false"
      style="margin-top: 20px;"
    >
      <p>系统管理员可以查看所有租户的单据编码规则，但无法直接创建、修改或删除规则。</p>
      <p>如需修改特定租户的规则，请进入租户管理页面选择相应租户进行操作。</p>
    </el-alert>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="120px">
        <el-form-item label="业务类型" prop="businessType" :disabled="isEdit">
          <el-select v-model="form.businessType" placeholder="请选择业务类型" style="width: 100%">
            <el-option
              v-for="(name, value) in businessTypeOptions"
              :key="value"
              :label="name"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="form.name" placeholder="如：采购订单编号规则" />
        </el-form-item>
        <el-form-item label="前缀" prop="prefix">
          <el-input v-model="form.prefix" placeholder="如：PO、SO" />
        </el-form-item>
        <el-form-item label="日期格式" prop="dateFormat">
          <el-select v-model="form.dateFormat" placeholder="请选择日期格式" style="width: 100%">
            <el-option label="年月日 (20260121)" value="YYYYMMDD" />
            <el-option label="年月 (202601)" value="YYYYMM" />
            <el-option label="年 (2026)" value="YYYY" />
            <el-option label="无日期" value="" />
          </el-select>
        </el-form-item>
        <el-form-item label="分隔符" prop="separator">
          <el-input v-model="form.separator" placeholder="如：-、/" style="width: 200px" />
        </el-form-item>
        <el-form-item label="序号位数" prop="sequenceLength">
          <el-input-number v-model="form.sequenceLength" :min="3" :max="10" />
        </el-form-item>
        <el-form-item label="起始序号" prop="startNumber">
          <el-input-number v-model="form.startNumber" :min="1" />
        </el-form-item>
        <el-form-item label="重置周期" prop="resetType">
          <el-select v-model="form.resetType" placeholder="请选择重置周期" style="width: 100%">
            <el-option label="每天" value="daily" />
            <el-option label="每月" value="monthly" />
            <el-option label="每年" value="yearly" />
            <el-option label="从不" value="never" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">停用</el-radio>
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

    <!-- 生成编号对话框 -->
    <el-dialog
      v-model="generateDialogVisible"
      title="生成编号"
      width="400px"
    >
      <div class="generate-result">
        <p>业务类型：{{ selectedRule?.businessTypeName }}</p>
        <p>生成的编号：</p>
        <div class="generated-number">{{ generatedNumber }}</div>
      </div>

      <template #footer>
        <el-button @click="generateDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyToClipboard">
          复制编号
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getNumberingRules, createNumberingRule, updateNumberingRule, deleteNumberingRule, generateNextNumber } from '@/api/numbering-rule'
import { useAuthStore } from '@/stores/auth'
import type { FormInstance, FormRules } from 'element-plus'

const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.user?.role === 'super_admin')

// 业务类型选项
const businessTypeOptions = {
  purchase_order: '采购订单',
  sales_order: '销售订单',
  purchase_inbound: '采购入库',
  sales_outbound: '销售出库',
  payment_receipt: '收款单',
  payment_payment: '付款单',
  stock_take: '盘点单',
  other_inbound: '其他入库',
  other_outbound: '其他出库',
  stock_transfer: '调拨单',
}

// 表格数据
const tableData = ref([])
const loading = ref(false)

// 搜索表单
const searchForm = reactive({
  businessType: '',
  status: '',
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增规则')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  id: '',
  businessType: '',
  name: '',
  prefix: '',
  dateFormat: 'YYYYMMDD',
  separator: '-',
  sequenceLength: 4,
  startNumber: 1,
  resetType: 'never',
  status: 'active',
})

const formRules: FormRules = {
  businessType: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  prefix: [{ required: true, message: '请输入前缀', trigger: 'blur' }],
}

// 生成编号对话框
const generateDialogVisible = ref(false)
const selectedRule = ref<any>(null)
const generatedNumber = ref('')

// 获取列表
const fetchData = async () => {
  try {
    loading.value = true
    const response: any = await getNumberingRules(searchForm)
    if (response.success) {
      tableData.value = response.data || []
    }
  } catch (error) {
    console.error('获取编码规则列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  fetchData()
}

// 重置
const handleReset = () => {
  searchForm.businessType = ''
  searchForm.status = ''
  fetchData()
}

// 新增
const handleCreate = () => {
  if (isSuperAdmin.value) {
    ElMessage.warning('系统管理员不能直接创建编码规则，请在租户管理中进入相应租户进行操作')
    return
  }
  
  isEdit.value = false
  dialogTitle.value = '新增规则'
  resetFormData()
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: any) => {
  if (isSuperAdmin.value) {
    ElMessage.warning('系统管理员不能直接编辑编码规则，请在租户管理中进入相应租户进行操作')
    return
  }
  
  isEdit.value = true
  dialogTitle.value = '编辑规则'
  form.id = row.id
  form.businessType = row.businessType
  form.name = row.name
  form.prefix = row.prefix
  form.dateFormat = row.dateFormat
  form.separator = row.separator
  form.sequenceLength = row.sequenceLength
  form.startNumber = row.startNumber
  form.resetType = row.resetType
  form.status = row.status
  dialogVisible.value = true
}

// 删除
const handleDelete = (row: any) => {
  if (isSuperAdmin.value) {
    ElMessage.warning('系统管理员不能直接删除编码规则，请在租户管理中进入相应租户进行操作')
    return
  }
  
  ElMessageBox.confirm(
    `确定要删除规则"${row.name}"吗？`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const response: any = await deleteNumberingRule(row.id)
      if (response.success) {
        ElMessage.success('删除成功')
        await fetchData()
      }
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }).catch(() => {
    // 用户取消
  })
}

// 生成编号
const handleGenerate = (row: any) => {
  if (isSuperAdmin.value) {
    ElMessage.warning('系统管理员不能直接生成编号，请切换到相应租户进行业务操作')
    return
  }
  
  selectedRule.value = row
  generateDialogVisible.value = true
}

// 提交
const handleSubmit = async () => {
  if (!formRef.value) return
  
  // 系统管理员不能直接创建/修改编码规则
  if (isSuperAdmin.value) {
    ElMessage.error('系统管理员不能直接创建编码规则，请在租户管理中进入相应租户进行操作')
    return
  }
  
  await formRef.value.validate()
  
  try {
    submitLoading.value = true
    if (isEdit.value) {
      const response: any = await updateNumberingRule(form.id, form)
      if (response.success) {
        ElMessage.success('更新成功')
        dialogVisible.value = false
        fetchData()
      }
    } else {
      const response: any = await createNumberingRule(form)
      if (response.success) {
        ElMessage.success('创建成功')
        dialogVisible.value = false
        fetchData()
      }
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

// 生成编号
const handleGenerateNumber = async (row: any) => {
  if (isSuperAdmin.value) {
    ElMessage.warning('系统管理员不能直接生成编号，请切换到相应租户进行业务操作')
    return
  }
  
  try {
    const response: any = await generateNextNumber(row.businessType)
    if (response.success) {
      selectedRule.value = row
      generatedNumber.value = response.data.number
      generateDialogVisible.value = true
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || '生成编号失败')
  }
}

// 复制到剪贴板
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(generatedNumber.value)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 获取预览编号
const getPreviewNo = (row: any) => {
  const dateStr = getPreviewDate(row.dateFormat)
  const seq = String(row.startNumber).padStart(row.sequenceLength, '0')
  return `${row.prefix}${row.separator}${dateStr}${row.separator}${seq}`
}

// 获取预览日期
const getPreviewDate = (format: string) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('YY', String(year).slice(-2))
    .replace('MM', month)
    .replace('DD', day)
}

// 重置表单
const resetFormData = () => {
  form.id = ''
  form.businessType = ''
  form.name = ''
  form.prefix = ''
  form.dateFormat = 'YYYYMMDD'
  form.separator = '-'
  form.sequenceLength = 4
  form.startNumber = 1
  form.resetType = 'never'
  form.status = 'active'
}

const resetForm = () => {
  formRef.value?.resetFields()
  resetFormData()
}

// 初始化
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.numbering-rule-list {
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

.number-preview {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #409eff;
  cursor: pointer;
}

.generate-result {
  text-align: center;
  padding: 20px;
}

.generate-result p {
  margin: 10px 0;
  color: #606266;
}

.generated-number {
  font-size: 24px;
  font-weight: bold;
  color: #67c23a;
  font-family: 'Courier New', monospace;
  padding: 20px;
  background: #f0f9eb;
  border-radius: 8px;
  margin-top: 20px;
}
</style>