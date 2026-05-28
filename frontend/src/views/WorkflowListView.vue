<template>
  <div class="workflow-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>工作流管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleCreate">
              <el-icon><Plus /></el-icon>
              新建工作流
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="单据类型">
          <el-select v-model="searchForm.documentType" placeholder="请选择" clearable style="width: 150px">
            <el-option
              v-for="item in documentTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
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
        <el-table-column prop="name" label="流程名称" min-width="150" />
        <el-table-column prop="code" label="流程编码" width="120" />
        <el-table-column label="单据类型" width="120">
          <template #default="{ row }">
            {{ getDocumentTypeLabel(row.documentType) }}
          </template>
        </el-table-column>
        <el-table-column label="版本" width="80">
          <template #default="{ row }">
            v{{ row.version }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审批节点" width="100">
          <template #default="{ row }">
            {{ row.nodes?.length || 0 }} 个
          </template>
        </el-table-column>
        <el-table-column label="已使用" width="100">
          <template #default="{ row }">
            {{ row._count?.instances || 0 }} 次
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
            <el-button
              :type="row.isActive ? 'warning' : 'success'"
              link
              size="small"
              @click="handleToggleStatus(row)"
            >
              {{ row.isActive ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="流程名称" prop="name">
          <el-input v-model="formData.name" placeholder="如：采购订单审批" />
        </el-form-item>
        <el-form-item label="流程编码" prop="code">
          <el-input v-model="formData.code" placeholder="如：PO_APPROVAL" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="单据类型" prop="documentType">
          <el-select v-model="formData.documentType" placeholder="请选择" style="width: 100%">
            <el-option
              v-for="item in documentTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="流程描述" prop="description">
          <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="描述此流程的用途" />
        </el-form-item>

        <el-divider content-position="left">审批节点</el-divider>

        <div class="nodes-container">
          <div v-for="(node, index) in formData.nodes" :key="index" class="node-item">
            <el-card shadow="never">
              <div class="node-header">
                <span class="node-label">节点 {{ index + 1 }}</span>
                <el-button type="danger" link size="small" @click="removeNode(index)">
                  移除
                </el-button>
              </div>
              <el-form-item label="节点名称" required>
                <el-input v-model="node.name" placeholder="如：部门主管审批" />
              </el-form-item>
              <el-form-item label="审批人类型" required>
                <el-select v-model="node.approverType" style="width: 100%">
                  <el-option label="指定用户" value="approver" />
                  <el-option label="指定角色" value="role" />
                  <el-option label="部门主管" value="department_head" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="node.approverType === 'approver'" label="指定审批人">
                <el-select v-model="node.approverId" placeholder="请选择审批人" style="width: 100%">
                  <el-option
                    v-for="user in userList"
                    :key="user.id"
                    :label="user.name"
                    :value="user.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item v-if="node.approverType === 'role'" label="指定角色">
                <el-select v-model="node.approverRoleId" placeholder="请选择角色" style="width: 100%">
                  <el-option
                    v-for="role in roleList"
                    :key="role.id"
                    :label="role.name"
                    :value="role.id"
                  />
                </el-select>
              </el-form-item>
            </el-card>
          </div>
          <el-button type="dashed" style="width: 100%; margin-top: 10px" @click="addNode">
            <el-icon><Plus /></el-icon>
            添加审批节点
          </el-button>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getWorkflowDefinitions,
  getDocumentTypes,
  createWorkflowDefinition,
  updateWorkflowDefinition,
  deleteWorkflowDefinition
} from '@/api/workflow'
import { getUsers } from '@/api/user'
import { getRoles } from '@/api/role'
import type { FormInstance, FormRules } from 'element-plus'

const tableData = ref([])
const loading = ref(false)
const documentTypes = ref<any[]>([])
const userList = ref<any[]>([])
const roleList = ref<any[]>([])

const searchForm = reactive({
  documentType: ''
})

const dialogVisible = ref(false)
const dialogTitle = ref('新建工作流')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  id: '',
  name: '',
  code: '',
  documentType: '',
  description: '',
  nodes: [] as any[]
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入流程名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入流程编码', trigger: 'blur' }],
  documentType: [{ required: true, message: '请选择单据类型', trigger: 'change' }]
}

function getDocumentTypeLabel(type: string) {
  const item = documentTypes.value.find(d => d.value === type)
  return item?.label || type
}

async function loadData() {
  try {
    loading.value = true
    const params: any = {}
    if (searchForm.documentType) {
      params.documentType = searchForm.documentType
    }
    const res: any = await getWorkflowDefinitions(params)
    if (res.success) {
      tableData.value = res.data || []
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    loading.value = false
  }
}

async function loadDocumentTypes() {
  const res: any = await getDocumentTypes()
  if (res.success) {
    documentTypes.value = res.data || []
  }
}

async function loadUsers() {
  const res: any = await getUsers({ page: 1, limit: 1000 })
  if (res.success) {
    userList.value = res.data.items || []
  }
}

async function loadRoles() {
  const res: any = await getRoles()
  if (res.success) {
    roleList.value = res.data || []
  }
}

function handleSearch() {
  loadData()
}

function handleReset() {
  searchForm.documentType = ''
  loadData()
}

function handleCreate() {
  dialogTitle.value = '新建工作流'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: any) {
  dialogTitle.value = '编辑工作流'
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    code: row.code,
    documentType: row.documentType,
    description: row.description || '',
    nodes: row.nodes || []
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除工作流 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res: any = await deleteWorkflowDefinition(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadData()
    }
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '删除失败')
    }
  }
}

async function handleToggleStatus(row: any) {
  const action = row.isActive ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定${action}工作流 "${row.name}" 吗？`, '提示', { type: 'warning' })
    const res: any = await updateWorkflowDefinition(row.id, { isActive: !row.isActive })
    if (res.success) {
      ElMessage.success(`${action}成功`)
      loadData()
    }
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '操作失败')
    }
  }
}

function addNode() {
  formData.nodes.push({
    name: '',
    nodeType: 'approval',
    approverType: 'role',
    approverId: '',
    approverRoleId: '',
    conditions: []
  })
}

function removeNode(index: number) {
  formData.nodes.splice(index, 1)
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()

  submitLoading.value = true
  try {
    const payload = {
      name: formData.name,
      code: formData.code,
      documentType: formData.documentType,
      description: formData.description,
      nodes: formData.nodes
    }

    let res: any
    if (isEdit.value) {
      res = await updateWorkflowDefinition(formData.id, payload)
    } else {
      res = await createWorkflowDefinition(payload)
    }

    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadData()
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

function resetForm() {
  formData.id = ''
  formData.name = ''
  formData.code = ''
  formData.documentType = ''
  formData.description = ''
  formData.nodes = []
  formRef.value?.resetFields()
}

function handleDialogClose() {
  resetForm()
}

onMounted(() => {
  loadData()
  loadDocumentTypes()
  loadUsers()
  loadRoles()
})
</script>

<style scoped>
.workflow-list {
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

.nodes-container {
  max-height: 400px;
  overflow-y: auto;
}

.node-item {
  margin-bottom: 10px;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.node-label {
  font-weight: 600;
  color: #409eff;
}
</style>