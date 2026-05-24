<template>
  <div class="person-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>人员管理</span>
          <el-button v-if="hasPermission('user:create')" type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新增人员
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form" @submit.prevent>
        <el-form-item label="人员编码/姓名">
          <el-input v-model="searchForm.keyword" placeholder="请输入编码或姓名" clearable @keyup.enter="handleSearch" style="width: 280px" />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="searchForm.departmentId" placeholder="请选择部门" clearable style="width: 180px">
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="系统用户">
          <el-select v-model="searchForm.isSystemUser" placeholder="全部" clearable style="width: 120px">
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="在职" value="active" />
            <el-option label="离职" value="inactive" />
            <el-option label="已辞职" value="resigned" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="tableData" stripe border style="width: 100%" v-loading="loading">
        <el-table-column prop="code" label="人员编码" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column label="系统用户" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isSystemUser ? 'success' : 'info'" size="small">
              {{ row.isSystemUser ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户名" width="120">
          <template #default="{ row }">
            {{ row.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="电话" width="150" />
        <el-table-column label="部门" width="150">
          <template #default="{ row }">
            {{ row.department?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="职位" width="150">
          <template #default="{ row }">
            {{ row.position?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="客户数" width="80" align="center">
          <template #default="{ row }">
            {{ row._count?.customers || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="订单数" width="80" align="center">
          <template #default="{ row }">
            {{ row._count?.salesOrders || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="180">
          <template #default="{ row }">
            {{ formatDate(row.lastLoginAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button v-if="hasPermission('user:update')" type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              v-if="hasPermission('user:assign_role')"
              type="success"
              size="small"
              @click="handleAssignRole(row)"
              :disabled="!row.isSystemUser"
            >
              分配角色
            </el-button>
            <el-button
              v-if="hasPermission('user:update')"
              type="warning"
              size="small"
              @click="handleResetPassword(row)"
              :disabled="!row.isSystemUser"
            >
              重置密码
            </el-button>
            <el-button
              v-if="hasPermission('user:delete')"
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
      width="700px"
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
            <el-form-item label="人员编码" prop="code">
              <el-input v-model="formData.code" placeholder="请输入人员编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="formData.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="formData.phone" placeholder="请输入电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="formData.gender">
                <el-radio value="male">男</el-radio>
                <el-radio value="female">女</el-radio>
                <el-radio value="unknown">未知</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="系统用户" prop="isSystemUser">
          <el-radio-group v-model="formData.isSystemUser">
            <el-radio :value="true">是（可登录系统）</el-radio>
            <el-radio :value="false">否（仅业务人员）</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 系统用户需要用户名和密码 -->
        <template v-if="formData.isSystemUser">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="用户名" prop="username" :rules="formData.isSystemUser ? [{ required: true, message: '请输入用户名', trigger: 'blur' }] : []">
                <el-input v-model="formData.username" placeholder="请输入用户名" :disabled="isEdit" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="密码" prop="password" :rules="isEdit ? [] : [{ required: true, message: '请输入密码', trigger: 'blur' }]">
                <el-input v-model="formData.password" type="password" placeholder="请输入密码" show-password />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="角色" prop="role">
            <el-select v-model="formData.role" placeholder="请选择角色" style="width: 100%">
              <el-option label="管理员" value="admin" />
              <el-option label="经理" value="manager" />
              <el-option label="职员" value="staff" />
              <el-option label="查看者" value="viewer" />
            </el-select>
          </el-form-item>
        </template>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属部门" prop="departmentId">
              <el-tree-select
                v-model="formData.departmentId"
                :data="departmentTree"
                :props="{ label: 'name', value: 'id' }"
                placeholder="请选择所属部门"
                clearable
                check-strictly
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="职位" prop="positionId">
              <el-select v-model="formData.positionId" placeholder="请选择职位" clearable style="width: 100%">
                <el-option
                  v-for="pos in positions"
                  :key="pos.id"
                  :label="`${pos.name} (级别:${pos.level})`"
                  :value="pos.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入职日期" prop="hireDate">
              <el-date-picker
                v-model="formData.hireDate"
                type="date"
                placeholder="请选择入职日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出生日期" prop="birthDate">
              <el-date-picker
                v-model="formData.birthDate"
                type="date"
                placeholder="请选择出生日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="formData.idCard" placeholder="请输入身份证号" />
        </el-form-item>

        <el-form-item label="地址" prop="address">
          <el-input v-model="formData.address" placeholder="请输入地址" />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio value="active">在职</el-radio>
            <el-radio value="inactive">离职</el-radio>
            <el-radio value="resigned">已辞职</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 分配角色对话框 -->
    <el-dialog
      v-model="roleDialogVisible"
      title="分配角色"
      width="500px"
    >
      <div class="role-assign-info" v-if="currentUser">
        为用户 <strong>{{ currentUser.name }}</strong> 分配角色
      </div>
      <el-checkbox-group v-model="selectedRoleIds" class="role-checkbox-group">
        <el-checkbox
          v-for="role in availableRoles"
          :key="role.id"
          :value="role.id"
          :label="role.id"
        >
          {{ role.name }}
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="roleLoading" @click="handleSaveRoles">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getUsers, getUserDetail, createUser, updateUser, deleteUser, resetPassword } from '@/api/user'
import { getRoles } from '@/api/role'
import { getUserRoles, updateUserRoles } from '@/api/user-role'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'
import type { FormInstance, FormRules } from 'element-plus'

// 当前用户ID和权限检查
const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id || '')
const { hasPermission } = usePermission()

// 数据列表
const tableData = ref<any[]>([])
const loading = ref(false)

// 部门和职位列表
const departments = ref<any[]>([])
const departmentTree = ref<any[]>([])
const positions = ref<any[]>([])

// 角色相关
const roleDialogVisible = ref(false)
const roleLoading = ref(false)
const currentUser = ref<any>(null)
const selectedRoleIds = ref<string[]>([])
const availableRoles = ref<any[]>([])

// 搜索表单
const searchForm = reactive({
  keyword: '',
  departmentId: '',
  isSystemUser: undefined as boolean | undefined,
  status: 'active'
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增人员')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive({
  code: '',
  name: '',
  username: '',
  password: '',
  phone: '',
  isSystemUser: true,
  departmentId: '',
  positionId: '',
  gender: 'unknown',
  birthDate: null as Date | null,
  hireDate: null as Date | null,
  address: '',
  idCard: '',
  role: 'staff',
  status: 'active',
  remark: ''
})

// 表单验证规则
const formRules = computed(() => ({
  code: [{ required: true, message: '请输入人员编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  username: formData.isSystemUser ? [{ required: true, message: '请输入用户名', trigger: 'blur' }] : [],
  password: !isEdit.value && formData.isSystemUser ? [{ required: true, message: '请输入密码', trigger: 'blur' }] : [],
}))

// 获取用户列表
const fetchUsers = async () => {
  try {
    loading.value = true
    const params: any = {
      page: pagination.page,
      limit: pagination.limit
    }
    if (searchForm.keyword) {
      params.keyword = searchForm.keyword
    }
    if (searchForm.departmentId) {
      params.departmentId = searchForm.departmentId
    }
    if (searchForm.isSystemUser !== undefined) {
      params.isSystemUser = searchForm.isSystemUser
    }
    if (searchForm.status) {
      params.status = searchForm.status
    }

    const response = await getUsers(params)
    if (response.success) {
      tableData.value = response.data.items || []
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取角色列表
const fetchRoles = async () => {
  try {
    const res: any = await getRoles()
    if (res.success) {
      availableRoles.value = res.data.items || []
    }
  } catch (error) {
    console.error('获取角色列表失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchUsers()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    departmentId: '',
    isSystemUser: undefined,
    status: 'active'
  })
  pagination.page = 1
  fetchUsers()
}

// 新增
const handleCreate = () => {
  dialogTitle.value = '新增人员'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row: any) => {
  try {
    dialogTitle.value = '编辑人员'
    isEdit.value = true

    const response = await getUserDetail(row.id)
    if (response.success) {
      const user = response.data
      if (!user) {
        ElMessage.error('获取人员详情失败：数据为空')
        return
      }
      Object.assign(formData, {
        code: user.code,
        name: user.name,
        username: user.username,
        phone: user.phone,
        isSystemUser: user.isSystemUser,
        departmentId: user.departmentId,
        positionId: user.positionId,
        gender: user.gender,
        birthDate: user.birthDate ? new Date(user.birthDate) : null,
        hireDate: user.hireDate ? new Date(user.hireDate) : null,
        address: user.address,
        idCard: user.idCard,
        role: user.role,
        status: user.status,
        remark: user.remark
      })
      dialogVisible.value = true
    } else {
      ElMessage.error(response.message || '获取人员详情失败')
    }
  } catch (error) {
    console.error('获取人员详情失败:', error)
  }
}

// 分配角色
const handleAssignRole = async (row: any) => {
  currentUser.value = row
  roleLoading.value = true
  try {
    // 获取用户当前角色
    const res: any = await getUserRoles(row.id)
    if (res.success) {
      selectedRoleIds.value = res.data.map((r: any) => r.id)
    }
    roleDialogVisible.value = true
  } catch (error) {
    console.error('获取用户角色失败:', error)
    ElMessage.error('获取用户角色失败')
  } finally {
    roleLoading.value = false
  }
}

// 保存角色分配
const handleSaveRoles = async () => {
  if (!currentUser.value) return

  roleLoading.value = true
  try {
    const res: any = await updateUserRoles(currentUser.value.id, {
      roleIds: selectedRoleIds.value
    })
    if (res.success) {
      ElMessage.success('角色分配成功')
      roleDialogVisible.value = false
      fetchUsers()
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '角色分配失败')
  } finally {
    roleLoading.value = false
  }
}

// 重置密码
const handleResetPassword = async (row: any) => {
  try {
    const { value: newPassword } = await ElMessageBox.prompt(
      `请输入用户 "${row.name}" 的新密码`,
      '重置密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^.{6,}$/,
        inputErrorMessage: '密码长度至少6位'
      }
    )

    await resetPassword(row.id, { newPassword })
    ElMessage.success('密码重置成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('重置密码失败:', error)
    }
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除人员 "${row.name}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteUser(row.id)
    ElMessage.success('删除成功')
    fetchUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除人员失败:', error)
    }
  }
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const map: Record<string, any> = {
    active: 'success',
    inactive: 'warning',
    resigned: 'info',
  }
  return map[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    active: '在职',
    inactive: '离职',
    resigned: '已辞职',
  }
  return map[status] || status
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    submitLoading.value = true

    if (isEdit.value) {
      // 编辑用户
      await updateUser(formData.id, formData)
      ElMessage.success('更新成功')
    } else {
      // 新增用户
      await createUser(formData)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    fetchUsers()
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    code: '',
    name: '',
    username: '',
    password: '',
    phone: '',
    isSystemUser: true,
    departmentId: '',
    positionId: '',
    gender: 'unknown',
    birthDate: null,
    hireDate: null,
    address: '',
    idCard: '',
    role: 'staff',
    status: 'active',
    remark: ''
  })
  formRef.value?.clearValidate()
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
  fetchUsers()
}

// 当前页改变
const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchUsers()
}

// 初始化
onMounted(() => {
  fetchUsers()
  fetchRoles()
})
</script>

<style scoped>
.person-page {
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

.role-assign-info {
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  color: #606266;
}

.role-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-checkbox-group .el-checkbox {
  margin-right: 0;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.role-checkbox-group .el-checkbox:hover {
  background: #f5f7fa;
}
</style>