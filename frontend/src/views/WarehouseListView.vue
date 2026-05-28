<template>
  <div class="warehouse-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>仓库管理</span>
          <div class="header-actions">
            <el-button @click="handleImport">
              <el-icon><Upload /></el-icon>
              导入
            </el-button>
            <el-button @click="handleExport">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
            <el-button type="primary" @click="handleCreate">
              <el-icon><Plus /></el-icon>
              新增仓库
            </el-button>
            <el-button :type="showInactive ? 'warning' : 'default'" @click="toggleShowInactive">
              <el-icon><View v-if="!showInactive" /><Hide v-else /></el-icon>
              {{ showInactive ? '隐藏禁用' : '显示禁用' }}
            </el-button>
            <el-button @click="handleHelp">
              <el-icon><QuestionFilled /></el-icon>
              帮助
            </el-button>
          </div>
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
        </el-form-item>
      </el-form>
      
      <!-- 表格 -->
      <el-table :data="tableData" stripe border style="width: 100%">
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column prop="name" label="名称" width="180" />
        <el-table-column prop="address" label="地址" show-overflow-tooltip />
        <el-table-column prop="manager" label="负责人" width="120" />
        <el-table-column prop="phone" label="电话" width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusColor(row.status)">
              {{ getResourceStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
            <el-button :type="row.status === 'active' ? 'warning' : 'success'" size="small" @click="handleToggleStatus(row)">
              {{ row.status === 'active' ? '禁用' : '启用' }}
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
          <el-input v-model="formData.code" placeholder="请输入仓库编码" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入仓库名称" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="formData.address" type="textarea" :rows="3" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="负责人" prop="manager">
          <el-input v-model="formData.manager" placeholder="请输入负责人" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
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

    <!-- 导入对话框 -->
    <CommonImportDialog
      v-model="importDialogVisible"
      title="仓库导入"
      :columns="importColumns"
      :format-tips="formatTips"
      :import-fn="handleImportSubmit"
      @success="handleImportSuccess"
    />

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      module-name="仓库管理"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Upload, View, Hide, QuestionFilled } from '@element-plus/icons-vue'
import { getWarehouses, getWarehouseById, createWarehouse, updateWarehouse, deleteWarehouse } from '@/api/warehouse'
import { getStatusColor, getResourceStatusText } from '@/utils/status.util'
import CommonImportDialog from '@/components/CommonImportDialog.vue'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'
import type { FormInstance, FormRules } from 'element-plus'

interface Warehouse {
  id: string
  code: string
  name: string
  address?: string
  manager?: string
  phone?: string
  status: string
}

declare const XLSX: any

// 数据列表
const tableData = ref<Warehouse[]>([])
const loading = ref(false)

// 搜索表单
const searchForm = reactive({
  keyword: ''
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增仓库')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

// 导入对话框
const importDialogVisible = ref(false)

// 显示停用数据
const showInactive = ref(false)
const helpDialogVisible = ref(false)

// 导入列配置
const importColumns = [
  { prop: 'code', label: '仓库编码', required: true, unique: true },
  { prop: 'name', label: '仓库名称', required: true },
  { prop: 'address', label: '地址' },
  { prop: 'manager', label: '负责人' },
  { prop: 'phone', label: '电话' },
  { prop: 'status', label: '状态' }
]

// 格式提示
const formatTips = [
  '仓库编码：必填，唯一标识，如 WH001',
  '仓库名称：必填，仓库名称',
  '地址：可选，仓库详细地址',
  '负责人：可选，仓库负责人姓名',
  '电话：可选，联系电话',
  '状态：可选，启用/禁用，默认启用'
]

// 表单数据
const formData = reactive({
  id: '',
  code: '',
  name: '',
  address: '',
  manager: '',
  phone: '',
  status: 'active'
})

// 表单验证规则
const formRules: FormRules = {
  code: [
    { required: true, message: '请输入仓库编码', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入仓库名称', trigger: 'blur' }
  ]
}

// 获取仓库列表
const fetchWarehouses = async () => {
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
    
    const response = await getWarehouses(params)
    if (response.success) {
      tableData.value = response.data.items
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('获取仓库列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchWarehouses()
}

// 重置搜索
const handleReset = () => {
  searchForm.keyword = ''
  pagination.page = 1
  fetchWarehouses()
}

// 新增
const handleCreate = () => {
  dialogTitle.value = '新增仓库'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row: any) => {
  try {
    dialogTitle.value = '编辑仓库'
    isEdit.value = true
    
    const response = await getWarehouseById(row.id)
    if (response.success) {
      const warehouse = response.data
      Object.assign(formData, warehouse)
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取仓库详情失败:', error)
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除仓库 "${row.name}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteWarehouse(row.id)
    ElMessage.success('删除成功')
    fetchWarehouses()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除仓库失败:', error)
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
      await updateWarehouse(formData.id, formData)
      ElMessage.success('更新成功')
    } else {
      await createWarehouse(formData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    fetchWarehouses()
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
  formData.address = ''
  formData.manager = ''
  formData.phone = ''
  formData.status = 'active'
}

// 关闭对话框
const handleDialogClose = () => {
  resetForm()
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 导入
const handleImport = () => {
  importDialogVisible.value = true
}

// 导入提交
const handleImportSubmit = async (row: any) => {
  try {
    // 验证必填字段
    if (!row.code || !row.name) {
      return { success: false, message: '仓库编码和名称为必填项' }
    }
    
    // 检查编码是否已存在
    const exists = tableData.value.some(item => item.code === row.code)
    if (exists) {
      return { success: false, message: `仓库编码 "${row.code}" 已存在` }
    }
    
    // 处理状态
    let status = 'active'
    if (row.status) {
      const statusStr = String(row.status).trim()
      if (statusStr === '禁用' || statusStr === '停用' || statusStr === 'inactive') {
        status = 'inactive'
      }
    }
    
    // 创建仓库
    const warehouse = {
      code: String(row.code).trim(),
      name: String(row.name).trim(),
      address: row.address ? String(row.address).trim() : '',
      manager: row.manager ? String(row.manager).trim() : '',
      phone: row.phone ? String(row.phone).trim() : '',
      status: status
    }
    
    // 调用API创建
    await createWarehouse(warehouse)
    
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || '导入失败' }
  }
}

// 导入成功
const handleImportSuccess = () => {
  ElMessage.success('导入成功')
  fetchWarehouses()
}

// 切换显示停用数据
const toggleShowInactive = () => {
  showInactive.value = !showInactive.value
  fetchWarehouses()
}

// 切换状态
const handleToggleStatus = async (row: any) => {
  try {
    const isActive = row.status === 'active'
    const action = isActive ? '禁用' : '启用'
    await ElMessageBox.confirm(`确定${action}仓库 "${row.name}" 吗？`, '确认', { type: 'warning' })
    
    // 调用API更新状态
    await updateWarehouse(row.id, { ...row, status: isActive ? 'inactive' : 'active' })
    ElMessage.success(`${action}成功`)
    fetchWarehouses()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 导出
const handleExport = () => {
  try {
    // 准备导出数据
    const exportData = tableData.value.map(item => ({
      '仓库编码': item.code,
      '仓库名称': item.name,
      '地址': item.address || '',
      '负责人': item.manager || '',
      '电话': item.phone || '',
      '状态': item.status === 'active' ? '启用' : '禁用'
    }))
    
    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '仓库列表')
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 40 },
      { wch: 12 }, { wch: 15 }, { wch: 8 }
    ]
    
    // 导出文件
    XLSX.writeFile(wb, `仓库列表_${new Date().toISOString().split('T')[0]}.xlsx`)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 分页大小改变
const handleSizeChange = (val: number) => {
  pagination.limit = val
  pagination.page = 1
  fetchWarehouses()
}

// 当前页改变
const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchWarehouses()
}

// 帮助数据
const helpData = {
  operations: [
    {
      title: '新增仓库',
      steps: [
        '点击"新增仓库"按钮',
        '填写仓库编码、名称等基本信息',
        '设置负责人、联系电话',
        '填写仓库地址',
        '选择启用或禁用状态',
        '点击"确定"保存'
      ]
    },
    {
      title: '编辑仓库',
      steps: [
        '在仓库列表中找到要编辑的仓库',
        '点击"编辑"按钮',
        '修改需要更新的信息',
        '点击"确定"保存修改'
      ]
    },
    {
      title: '删除仓库',
      steps: [
        '在仓库列表中找到要删除的仓库',
        '点击"删除"按钮',
        '确认删除操作',
        '注意：有库存的仓库无法删除'
      ]
    },
    {
      title: '导入仓库',
      steps: [
        '点击"导入"按钮',
        '下载导入模板',
        '按照模板格式填写仓库信息',
        '上传填写好的Excel文件',
        '系统会自动验证数据格式',
        '确认导入'
      ]
    },
    {
      title: '导出仓库',
      steps: [
        '点击"导出"按钮',
        '系统会导出当前列表中的所有仓库',
        '导出文件为Excel格式，可用于数据备份'
      ]
    }
  ],
  notices: [
    '仓库编码必须唯一，重复的编码无法导入',
    '有库存的仓库无法删除，请先清理库存',
    '删除操作不可恢复，请谨慎操作',
    '仓库是库存管理的基础，建议提前规划好仓库结构',
    '禁用的仓库不能用于出入库操作'
  ],
  tips: [
    '使用搜索功能可以快速查找仓库',
    '点击"显示禁用"可以查看已禁用的仓库',
    '定期导出仓库数据进行备份',
    '仓库编码建议使用有意义的编号规则',
    '可以设置多个仓库实现多仓库管理'
  ],
  shortcuts: [
    { key: 'Ctrl+F', description: '快速搜索仓库' },
    { key: 'F5', description: '刷新仓库列表' },
    { key: 'Ctrl+N', description: '新增仓库' }
  ],
  version: '1.0.0',
  lastUpdate: '2025-05-28',
  changes: [
    '新增仓库管理功能',
    '支持导入导出',
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
})
</script>

<style scoped>
.warehouse-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
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