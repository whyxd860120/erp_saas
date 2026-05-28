<template>
  <div class="supplier-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>供应商管理</span>
          <div class="header-actions">
            <el-button type="primary" plain @click="handleAddRootCategory">
              <el-icon><FolderAdd /></el-icon>
              新增供应商分类
            </el-button>
            <el-button type="primary" plain :disabled="!selectedCategoryId" @click="handleAddChildCategory">
              <el-icon><FolderAdd /></el-icon>
              新增子分类
            </el-button>
            <el-button type="primary" :disabled="!selectedCategoryId" @click="handleCreateSupplier">
              <el-icon><Plus /></el-icon>
              新增供应商
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
              导入供应商
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
              导出供应商
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleExportCategories">
                    <el-icon><Download /></el-icon>
                    导出分类
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="info" plain @click="showHelp">
              <el-icon><QuestionFilled /></el-icon>
              帮助
            </el-button>
          </div>
        </div>
      </template>

      <div class="supplier-layout">
        <!-- 左侧分类树 -->
        <div class="category-panel">
          <div class="panel-title">
            <span>供应商分类</span>
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
                  <span v-if="data.supplierCount !== undefined" class="category-count">
                    ({{ data.children?.length || 0 }}个子分类, {{ data.supplierCount }}个供应商)
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
            :data="displaySuppliers"
            row-key="id"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="name" label="供应商名称" min-width="220">
              <template #default="{ row }">
                <span v-if="row.category?.name" class="supplier-name-with-category">
                  <span class="category-prefix">[{{ row.category.name }}]</span>
                  {{ row.name }}
                </span>
                <span v-else>{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="code" label="供应商编码" width="130" />
            <el-table-column prop="contact" label="联系人" width="120" />
            <el-table-column prop="phone" label="电话" width="140" />
            <el-table-column prop="bankName" label="开户行" width="180" />
            <el-table-column prop="bankAccount" label="银行账号" width="180" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-tag type="primary" size="small" @click="handleEditSupplier(row)" style="cursor: pointer; margin-right: 4px;">
                  编辑
                </el-tag>
                <el-tag type="danger" size="small" @click="handleDeleteSupplier(row)" style="cursor: pointer;">
                  删除
                </el-tag>
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

    <!-- 供应商对话框 -->
    <el-dialog v-model="supplierDialogVisible" :title="supplierDialogTitle" width="560px" @close="resetSupplierForm">
      <el-form ref="supplierFormRef" :model="supplierForm" :rules="supplierRules" label-width="90px">
        <el-form-item label="编码" prop="code">
          <el-input v-model="supplierForm.code" placeholder="供应商编码" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="supplierForm.name" placeholder="供应商名称" />
        </el-form-item>
        <el-form-item label="所属分类" prop="categoryId">
          <el-tree-select
            v-model="supplierForm.categoryId"
            :data="categoryTreeForSelect"
            :props="treeProps"
            check-strictly
            placeholder="请选择分类"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="supplierForm.contact" placeholder="联系人" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="supplierForm.phone" placeholder="电话" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="supplierForm.email" placeholder="邮箱" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="supplierForm.address" type="textarea" :rows="2" placeholder="地址" />
        </el-form-item>
        <el-form-item label="开户行" prop="bankName">
          <el-input v-model="supplierForm.bankName" placeholder="开户行" />
        </el-form-item>
        <el-form-item label="银行账号" prop="bankAccount">
          <el-input v-model="supplierForm.bankAccount" placeholder="银行账号" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="supplierForm.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="supplierDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="supplierSubmitLoading" @click="handleSubmitSupplier">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <CommonImportDialog
      v-model="importDialogVisible"
      title="供应商"
      :columns="importColumns"
      :format-tips="importFormatTips"
      :import-fn="handleImportSubmit"
      @success="handleImportSuccess"
    />

    <!-- 分类导入对话框 -->
    <SupplierCategoryImportDialog
      v-model="categoryImportDialogVisible"
      @success="loadData"
    />

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      module-name="供应商管理"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { ElTree } from 'element-plus'
import { Plus, Folder, FolderAdd, Refresh, Upload, Download, View, Hide, QuestionFilled } from '@element-plus/icons-vue'
import {
  getSupplierCategoryTree,
  getSupplierCategories,
  createSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  importSuppliers,
  toggleSupplierStatus
} from '@/api/supplier'
import CommonImportDialog from '@/components/CommonImportDialog.vue'
import SupplierCategoryImportDialog from './SupplierCategoryImportDialog.vue'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'

declare const XLSX: any

interface CategoryNode {
  id: string
  name: string
  parentId?: string | null
  sortOrder?: number
  status?: string
  children?: CategoryNode[]
}

interface SupplierItem {
  id: string
  code: string
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  bankName?: string
  bankAccount?: string
  status?: string
  categoryId?: string | null
  category?: CategoryNode
}

const treeProps = { label: 'name', children: 'children', value: 'id' }

const loading = ref(false)
const categoryTree = ref<CategoryNode[]>([])
const allSuppliers = ref<SupplierItem[]>([])
const displaySuppliers = ref<SupplierItem[]>([])
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

// 供应商对话框
const supplierDialogVisible = ref(false)
const supplierDialogTitle = ref('新增供应商')
const supplierIsEdit = ref(false)
const supplierSubmitLoading = ref(false)
const supplierFormRef = ref<FormInstance>()
const supplierForm = reactive({
  id: '',
  code: '',
  name: '',
  categoryId: '' as string,
  contact: '',
  phone: '',
  email: '',
  address: '',
  bankName: '',
  bankAccount: '',
  status: 'active'
})
const supplierRules: FormRules = {
  code: [{ required: true, message: '请输入供应商编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

// 导入
const importDialogVisible = ref(false)
const categoryImportDialogVisible = ref(false)
const helpDialogVisible = ref(false)

const importColumns = [
  { prop: 'code', label: '编码', required: true, unique: true },
  { prop: 'name', label: '名称', required: true },
  { prop: 'category', label: '供应商分类' },
  { prop: 'contact', label: '联系人' },
  { prop: 'phone', label: '电话' },
  { prop: 'email', label: '邮箱' },
  { prop: 'address', label: '地址' },
  { prop: 'bankName', label: '开户行' },
  { prop: 'bankAccount', label: '银行账号' },
  { prop: 'status', label: '状态' }
]
const importFormatTips = [
  '编码：必填，唯一标识，不可重复',
  '名称：必填',
  '供应商分类：选填，填写分类名称，导入时若不存在则自动创建',
  '联系人、电话、邮箱、地址：选填',
  '开户行、银行账号：选填',
  '状态：选填，填写"启用"或"禁用"，默认为启用'
]

const helpData = {
  operations: [
    {
      title: '新增供应商',
      steps: [
        '点击左侧供应商分类树，选择要添加供应商的分类',
        '点击"新增供应商"按钮',
        '填写供应商编码、名称、联系人、电话等基本信息',
        '填写银行账户信息（可选）',
        '选择启用或禁用状态',
        '点击"确定"保存'
      ]
    },
    {
      title: '编辑供应商',
      steps: [
        '在供应商列表中找到要编辑的供应商',
        '点击"编辑"按钮',
        '修改需要更新的信息',
        '点击"确定"保存修改'
      ]
    },
    {
      title: '删除供应商',
      steps: [
        '在供应商列表中找到要删除的供应商',
        '点击"删除"按钮',
        '确认删除操作',
        '注意：有业务往来的供应商无法删除'
      ]
    },
    {
      title: '导入供应商',
      steps: [
        '点击"导入供应商"按钮',
        '下载导入模板',
        '按照模板格式填写供应商信息',
        '上传填写好的Excel文件',
        '系统会自动验证数据格式和唯一性',
        '查看验证结果，如有错误可导出错误数据',
        '确认导入有效数据'
      ]
    },
    {
      title: '导出供应商',
      steps: [
        '点击"导出供应商"按钮',
        '系统会导出当前列表中的所有供应商',
        '导出文件为Excel格式，可用于数据备份或迁移'
      ]
    }
  ],
  notices: [
    '供应商编码必须唯一，重复的编码无法导入',
    '有业务往来的供应商无法删除，请谨慎操作',
    '删除操作不可恢复，请谨慎操作',
    '供应商信息变更后，相关的订单和单据会自动更新',
    '银行账户信息用于财务结算，请确保准确性'
  ],
  tips: [
    '使用搜索功能可以快速查找供应商',
    '点击"显示禁用"可以查看已禁用的供应商',
    '定期导出供应商数据进行备份',
    '使用分类管理可以更好地组织供应商',
    '导入前先验证数据，避免导入错误',
    '为重要供应商维护完整的银行账户信息'
  ],
  shortcuts: [
    { key: 'Ctrl+F', description: '快速搜索供应商' },
    { key: 'F5', description: '刷新供应商列表' },
    { key: 'Ctrl+A', description: '全选当前页供应商' }
  ],
  version: '1.1.0',
  lastUpdate: '2025-05-28',
  changes: [
    '新增供应商编码唯一性验证',
    '改进导入功能，支持查看和导出错误数据',
    '新增帮助文档功能',
    '优化供应商分类管理'
  ]
}

function showHelp() {
  helpDialogVisible.value = true
}

// 树形选择器数据
const categoryTreeForSelect = computed(() => {
  if (!categoryIsEdit.value || !categoryForm.id) {
    return categoryTree.value
  }
  return filterCategoryForSelect(categoryTree.value, categoryForm.id)
})

function filterCategoryForSelect(nodes: CategoryNode[], excludeId: string): CategoryNode[] {
  return nodes
    .filter((n) => n.id !== excludeId)
    .map((n) => ({
      ...n,
      children: n.children?.length ? filterCategoryForSelect(n.children, excludeId) : undefined
    }))
}

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

// 优化：分类筛选防抖
let categoryFilterTimer: ReturnType<typeof setTimeout> | null = null
watch(categoryFilterText, (val) => {
  if (categoryFilterTimer) clearTimeout(categoryFilterTimer)
  categoryFilterTimer = setTimeout(() => {
    categoryTreeRef.value?.filter(val)
  }, 200)
})

async function loadData() {
  try {
    loading.value = true
    const catRes = await getSupplierCategoryTree()
    if (catRes.success) {
      categoryTree.value = catRes.data || []
    }
    // 如果有选中分类，加载该分类的供应商，否则加载前100个
    if (selectedCategoryId.value) {
      await loadSuppliersByCategory(selectedCategoryId.value)
    } else {
      await loadAllSuppliers(100)
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    loading.value = false
  }
}

// 加载所有供应商（限制100条）
async function loadAllSuppliers(limit: number = 100) {
  try {
    const res = await getSuppliers({
      page: 1,
      limit,
      ...(showInactive.value ? {} : { status: 'active' })
    })
    if (res.success) {
      allSuppliers.value = res.data.items || []
      displaySuppliers.value = res.data.items || []
    }
  } catch (e) {
    console.error('加载供应商列表失败:', e)
  }
}

// 按分类加载供应商
async function loadSuppliersByCategory(categoryId: string) {
  try {
    const res = await getSuppliers({
      page: 1,
      limit: 100,
      categoryId,
      ...(showInactive.value ? {} : { status: 'active' })
    })
    if (res.success) {
      allSuppliers.value = res.data.items || []
      displaySuppliers.value = res.data.items || []
    }
  } catch (e) {
    console.error('按分类加载供应商失败:', e)
  }
}

function toggleShowInactive() {
  showInactive.value = !showInactive.value
  loadData()
}

function handleShowAll() {
  selectedCategoryId.value = null
  categoryTreeRef.value?.setCurrentKey(undefined as unknown as string)
  loadAllSuppliers(100)
}

function handleCategoryNodeClick(data: CategoryNode) {
  selectedCategoryId.value = data.id
  loadSuppliersByCategory(data.id)
}

// 优化：使用防抖搜索，避免频繁重建树结构
let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    try {
      loading.value = true
      const res = await getSuppliers({
        page: 1,
        limit: 100,
        search: searchForm.keyword.trim() || undefined,
        // 搜索时不限制分类，允许跨分类搜索
        ...(showInactive.value ? {} : { status: 'active' })
      })
      if (res.success) {
        allSuppliers.value = res.data.items || []
        displaySuppliers.value = res.data.items || []
      }
    } catch (e) {
      console.error('搜索供应商失败:', e)
    } finally {
      loading.value = false
    }
  }, 300)
}

function handleResetSearch() {
  searchForm.keyword = ''
  if (selectedCategoryId.value) {
    loadSuppliersByCategory(selectedCategoryId.value)
  } else {
    loadAllSuppliers(100)
  }
}

// 分类操作
function handleAddRootCategory() {
  categoryIsEdit.value = false
  categoryDialogTitle.value = '新增供应商分类'
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
  getSupplierCategories().then(res => {
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
    // 获取分类名称以便确认
    const categoriesRes = await getSupplierCategories()
    let categoryName = '该分类'
    if (categoriesRes.success) {
      const categories = categoriesRes.data || []
      const flatCategories = flattenCategories(categories)
      const node = flatCategories.find(c => c.id === selectedCategoryId.value)
      if (node) categoryName = node.name
    }

    await ElMessageBox.confirm(`确定删除分类「${categoryName}」吗？`, '提示', { type: 'warning' })
    const res = await deleteSupplierCategory(selectedCategoryId.value)
    if (res.success) {
      ElMessage.success('删除成功')
      selectedCategoryId.value = null
      await loadData()
    }
  } catch (e: any) {
    if (e !== 'cancel' && e?.response?.data?.message) {
      ElMessage.error(e.response.data.message)
    }
  }
}

function flattenCategories(categories: CategoryNode[]): CategoryNode[] {
  let result: CategoryNode[] = []
  categories.forEach(cat => {
    result.push(cat)
    if (cat.children?.length) {
      result = result.concat(flattenCategories(cat.children))
    }
  })
  return result
}

async function handleSubmitCategory() {
  if (!categoryFormRef.value) return
  await categoryFormRef.value.validate()
  categorySubmitLoading.value = true
  try {
    const payload = { name: categoryForm.name, parentId: categoryForm.parentId || undefined, sortOrder: categoryForm.sortOrder }
    if (categoryIsEdit.value) {
      const res = await updateSupplierCategory(categoryForm.id, payload)
      if (res.success) ElMessage.success('更新成功')
    } else {
      const res = await createSupplierCategory(payload)
      if (res.success) ElMessage.success('创建成功')
    }
    categoryDialogVisible.value = false
    await loadData()
    if (categoryForm.id) {
      nextTick(() => categoryTreeRef.value?.setCurrentKey(categoryForm.id))
    } else if (categoryForm.parentId) {
      nextTick(() => categoryTreeRef.value?.setCurrentKey(categoryForm.parentId!))
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    categorySubmitLoading.value = false
  }
}

function resetCategoryForm() {
  categoryFormRef.value?.resetFields()
}

// 供应商操作
function handleCreateSupplier() {
  supplierIsEdit.value = false
  supplierDialogTitle.value = '新增供应商'
  resetSupplierForm()
  if (selectedCategoryId.value) {
    supplierForm.categoryId = selectedCategoryId.value
  }
  supplierDialogVisible.value = true
}

async function handleEditSupplier(row: SupplierItem) {
  try {
    const res = await getSupplierById(row.id)
    if (res.success) {
      supplierIsEdit.value = true
      supplierDialogTitle.value = '编辑供应商'
      const s = res.data
      supplierForm.id = s.id
      supplierForm.code = s.code
      supplierForm.name = s.name
      supplierForm.categoryId = s.categoryId || ''
      supplierForm.contact = s.contact || ''
      supplierForm.phone = s.phone || ''
      supplierForm.email = s.email || ''
      supplierForm.address = s.address || ''
      supplierForm.bankName = s.bankName || ''
      supplierForm.bankAccount = s.bankAccount || ''
      supplierForm.status = s.status || 'active'
      supplierDialogVisible.value = true
    }
  } catch (e) {
    console.error(e)
  }
}

async function handleDeleteSupplier(row: SupplierItem) {
  try {
    await ElMessageBox.confirm(`确定删除供应商「${row.name}」吗？`, '提示', { type: 'warning' })
    const res = await deleteSupplier(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      await loadData()
    }
  } catch (e: any) {
    if (e !== 'cancel' && e?.response?.data?.message) {
      ElMessage.error(e.response.data.message)
    }
  }
}

async function handleSubmitSupplier() {
  if (!supplierFormRef.value) return
  await supplierFormRef.value.validate()
  supplierSubmitLoading.value = true
  try {
    const payload = {
      code: supplierForm.code,
      name: supplierForm.name,
      categoryId: supplierForm.categoryId,
      contact: supplierForm.contact,
      phone: supplierForm.phone,
      email: supplierForm.email,
      address: supplierForm.address,
      bankName: supplierForm.bankName,
      bankAccount: supplierForm.bankAccount,
      status: supplierForm.status
    }
    if (supplierIsEdit.value) {
      const res = await updateSupplier(supplierForm.id, payload)
      if (res.success) ElMessage.success('更新成功')
    } else {
      const res = await createSupplier(payload as any)
      if (res.success) ElMessage.success('创建成功')
    }
    supplierDialogVisible.value = false
    await loadData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    supplierSubmitLoading.value = false
  }
}

function resetSupplierForm() {
  supplierForm.id = ''
  supplierForm.code = ''
  supplierForm.name = ''
  supplierForm.categoryId = selectedCategoryId.value || ''
  supplierForm.contact = ''
  supplierForm.phone = ''
  supplierForm.email = ''
  supplierForm.address = ''
  supplierForm.bankName = ''
  supplierForm.bankAccount = ''
  supplierForm.status = 'active'
  supplierFormRef.value?.resetFields()
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
      newItem.categoryError = `供应商分类 "${item.category}" 不存在`
    }

    return newItem
  })

  return await importSuppliers(processedData)
}

function handleImportSuccess() {
  loadData()
}

function handleExport() {
  if (typeof XLSX === 'undefined') {
    ElMessage.error('Excel 库未加载，请刷新页面重试')
    return
  }
  const headers = ['供应商编码', '供应商名称', '联系人', '电话', '邮箱', '地址', '开户行', '银行账号', '分类', '状态']
  const data = allSuppliers.value.map(s => [
    s.code,
    s.name,
    s.contact || '',
    s.phone || '',
    s.email || '',
    s.address || '',
    s.bankName || '',
    s.bankAccount || '',
    s.category?.name || '',
    s.status === 'active' ? '启用' : '禁用'
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '供应商列表')
  XLSX.writeFile(wb, `供应商列表_${new Date().toLocaleDateString()}.xlsx`)
  ElMessage.success('导出成功')
}

function handleExportCategories() {
  if (typeof XLSX === 'undefined') {
    ElMessage.error('Excel 库未加载，请刷新页面重试')
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
  XLSX.writeFile(wb, `供应商分类_${new Date().toLocaleDateString()}.xlsx`)
  ElMessage.success('导出成功')
}

onMounted(() => loadData())
</script>

<style scoped>
.supplier-page { padding: 0; }

.supplier-name-with-category {
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

.supplier-layout {
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

.category-count {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

:deep(.el-tree-node__content) {
  height: 32px;
}
</style>