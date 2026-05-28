<template>
  <div class="role-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">角色权限管理</h2>
      </div>
      <div class="header-right">
        <el-button @click="handleHelp">
          <el-icon><QuestionFilled /></el-icon>
          帮助
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新增角色
        </el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="角色名称" min-width="150" />
        <el-table-column prop="code" label="角色编码" width="150" />
        <el-table-column label="权限数量" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row._count?.rolePermissions || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户数量" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row._count?.userRoles || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusColor(row.status)" size="small">
              {{ getResourceStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="handlePermission(row)">功能权限</el-button>
            <el-button link type="primary" size="small" @click="handleDataPermission(row)">数据权限</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="formData.code" placeholder="请输入角色编码" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="permissionDialogVisible" title="权限配置" width="700px">
      <div class="permission-info" v-if="currentRole">
        角色：{{ currentRole.name }}
      </div>
      <el-tree
        ref="permissionTreeRef"
        :data="permissionTree"
        show-checkbox
        node-key="id"
        :default-expand-all="true"
        :props="{ label: 'name', children: 'children' }"
        class="permission-tree"
      />
      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSavePermission" :loading="permissionLoading">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dataPermissionDialogVisible"
      :title="`数据权限配置 - ${currentRole?.name || ''}`"
      width="800px"
    >
      <div v-loading="dataPermissionLoading">
        <el-table :data="dataPermissionRules" border style="width: 100%">
          <el-table-column label="模块" width="150">
            <template #default="{ row }">
              <el-select v-model="row.module" placeholder="选择模块">
                <el-option
                  v-for="option in moduleOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="字段" width="120">
            <template #default="{ row }">
              <el-select v-model="row.field" placeholder="选择字段" :disabled="!row.module">
                <el-option
                  v-for="option in (fieldOptions as any)[row.module] || []"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作符" width="100">
            <template #default="{ row }">
              <el-select v-model="row.operator" placeholder="操作符">
                <el-option
                  v-for="option in operatorOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="值类型" width="120">
            <template #default="{ row }">
              <el-select v-model="row.valueType" placeholder="值类型">
                <el-option
                  v-for="option in valueTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="自定义值" width="120">
            <template #default="{ row }">
              <el-input
                v-model="row.value"
                placeholder="值"
                :disabled="row.valueType !== 'custom'"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60">
            <template #default="{ $index }">
              <el-button
                type="danger"
                size="small"
                link
                @click="removeDataPermissionRule($index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" link @click="addDataPermissionRule" style="margin-top: 10px">
          <el-icon><Plus /></el-icon>
          添加规则
        </el-button>
      </div>
      <template #footer>
        <el-button @click="dataPermissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveDataPermissions" :loading="dataPermissionLoading">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      module-name="角色权限管理"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, QuestionFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { getRoles, createRole, updateRole, deleteRole, getRolePermissions, updateRolePermissions } from '@/api/role'
import { getPermissions } from '@/api/permission'
import {
  getDataPermissionRules,
  batchSetDataPermissionRules
} from '@/api/data-permission'
import { getStatusColor, getResourceStatusText } from '@/utils/status.util'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'

const loading = ref(false)
const submitLoading = ref(false)
const permissionLoading = ref(false)
const dialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const helpDialogVisible = ref(false)
const dialogTitle = ref('新增角色')
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const permissionTreeRef = ref<any>()

const tableData = ref<any[]>([])
const currentRole = ref<any>(null)
const checkedPermissions = ref<string[]>([])
const permissionTree = ref<any[]>([])

const formData = reactive({
  id: '',
  name: '',
  code: '',
  description: '',
  status: 'active'
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
}

const fetchRoles = async () => {
  loading.value = true
  try {
    const res: any = await getRoles()
    if (res.success) {
      tableData.value = res.data.items || []
    }
  } catch (error) {
    console.error('获取角色列表失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchPermissions = async () => {
  try {
    const res: any = await getPermissions()
    if (res.success) {
      permissionTree.value = res.data || []
    }
  } catch (error) {
    console.error('获取权限树失败:', error)
  }
}

const handleCreate = () => {
  dialogTitle.value = '新增角色'
  isEdit.value = false
  Object.assign(formData, { id: '', name: '', code: '', description: '', status: 'active' })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑角色'
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description || '',
    status: row.status
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate()

  submitLoading.value = true
  try {
    if (isEdit.value) {
      const res: any = await updateRole(formData.id, {
        name: formData.name,
        description: formData.description,
        status: formData.status
      })
      if (res.success) {
        ElMessage.success('更新成功')
        dialogVisible.value = false
        fetchRoles()
      }
    } else {
      const res: any = await createRole({
        name: formData.name,
        code: formData.code,
        description: formData.description
      })
      if (res.success) {
        ElMessage.success('创建成功')
        dialogVisible.value = false
        fetchRoles()
      }
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除角色 "${row.name}" 吗？`, '确认删除', { type: 'warning' })
    const res: any = await deleteRole(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      fetchRoles()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

const handlePermission = async (row: any) => {
  currentRole.value = row
  permissionLoading.value = true
  try {
    const res: any = await getRolePermissions(row.id)
    if (res.success) {
      checkedPermissions.value = res.data.map((p: any) => p.id)
      setTimeout(() => {
        permissionTreeRef.value?.setCheckedKeys(checkedPermissions.value)
      }, 100)
    }
    permissionDialogVisible.value = true
  } catch (error) {
    console.error('获取角色权限失败:', error)
    ElMessage.error('获取权限失败')
  } finally {
    permissionLoading.value = false
  }
}

const handleSavePermission = async () => {
  if (!currentRole.value) return

  const checkedKeys = permissionTreeRef.value?.getCheckedKeys() || []
  const halfCheckedKeys = permissionTreeRef.value?.getHalfCheckedKeys() || []
  const allKeys = [...checkedKeys, ...halfCheckedKeys]

  permissionLoading.value = true
  try {
    const res: any = await updateRolePermissions(currentRole.value.id, {
      permissionIds: allKeys
    })
    if (res.success) {
      ElMessage.success('权限配置成功')
      permissionDialogVisible.value = false
      fetchRoles()
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '权限配置失败')
  } finally {
    permissionLoading.value = false
  }
}

const dataPermissionDialogVisible = ref(false)
const dataPermissionRules = ref<any[]>([])
const dataPermissionLoading = ref(false)
const moduleOptions = [
  { label: '销售订单', value: 'sales_order' },
  { label: '客户', value: 'customer' },
  { label: '收款单', value: 'payment_receipt' },
]
const fieldOptions: any = {
  sales_order: [
    { label: '业务员', value: 'salesmanId' },
    { label: '创建人', value: 'creatorId' },
  ],
  customer: [
    { label: '业务员', value: 'salesmanId' },
    { label: '创建人', value: 'creatorId' },
  ],
  payment_receipt: [
    { label: '业务员', value: 'salesmanId' },
    { label: '创建人', value: 'creatorId' },
  ],
}
const operatorOptions = [
  { label: '等于', value: 'eq' },
  { label: '包含', value: 'in' },
  { label: '模糊匹配', value: 'like' },
]
const valueTypeOptions = [
  { label: '当前用户', value: 'current_user' },
  { label: '当前部门', value: 'current_dept' },
  { label: '自定义', value: 'custom' },
]

const handleDataPermission = async (row: any) => {
  currentRole.value = row
  dataPermissionDialogVisible.value = true
  dataPermissionLoading.value = true
  try {
    const res: any = await getDataPermissionRules(row.id)
    if (res.success) {
      dataPermissionRules.value = res.data || []
    }
  } catch (error) {
    console.error('获取数据权限规则失败:', error)
  } finally {
    dataPermissionLoading.value = false
  }
}

const addDataPermissionRule = () => {
  dataPermissionRules.value.push({
    module: '',
    field: '',
    operator: 'eq',
    valueType: 'current_user',
    value: '',
    description: '',
    status: 'active',
  })
}

const removeDataPermissionRule = (index: number) => {
  dataPermissionRules.value.splice(index, 1)
}

const handleSaveDataPermissions = async () => {
  if (!currentRole.value) return

  dataPermissionLoading.value = true
  try {
    const rules = dataPermissionRules.value.filter(rule => rule.module && rule.field)
    const res: any = await batchSetDataPermissionRules(currentRole.value.id, rules)
    if (res.success) {
      ElMessage.success('数据权限配置成功')
      dataPermissionDialogVisible.value = false
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '数据权限配置失败')
  } finally {
    dataPermissionLoading.value = false
  }
}

// 帮助数据
const helpData = {
  operations: [
    {
      title: '新增角色',
      steps: [
        '点击"新增角色"按钮',
        '填写角色名称和编码',
        '填写角色描述',
        '选择启用或禁用状态',
        '点击"确定"保存'
      ]
    },
    {
      title: '配置权限',
      steps: [
        '在角色列表中找到要配置权限的角色',
        '点击"权限"按钮',
        '勾选需要分配的功能权限',
        '点击"保存"完成权限配置'
      ]
    },
    {
      title: '配置数据权限',
      steps: [
        '在角色列表中找到要配置数据权限的角色',
        '点击"数据权限"按钮',
        '添加数据权限规则',
        '设置资源类型、权限类型和值',
        '点击"保存"完成数据权限配置'
      ]
    }
  ],
  notices: [
    '角色编码必须唯一',
    '权限配置决定了角色可以访问的功能',
    '数据权限决定了角色可以访问的数据范围',
    '删除角色会影响关联的用户权限',
    '禁用的角色无法分配给用户'
  ],
  tips: [
    '角色是权限管理的基础单元',
    '可以按部门、职位等维度设计角色',
    '功能权限控制菜单和按钮的访问',
    '数据权限控制数据的可见范围',
    '建议定期审查角色权限配置'
  ],
  shortcuts: [
    { key: 'Ctrl+F', description: '快速搜索角色' },
    { key: 'F5', description: '刷新角色列表' },
    { key: 'Ctrl+N', description: '新增角色' }
  ],
  version: '1.0.0',
  lastUpdate: '2025-05-28',
  changes: [
    '新增角色权限管理功能',
    '支持功能权限和数据权限',
    '新增帮助文档功能'
  ]
}

// 打开帮助
const handleHelp = () => {
  helpDialogVisible.value = true
}

onMounted(() => {
  fetchRoles()
  fetchPermissions()
})
</script>

<style scoped>
.role-page {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header .page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.table-card {
  margin-bottom: 20px;
}
.permission-info {
  margin-bottom: 15px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  color: #606266;
}
.permission-tree {
  max-height: 400px;
  overflow-y: auto;
}
</style>