<template>
  <div class="customer-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>客户管理</span>
          <div class="header-actions">
            <el-button type="primary" plain @click="handleAddRootCategory">
              <el-icon><FolderAdd /></el-icon>
              新增客户分类
            </el-button>
            <el-button type="primary" plain :disabled="!selectedCategoryId" @click="handleAddChildCategory">
              <el-icon><FolderAdd /></el-icon>
              新增子分类
            </el-button>
            <el-button type="primary" :disabled="!selectedCategoryId" @click="handleCreateCustomer">
              <el-icon><Plus /></el-icon>
              新增客户
            </el-button>
            <el-button @click="loadData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button :type="showInactive ? 'warning' : 'default'" @click="toggleShowInactive">
              <el-icon><View v-if="!showInactive" /><Hide v-else /></el-icon>
              {{ showInactive ? '隐藏禁用' : '显示禁用' }}
            </el-button>
            <el-dropdown split-button type="success" plain @click="handleImport">
              <el-icon><Upload /></el-icon>
              导入客户
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleImportCategories">
                    <el-icon><FolderAdd /></el-icon>
                    导入分类
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-dropdown split-button type="info" plain @click="handleExport">
              <el-icon><Download /></el-icon>
              导出客户
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleExportCategories">
                    <el-icon><Download /></el-icon>
                    导出分类
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="danger" plain @click="handleDeleteAll" v-if="isAdmin">
              <el-icon><Delete /></el-icon>
              删除全部
            </el-button>
            <el-button type="info" plain @click="showHelp">
              <el-icon><QuestionFilled /></el-icon>
              帮助
            </el-button>
          </div>
        </div>
      </template>

      <div class="customer-layout">
        <!-- 左侧分类树 -->
        <div class="category-panel">
          <div class="panel-title">
            <span>客户分类</span>
            <el-button
              link
              type="primary"
              size="small"
              :class="{ 'is-active': !selectedCategoryId }"
              @click="handleShowAll"
            >
              全部
            </el-button>
          </div>
          <el-input
            v-model="categoryFilterText"
            placeholder="筛选分类"
            clearable
            class="category-filter"
          />
          <el-scrollbar class="category-scroll">
            <el-tree
              ref="categoryTreeRef"
              :data="categoryTree"
              :props="treeProps"
              node-key="id"
              highlight-current
              :expand-on-click-node="false"
              :filter-node-method="filterCategoryNode"
              @node-click="handleCategoryNodeClick"
            >
              <template #default="{ node, data }">
                <span class="category-tree-node">
                  <el-icon class="node-icon"><Folder /></el-icon>
                  <span>{{ data.name }}</span>
                  <span v-if="data.customerCount !== undefined" class="category-count">
                    ({{ data.children?.length || 0 }}个子分类, {{ data.customerCount }}个客户)
                  </span>
                </span>
              </template>
            </el-tree>
          </el-scrollbar>
          <div class="category-actions" v-if="selectedCategoryId">
            <el-button link type="primary" @click="handleEditCategory">编辑分类</el-button>
            <el-button link type="danger" @click="handleDeleteCategory">删除分类</el-button>
          </div>
        </div>

        <!-- 右侧树形表格 -->
        <div class="table-panel">
          <el-form :inline="true" :model="searchForm" class="search-form" @submit.prevent>
            <el-form-item label="关键词">
              <el-input
                v-model="searchForm.keyword"
                placeholder="编码 / 名称 / 联系人"
                clearable
                @input="handleSearch"
                @keyup.enter="handleSearch"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
              <el-button @click="handleResetSearch">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table
            v-loading="loading"
            :data="displayCustomers"
            row-key="id"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="name" label="客户名称" min-width="200">
              <template #default="{ row }">
                <span v-if="row.category?.name" class="customer-name-with-category">
                  <span class="category-prefix">[{{ row.category.name }}]</span>
                  {{ row.name }}
                </span>
                <span v-else>{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="code" label="客户编码" width="130" />
            <el-table-column prop="contact" label="联系人" width="100" />
            <el-table-column prop="phone" label="电话" width="130" />
            <el-table-column label="专属业务员" width="120">
              <template #default="{ row }">
                {{ row.user?.name || '—' }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleEditCustomer(row)">
                  编辑
                </el-button>
                <el-button link type="warning" size="small" @click="handleToggleCustomerStatus(row)">
                  {{ row.status === 'active' ? '禁用' : '启用' }}
                </el-button>
                <el-button link type="danger" size="small" @click="handleDeleteCustomer(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>

    <!-- 分类对话框 -->
    <el-dialog v-model="categoryDialogVisible" :title="categoryDialogTitle" width="480px" @close="resetCategoryForm">
      <el-form ref="categoryFormRef" :model="categoryForm" :rules="categoryRules" label-width="90px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="上级分类" prop="parentId">
          <el-tree-select
            v-model="categoryForm.parentId"
            :data="categoryTreeForSelect"
            :props="treeProps"
            check-strictly
            clearable
            placeholder="不选则为根分类"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="categoryForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="categorySubmitLoading" @click="handleSubmitCategory">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 客户对话框 -->
    <el-dialog v-model="customerDialogVisible" :title="customerDialogTitle" width="560px" @close="resetCustomerForm">
      <el-form ref="customerFormRef" :model="customerForm" :rules="customerRules" label-width="90px">
        <el-form-item label="编码" prop="code">
          <el-input v-model="customerForm.code" placeholder="客户编码" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="customerForm.name" placeholder="客户名称" />
        </el-form-item>
        <el-form-item label="所属分类" prop="categoryId">
          <el-tree-select
            v-model="customerForm.categoryId"
            :data="categoryTreeForSelect"
            :props="treeProps"
            check-strictly
            placeholder="请选择分类"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="customerForm.contact" placeholder="联系人" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="customerForm.phone" placeholder="电话" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="customerForm.email" placeholder="邮箱" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="customerForm.address" type="textarea" :rows="2" placeholder="地址" />
        </el-form-item>
        <el-form-item label="专属业务员" prop="employeeId">
          <el-select v-model="customerForm.employeeId" placeholder="请选择专属业务员" clearable style="width: 100%;">
            <el-option v-for="user in users" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="customerForm.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="customerDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="customerSubmitLoading" @click="handleSubmitCustomer">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <CommonImportDialog
      v-model="importDialogVisible"
      title="客户"
      :columns="importColumns"
      :format-tips="importFormatTips"
      :import-fn="handleImportSubmit"
      :custom-validate-fn="customValidateCustomers"
      @success="handleImportSuccess"
    />

    <!-- 分类导入对话框 -->
    <CustomerCategoryImportDialog
      v-model="categoryImportDialogVisible"
      @success="loadData"
    />

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      module-name="客户管理"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { ElTree } from 'element-plus'
import { Plus, Folder, FolderAdd, User, Refresh, Upload, Download, View, Hide, QuestionFilled, Delete } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  getCustomerCategoryTree,
  getCustomerCategories,
  createCustomerCategory,
  updateCustomerCategory,
  deleteCustomerCategory,
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  importCustomers,
  batchDeleteCustomers
} from '@/api/customer'
import CommonImportDialog from '@/components/CommonImportDialog.vue'
import CustomerCategoryImportDialog from './CustomerCategoryImportDialog.vue'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'
import { getUsers, toggleCustomerStatus } from '@/api/user'

declare const XLSX: any

// 用户数据（用于专属业务员选择）
const users = ref([])

async function loadUsers() {
  try {
    const res = await getUsers({ page: 1, limit: 1000, status: 'active' })
    if (res.success && res.data?.items) {
      users.value = res.data.items
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
  }
}

interface CategoryNode {
  id: string
  name: string
  parentId?: string | null
  sortOrder?: number
  status?: string
  children?: CategoryNode[]
  nodeType?: string
}

interface CustomerItem {
  id: string
  code: string
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  status?: string
  categoryId?: string | null
  category?: CategoryNode
  employeeId?: string
  user?: { name: string }
  nodeType?: string
}

const treeProps = { label: 'name', children: 'children', value: 'id' }

const loading = ref(false)
const categoryTree = ref<CategoryNode[]>([])
const displayCustomers = ref<CustomerItem[]>([])
const categoryFilterText = ref('')
const selectedCategoryId = ref<string | null>(null)
const showInactive = ref(false)

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'admin')

const categoryTreeRef = ref<InstanceType<typeof ElTree>>()

const searchForm = reactive({ keyword: '' })

// 分类对话框
const categoryDialogVisible = ref(false)
const categoryDialogTitle = ref('新增分类')
const categoryIsEdit = ref(false)
const categorySubmitLoading = ref(false)
const categoryFormRef = ref<FormInstance>()
const categoryForm = reactive({ id: '', name: '', parentId: null as string | null, sortOrder: 0 })
const categoryRules: FormRules = { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] }

// 客户对话框
const customerDialogVisible = ref(false)
const customerDialogTitle = ref('新增客户')
const customerIsEdit = ref(false)
const customerSubmitLoading = ref(false)
const customerFormRef = ref<FormInstance>()
const customerForm = reactive({
  id: '',
  code: '',
  name: '',
  categoryId: '' as string,
  contact: '',
  phone: '',
  email: '',
  address: '',
  employeeId: '',
  status: 'active'
})
const customerRules: FormRules = {
  code: [{ required: true, message: '请输入客户编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

// 导入
const importDialogVisible = ref(false)
const categoryImportDialogVisible = ref(false)
const helpDialogVisible = ref(false)

const importColumns = [
  { prop: 'code', label: '编码', required: true, unique: true },
  { prop: 'name', label: '名称', required: true },
  { prop: 'category', label: '客户分类', required: true },
  { prop: 'contact', label: '联系人' },
  { prop: 'phone', label: '电话' },
  { prop: 'email', label: '邮箱' },
  { prop: 'address', label: '地址' },
  { prop: 'employeeName', label: '专属业务员' },
  { prop: 'status', label: '状态' }
]
const importFormatTips = [
  '编码：必填，唯一标识，不可重复',
  '名称：必填',
  '客户分类：必填，填写分类名称，必须先创建分类',
  '联系人、电话、邮箱、地址：选填',
  '专属业务员：选填，填写用户名称，必须是用户管理中存在的用户',
  '状态：选填，填写"启用"或"禁用"，默认为启用'
]

// 自定义验证函数
function customValidateCustomers(data: any[]): any[] {
  // 转换分类名称为分类ID
  const categoryMap = new Map<string, string>()

  // 构建分类名称到ID的映射
  const buildCategoryMap = (categories: CategoryNode[]) => {
    categories.forEach(cat => {
      categoryMap.set(cat.name, cat.id)
      if (cat.children?.length) {
        buildCategoryMap(cat.children)
      }
    })
  }
  buildCategoryMap(categoryTree.value)

  // 获取现有客户数据用于验证
  const existingCustomers = displayCustomers.value
  const existingCodes = new Set(existingCustomers.map(c => c.code))

  // 转换导入数据并进行验证
  return data.map((item) => {
    const newItem: any = { ...item }

    // 转换分类名称为ID
    if (item.category && categoryMap.has(item.category)) {
      newItem.categoryId = categoryMap.get(item.category)
      delete newItem.category
    } else if (item.category) {
      newItem.valid = false
      newItem.errorMsg = `客户分类 "${item.category}" 不存在`
      newItem.errors = { category: true }
      return newItem
    }

    // 验证客户编码唯一性
    if (item.code && existingCodes.has(item.code)) {
      newItem.valid = false
      newItem.errorMsg = `客户编码 "${item.code}" 已存在`
      newItem.errors = { code: true }
      return newItem
    }

    // 标记为有效数据
    newItem.valid = true
    newItem.errorMsg = ''
    newItem.errors = {}

    return newItem
  })
}

async function handleImportSubmit(data: any[]) {
  // 转换分类名称为分类ID
  const categoryMap = new Map<string, string>()

  // 构建分类名称到ID的映射
  const buildCategoryMap = (categories: CategoryNode[]) => {
    categories.forEach(cat => {
      categoryMap.set(cat.name, cat.id)
      if (cat.children?.length) {
        buildCategoryMap(cat.children)
      }
    })
  }
  buildCategoryMap(categoryTree.value)

  // 转换导入数据
  const processedData = data.map(item => {
    const newItem: any = { ...item }

    // 转换分类名称为ID
    if (item.category && categoryMap.has(item.category)) {
      newItem.categoryId = categoryMap.get(item.category)
      delete newItem.category
    }

    return newItem
  })

  return await importCustomers(processedData)
}

async function handleDeleteAll() {
  try {
    await ElMessageBox.confirm(
      '确定要删除所有客户吗？此操作不可恢复！',
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const loadingInstance = ElLoading.service({
      lock: true,
      text: '正在删除所有客户...',
      background: 'rgba(0, 0, 0, 0.7)',
    })

    try {
      const allIds = displayCustomers.value.map(c => c.id)
      const res = await batchDeleteCustomers(allIds)
      
      if (res.success) {
        const { successIds, errors } = res.data
        
        if (errors.length > 0) {
          const errorMessages = errors.map(err => err.message).join('；')
          ElMessage.warning(
            `删除完成：成功 ${successIds.length} 个，失败 ${errors.length} 个。失败原因：${errorMessages}`
          )
        } else {
          ElMessage.success(`删除完成：成功 ${successIds.length} 个`)
        }

        await loadData()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } finally {
      loadingInstance.close()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除全部客户失败:', error)
      ElMessage.error(error?.response?.data?.message || '删除失败，请稍后重试')
    }
  }
}

const helpData = {
  operations: [
    {
      title: '新增客户',
      steps: [
        '点击左侧客户分类树，选择要添加客户的分类',
        '点击"新增客户"按钮',
        '填写客户编码、名称、联系人、电话等基本信息',
        '选择专属业务员（可选）',
        '选择启用或禁用状态',
        '点击"确定"保存'
      ]
    },
    {
      title: '编辑客户',
      steps: [
        '在客户列表中找到要编辑的客户',
        '点击"编辑"按钮',
        '修改需要更新的信息',
        '点击"确定"保存修改'
      ]
    },
    {
      title: '删除客户',
      steps: [
        '在客户列表中找到要删除的客户',
        '点击"删除"按钮',
        '确认删除操作',
        '注意：有业务往来的客户无法删除'
      ]
    },
    {
      title: '导入客户',
      steps: [
        '点击"导入客户"按钮',
        '下载导入模板',
        '按照模板格式填写客户信息',
        '上传填写好的Excel文件',
        '系统会自动验证数据格式和唯一性',
        '查看验证结果，如有错误可导出错误数据',
        '确认导入有效数据'
      ]
    },
    {
      title: '导出客户',
      steps: [
        '点击"导出客户"按钮',
        '系统会导出当前列表中的所有客户',
        '导出文件为Excel格式，可用于数据备份或迁移'
      ]
    }
  ],
  notices: [
    '客户编码必须唯一，重复的编码无法导入',
    '导入前请确保分类已创建，否则会导致导入失败',
    '有业务往来的客户无法删除，请谨慎操作',
    '专属业务员必须是用户管理中存在的用户',
    '删除操作不可恢复，请谨慎操作',
    '客户信息变更后，相关的订单和单据会自动更新'
  ],
  tips: [
    '使用搜索功能可以快速查找客户',
    '点击"显示禁用"可以查看已禁用的客户',
    '为重要客户指定专属业务员可以更好地管理客户关系',
    '定期导出客户数据进行备份',
    '使用分类管理可以更好地组织客户',
    '导入前先验证数据，避免导入错误'
  ],
  shortcuts: [
    { key: 'Ctrl+F', description: '快速搜索客户' },
    { key: 'F5', description: '刷新客户列表' },
    { key: 'Ctrl+A', description: '全选当前页客户' }
  ],
  version: '1.1.0',
  lastUpdate: '2025-05-28',
  changes: [
    '新增客户编码唯一性验证',
    '改进导入功能，支持查看和导出错误数据',
    '新增帮助文档功能',
    '优化客户分类管理'
  ]
}

function showHelp() {
  helpDialogVisible.value = true
}

// 树形选择器数据
const categoryTreeForSelect = computed(() => {
  if (!categoryIsEdit.value || !categoryForm.id) return categoryTree.value
  return filterCategoryForSelect(categoryTree.value, categoryForm.id)
})

function filterCategoryForSelect(nodes: CategoryNode[], excludeId: string): CategoryNode[] {
  return nodes
    .filter(n => n.id !== excludeId)
    .map(n => ({ ...n, children: n.children?.length ? filterCategoryForSelect(n.children, excludeId) : undefined }))
}

// 优化：分类筛选防抖
let categoryFilterTimer: ReturnType<typeof setTimeout> | null = null
watch(categoryFilterText, (val) => {
  if (categoryFilterTimer) clearTimeout(categoryFilterTimer)
  categoryFilterTimer = setTimeout(() => {
    categoryTreeRef.value?.filter(val)
  }, 200)
})

function filterCategoryNode(value: string, data: CategoryNode) {
  if (!value) return true
  return data.name.includes(value)
}

function findCategoryNode(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const found = findCategoryNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

async function loadData() {
  try {
    loading.value = true
    const catRes = await getCustomerCategoryTree()

    if (catRes.success) {
      categoryTree.value = catRes.data || []
    }

    // 如果有选中分类，加载该分类的客户，否则加载前100个
    if (selectedCategoryId.value) {
      await loadCustomersByCategory(selectedCategoryId.value)
    } else {
      await loadAllCustomers(100)
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    loading.value = false
  }
}

// 加载所有客户（限制100条）
async function loadAllCustomers(limit: number = 100) {
  try {
    const res = await getCustomers({
      page: 1,
      limit,
      ...(showInactive.value ? {} : { status: 'active' })
    })
    if (res.success) {
      displayCustomers.value = res.data.items || []
    }
  } catch (e) {
    console.error('加载客户列表失败:', e)
  }
}

// 按分类加载客户
async function loadCustomersByCategory(categoryId: string) {
  try {
    const res = await getCustomers({
      page: 1,
      limit: 100,
      categoryId,
      ...(showInactive.value ? {} : { status: 'active' })
    })
    if (res.success) {
      displayCustomers.value = res.data.items || []
    }
  } catch (e) {
    console.error('按分类加载客户失败:', e)
  }
}

function toggleShowInactive() {
  showInactive.value = !showInactive.value
  loadData()
}

function handleShowAll() {
  selectedCategoryId.value = null
  categoryTreeRef.value?.setCurrentKey(undefined as unknown as string)
  loadAllCustomers(100)
}

function handleCategoryNodeClick(data: CategoryNode) {
  selectedCategoryId.value = data.id
  loadCustomersByCategory(data.id)
}

// 优化：使用防抖搜索，避免频繁重建树结构
let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    try {
      loading.value = true
      const res = await getCustomers({
        page: 1,
        limit: 100,
        search: searchForm.keyword.trim() || undefined,
        // 搜索时不限制分类，允许跨分类搜索
        ...(showInactive.value ? {} : { status: 'active' })
      })
      if (res.success) {
        displayCustomers.value = res.data.items || []
      }
    } catch (e) {
      console.error('搜索客户失败:', e)
    } finally {
      loading.value = false
    }
  }, 300)
}

function handleResetSearch() {
  searchForm.keyword = ''
  if (selectedCategoryId.value) {
    loadCustomersByCategory(selectedCategoryId.value)
  } else {
    loadAllCustomers(100)
  }
}

// 分类操作
function handleAddRootCategory() {
  categoryIsEdit.value = false
  categoryDialogTitle.value = '新增客户分类'
  categoryForm.id = ''
  categoryForm.name = ''
  categoryForm.parentId = null
  categoryForm.sortOrder = 0
  categoryDialogVisible.value = true
}

function handleAddChildCategory() {
  if (!selectedCategoryId.value) return
  categoryIsEdit.value = false
  categoryDialogTitle.value = '新增子分类'
  categoryForm.id = ''
  categoryForm.name = ''
  categoryForm.parentId = selectedCategoryId.value
  categoryForm.sortOrder = 0
  categoryDialogVisible.value = true
}

async function handleEditCategory() {
  if (!selectedCategoryId.value) return
  // 从后端获取分类详情
  getCustomerCategories().then(res => {
    if (res.success) {
      const categories = res.data || []
      const flatCategories = flattenCategories(categories)
      const node = flatCategories.find(c => c.id === selectedCategoryId.value)
      if (node) {
        categoryIsEdit.value = true
        categoryDialogTitle.value = '编辑分类'
        categoryForm.id = node.id
        categoryForm.name = node.name
        categoryForm.parentId = node.parentId || null
        categoryForm.sortOrder = node.sortOrder ?? 0
        categoryDialogVisible.value = true
      }
    }
  })
}

async function handleDeleteCategory() {
  if (!selectedCategoryId.value) return
  try {
    // 获取分类名称用于确认
    const categoriesRes = await getCustomerCategories()
    let categoryName = '该分类'
    if (categoriesRes.success) {
      const categories = categoriesRes.data || []
      const flatCategories = flattenCategories(categories)
      const node = flatCategories.find(c => c.id === selectedCategoryId.value)
      if (node) categoryName = node.name
    }

    await ElMessageBox.confirm(`确定删除分类「${categoryName}」吗？`, '提示', { type: 'warning' })
    const res = await deleteCustomerCategory(selectedCategoryId.value)
    if (res.success) {
      ElMessage.success('删除成功')
      selectedCategoryId.value = null
      await loadData()
    }
  } catch (e: any) {
    if (e !== 'cancel' && e?.response?.data?.message) ElMessage.error(e.response.data.message)
  }
}

async function handleSubmitCategory() {
  if (!categoryFormRef.value) return
  await categoryFormRef.value.validate()
  categorySubmitLoading.value = true
  try {
    const payload = { name: categoryForm.name, parentId: categoryForm.parentId || undefined, sortOrder: categoryForm.sortOrder }
    if (categoryIsEdit.value) {
      const res = await updateCustomerCategory(categoryForm.id, payload)
      if (res.success) ElMessage.success('更新成功')
    } else {
      const res = await createCustomerCategory(payload)
      if (res.success) ElMessage.success('创建成功')
    }
    categoryDialogVisible.value = false
    await loadData()
    if (categoryForm.id) nextTick(() => categoryTreeRef.value?.setCurrentKey(categoryForm.id))
    else if (categoryForm.parentId) nextTick(() => categoryTreeRef.value?.setCurrentKey(categoryForm.parentId!))
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    categorySubmitLoading.value = false
  }
}

function resetCategoryForm() {
  categoryFormRef.value?.resetFields()
}

// 客户操作
function handleCreateCustomer() {
  customerIsEdit.value = false
  customerDialogTitle.value = '新增客户'
  resetCustomerForm()
  if (selectedCategoryId.value) customerForm.categoryId = selectedCategoryId.value
  customerDialogVisible.value = true
}

async function handleEditCustomer(row: CustomerItem) {
  try {
    const res = await getCustomerById(row.id)
    if (res.success) {
      customerIsEdit.value = true
      customerDialogTitle.value = '编辑客户'
      const c = res.data
      customerForm.id = c.id
      customerForm.code = c.code
      customerForm.name = c.name
      customerForm.categoryId = c.categoryId || ''
      customerForm.contact = c.contact || ''
      customerForm.phone = c.phone || ''
      customerForm.email = c.email || ''
      customerForm.address = c.address || ''
      customerForm.employeeId = c.user?.id || ''  // 修复：从user字段获取ID
      customerForm.status = c.status || 'active'
      customerDialogVisible.value = true
    }
  } catch (e) {
    console.error(e)
  }
}

async function handleToggleCustomerStatus(row: any) {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const actionName = newStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定${actionName}「${row.name}」吗？`, '提示', { type: 'warning' })
    const res = await toggleCustomerStatus(row.id, newStatus)
    if (res.success) {
      ElMessage.success(`${actionName}成功`)
      await loadData()
    } else {
      ElMessage.error(res.message || `${actionName}失败`)
    }
  } catch (e: any) {
    if (e !== 'cancel' && e?.response?.data?.message) {
      ElMessage.error(e.response.data.message)
    }
  }
}

async function handleDeleteCustomer(row: CustomerItem) {
  try {
    await ElMessageBox.confirm(`确定删除客户「${row.name}」吗？`, '提示', { type: 'warning' })
    const res = await deleteCustomer(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      await loadData()
    }
  } catch (e: any) {
    if (e !== 'cancel' && e?.response?.data?.message) ElMessage.error(e.response.data.message)
  }
}

async function handleSubmitCustomer() {
  if (!customerFormRef.value) return
  await customerFormRef.value.validate()
  customerSubmitLoading.value = true
  try {
    const payload = {
      code: customerForm.code,
      name: customerForm.name,
      categoryId: customerForm.categoryId,
      contact: customerForm.contact,
      phone: customerForm.phone,
      email: customerForm.email,
      address: customerForm.address,
      employeeId: customerForm.employeeId || undefined,
      status: customerForm.status
    }
    if (customerIsEdit.value) {
      const res = await updateCustomer(customerForm.id, payload)
      if (res.success) ElMessage.success('更新成功')
    } else {
      const res = await createCustomer(payload as any)
      if (res.success) ElMessage.success('创建成功')
    }
    customerDialogVisible.value = false
    await loadData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    customerSubmitLoading.value = false
  }
}

function resetCustomerForm() {
  customerForm.id = ''
  customerForm.code = ''
  customerForm.name = ''
  customerForm.categoryId = selectedCategoryId.value || ''
  customerForm.contact = ''
  customerForm.phone = ''
  customerForm.email = ''
  customerForm.address = ''
  customerForm.employeeId = ''
  customerForm.status = 'active'
  customerFormRef.value?.resetFields()
}

// 导入导出
function handleImport() {
  importDialogVisible.value = true
}

function handleImportCategories() {
  categoryImportDialogVisible.value = true
}

function handleImportSuccess() {
  loadData()
}

function handleExport() {
  if (typeof XLSX === 'undefined') {
    ElMessage.error('Excel 导出库未加载，请刷新页面重试')
    return
  }
  const headers = ['客户编码', '客户名称', '联系人', '电话', '邮箱', '地址', '专属业务员', '分类', '状态']
  const data = allCustomers.value.map(c => [
    c.code,
    c.name,
    c.contact || '',
    c.phone || '',
    c.email || '',
    c.address || '',
    c.user?.name || '',
    c.category?.name || '',
    c.status === 'active' ? '启用' : '禁用'
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '客户列表')
  XLSX.writeFile(wb, `客户列表_${new Date().toLocaleDateString()}.xlsx`)
  ElMessage.success('导出成功')
}

function handleExportCategories() {
  if (typeof XLSX === 'undefined') {
    ElMessage.error('Excel 导出库未加载，请刷新页面重试')
    return
  }
  const headers = ['分类名称', '上级分类', '排序', '状态']
  const flattenCategories = (nodes: CategoryNode[], parentName = '', result: any[] = []) => {
    nodes.forEach(node => {
      result.push([node.name, parentName, node.sortOrder || 0, node.status === 'active' ? '启用' : '禁用'])
      if (node.children?.length) flattenCategories(node.children, node.name, result)
    })
    return result
  }
  const data = flattenCategories(categoryTree.value)
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '分类列表')
  XLSX.writeFile(wb, `客户分类_${new Date().toLocaleDateString()}.xlsx`)
  ElMessage.success('导出成功')
}

onMounted(() => {
  loadData()
  loadUsers()
})
</script>

<style scoped>
.customer-page { padding: 0; }
.customer-name-with-category {
  display: flex;
  align-items: center;
  gap: 6px;
}
.category-prefix {
  color: #909399;
  font-size: 12px;
  font-weight: normal;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.customer-layout {
  display: flex;
  gap: 16px;
  min-height: 520px;
}
.category-panel {
  width: 260px;
  flex-shrink: 0;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}
.panel-title {
  padding: 12px 14px;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.category-filter {
  margin: 10px 10px 0;
  width: calc(100% - 20px);
}
.category-scroll {
  flex: 1;
  padding: 8px;
}
.category-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}
.node-icon {
  color: #e6a23c;
}
.category-actions {
  padding: 8px 12px 12px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 8px;
}
.table-panel {
  flex: 1;
  min-width: 0;
}
.search-form {
  margin-bottom: 12px;
}
.row-category {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #303133;
}
.row-category .el-icon {
  color: #e6a23c;
}
.row-customer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #606266;
}
.row-customer .el-icon {
  color: #409eff;
}
.text-muted {
  color: #c0c4cc;
}
:deep(.el-tree-node__content) {
  height: 32px;
}
</style>