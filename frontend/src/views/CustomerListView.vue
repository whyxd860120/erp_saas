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
                <el-button link type="warning" size="small" @click="toggleCustomerStatus(row)">
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
      @success="handleImportSuccess"
    />

    <!-- 分类导入对话框 -->
    <CustomerCategoryImportDialog
      v-model="categoryImportDialogVisible"
      @success="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { ElTree } from 'element-plus'
import { Plus, Folder, FolderAdd, User, Refresh, Upload, Download, View, Hide } from '@element-plus/icons-vue'
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
  importCustomers
} from '@/api/customer'
import CommonImportDialog from '@/components/CommonImportDialog.vue'
import CustomerCategoryImportDialog from './CustomerCategoryImportDialog.vue'
import { getUsers },
  toggleCustomerStatus from '@/api/user'

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

async function toggleCustomerStatus(row: any) {
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
    } else if (item.category) {
      newItem.categoryError = `客户分类 "${item.category}" 不存在`
    }

    return newItem
  })

  return await importCustomers(processedData)
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
