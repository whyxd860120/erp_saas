<template>
  <div class="product-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>物料管理</span>
          <div class="header-actions">
            <el-button type="primary" plain @click="handleAddRootCategory">
              <el-icon><FolderAdd /></el-icon>
              新增物料分类
            </el-button>
            <el-button type="primary" plain :disabled="!selectedCategoryId" @click="handleAddChildCategory">
              <el-icon><FolderAdd /></el-icon>
              新增子分类
            </el-button>
            <el-button type="primary" :disabled="!selectedCategoryId" @click="handleCreateProduct">
              <el-icon><Plus /></el-icon>
              新增物料
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
              导入物料
              <template #dropdown>
                <el-dropdown-item @click="handleImportCategories">
                  <el-icon><FolderAdd /></el-icon>
                  导入分类
                </el-dropdown-item>
              </template>
            </el-dropdown>
            <el-dropdown split-button type="info" plain @click="handleExport">
              <el-icon><Download /></el-icon>
              导出物料
              <template #dropdown>
                <el-dropdown-item @click="handleExportCategories">
                  <el-icon><Download /></el-icon>
                  导出分类
                </el-dropdown-item>
              </template>
            </el-dropdown>
            <el-button type="danger" plain @click="handleDeleteAll" v-if="isAdmin">
              <el-icon><Delete /></el-icon>
              删除全部
            </el-button>
          </div>
        </div>
      </template>

      <div class="product-layout">
        <!-- 左侧分类树 -->
        <div class="category-panel">
          <div class="panel-title">
            <span>物料分类</span>
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
                  <span v-if="data.productCount !== undefined" class="category-count">
                    ({{ data.children?.length || 0 }}个子分类, {{ data.productCount }}个物料)
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
                placeholder="编码 / 名称 / 规格"
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
            :data="displayProducts"
            row-key="id"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="name" label="物料名称" min-width="220">
              <template #default="{ row }">
                <span v-if="row.category?.name" class="product-name-with-category">
                  <span class="category-prefix">[{{ row.category.name }}]</span>
                  {{ row.name }}
                </span>
                <span v-else>{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="code" label="物料编码" width="130" />
            <el-table-column prop="spec" label="规格" width="120">
              <template #default="{ row }">
                {{ row.spec || '—' }}
              </template>
            </el-table-column>
            <el-table-column prop="unit" label="单位" width="80">
              <template #default="{ row }">
                {{ row.unit || '—' }}
              </template>
            </el-table-column>
            <el-table-column label="成本价" width="100" align="right">
              <template #default="{ row }">
                {{ formatPrice(row.costPrice) }}
              </template>
            </el-table-column>
            <el-table-column label="销售价" width="100" align="right">
              <template #default="{ row }">
                {{ formatPrice(row.salePrice) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="管理属性" width="200" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.enableBatch" size="small" type="warning" style="margin-right: 4px">批次</el-tag>
                <el-tag v-if="row.enableExpiry" size="small" type="warning" style="margin-right: 4px">保质期</el-tag>
                <el-tag v-if="row.enableSN" size="small" type="warning">SN码</el-tag>
                <span v-if="!row.enableBatch && !row.enableExpiry && !row.enableSN" style="color: #909399">—</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleEditProduct(row)">
                  编辑
                </el-button>
                <el-button link type="warning" size="small" @click="toggleProductStatus(row)">
                  {{ row.status === 'active' ? '禁用' : '启用' }}
                </el-button>
                <el-button link type="danger" size="small" @click="handleDeleteProduct(row)">
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

    <!-- 物料对话框 -->
    <el-dialog v-model="productDialogVisible" :title="productDialogTitle" width="560px" @close="resetProductForm">
      <el-form ref="productFormRef" :model="productForm" :rules="productRules" label-width="90px">
        <el-form-item label="编码" prop="code">
          <el-input v-model="productForm.code" placeholder="物料编码" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="productForm.name" placeholder="物料名称" />
        </el-form-item>
        <el-form-item label="规格" prop="spec">
          <el-input v-model="productForm.spec" placeholder="规格型号" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="productForm.unit" placeholder="个" />
        </el-form-item>
        <el-form-item label="所属分类" prop="categoryId">
          <el-tree-select
            v-model="productForm.categoryId"
            :data="categoryTreeForSelect"
            :props="treeProps"
            check-strictly
            placeholder="请选择分类"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="成本价" prop="costPrice">
          <el-input-number v-model="productForm.costPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="销售价" prop="salePrice">
          <el-input-number v-model="productForm.salePrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="productForm.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-divider content-position="left">管理属性</el-divider>

        <el-form-item label="批次管理" prop="enableBatch">
          <el-switch v-model="productForm.enableBatch" active-text="启用" inactive-text="禁用" />
          <el-text v-if="productForm.enableBatch" size="small" type="info" style="margin-left: 10px">
            启用后，出入库必须输入批次号
          </el-text>
        </el-form-item>

        <el-form-item label="保质期管理" prop="enableExpiry">
          <el-switch v-model="productForm.enableExpiry" active-text="启用" inactive-text="禁用" />
          <el-text v-if="productForm.enableExpiry" size="small" type="info" style="margin-left: 10px">
            启用后，出入库必须输入生产日期和有效期
          </el-text>
        </el-form-item>

        <el-form-item label="SN码管理" prop="enableSN">
          <el-switch v-model="productForm.enableSN" active-text="启用" inactive-text="禁用" />
          <el-text v-if="productForm.enableSN" size="small" type="info" style="margin-left: 10px">
            启用后，出入库必须录入SN码（一物一码）
          </el-text>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="productDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="productSubmitLoading" @click="handleSubmitProduct">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <CommonImportDialog
      v-model="importDialogVisible"
      title="物料"
      :columns="importColumns"
      :format-tips="importFormatTips"
      :import-fn="handleImportSubmit"
      @success="handleImportSuccess"
    />

    <!-- 分类导入对话框 -->
    <CategoryImportDialog
      v-model="categoryImportDialogVisible"
      @success="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { ElTree } from 'element-plus'
import { Plus, Folder, FolderAdd, Refresh, Upload, Download, View, Hide, Delete } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  getCategoryTree,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  importProducts,
  toggleProductStatus,
  batchDeleteProducts
} from '@/api/product'
import CommonImportDialog from '@/components/CommonImportDialog.vue'
import CategoryImportDialog from './CategoryImportDialog.vue'

declare const XLSX: any

interface CategoryNode {
  id: string
  name: string
  parentId?: string | null
  sortOrder?: number
  status?: string
  children?: CategoryNode[]
}

interface ProductItem {
  id: string
  code: string
  name: string
  spec?: string
  unit?: string
  categoryId?: string | null
  category?: CategoryNode
  costPrice?: number | string
  salePrice?: number | string
  status?: string
  enableBatch?: boolean
  enableExpiry?: boolean
  enableSN?: boolean
}

const treeProps = { label: 'name', children: 'children', value: 'id' }

const loading = ref(false)
const categoryTree = ref<CategoryNode[]>([])
const allProducts = ref<ProductItem[]>([])
const displayProducts = ref<ProductItem[]>([])
const categoryFilterText = ref('')
const selectedCategoryId = ref<string | null>(null)
const showInactive = ref(false)

const categoryTreeRef = ref<InstanceType<typeof ElTree>>()

const searchForm = reactive({ keyword: '' })

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'admin')

// 分类对话框
const categoryDialogVisible = ref(false)
const categoryDialogTitle = ref('新增分类')
const categoryIsEdit = ref(false)
const categorySubmitLoading = ref(false)
const categoryFormRef = ref<FormInstance>()
const categoryForm = reactive({ id: '', name: '', parentId: null as string | null, sortOrder: 0 })
const categoryRules: FormRules = { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] }

// 物料对话框
const productDialogVisible = ref(false)
const productDialogTitle = ref('新增物料')
const productIsEdit = ref(false)
const productSubmitLoading = ref(false)
const productFormRef = ref<FormInstance>()
const productForm = reactive({
  id: '',
  code: '',
  name: '',
  spec: '',
  unit: '个',
  categoryId: '' as string,
  costPrice: 0,
  salePrice: 0,
  status: 'active',
  enableBatch: false,
  enableExpiry: false,
  enableSN: false
})
const productRules: FormRules = {
  code: [{ required: true, message: '请输入物料编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

// 导入
const importDialogVisible = ref(false)
const categoryImportDialogVisible = ref(false)
const importColumns = [
  { prop: 'code', label: '编码', required: true, unique: true },
  { prop: 'name', label: '名称', required: true },
  { prop: 'spec', label: '规格' },
  { prop: 'unit', label: '单位' },
  { prop: 'category', label: '分类', required: true },
  { prop: 'costPrice', label: '成本价' },
  { prop: 'salePrice', label: '销售价' },
  { prop: 'status', label: '状态' }
]
const importFormatTips = [
  '编码：必填，唯一标识，不可重复',
  '名称：必填',
  '规格：选填',
  '单位：选填，如：个、件、箱等',
  '分类：必填，填写分类名称，必须先创建分类',
  '成本价：选填，数字格式',
  '销售价：选填，数字格式',
  '状态：选填，填写"启用"或"禁用"，默认为启用'
]

// 树形选择器数据（编辑时排除自身及子孙）
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

function formatPrice(val: number | string | undefined) {
  if (val === undefined || val === null || val === '') return '—'
  const num = Number(val)
  return Number.isNaN(num) ? '—' : num.toFixed(2)
}

async function loadData() {
  try {
    loading.value = true
    const catRes = await getCategoryTree()
    if (catRes.success) {
      categoryTree.value = catRes.data || []
    }
    // 如果有选中分类，加载该分类的物料，否则加载前100条
    if (selectedCategoryId.value) {
      await loadProductsByCategory(selectedCategoryId.value)
    } else {
      await loadAllProducts(100)
    }
  } catch (e) {
    console.error('加载数据失败:', e)
  } finally {
    loading.value = false
  }
}

// 加载所有物料（限制数量）
async function loadAllProducts(limit: number = 100) {
  try {
    const res = await getProducts({
      page: 1,
      limit,
      ...(showInactive.value ? {} : { status: 'active' })
    })
    if (res.success) {
      allProducts.value = res.data.items || []
      displayProducts.value = res.data.items || []
    }
  } catch (e) {
    console.error('加载物料列表失败:', e)
  }
}

// 按分类加载物料
async function loadProductsByCategory(categoryId: string) {
  try {
    const res = await getProducts({
      page: 1,
      limit: 100,
      categoryId,
      ...(showInactive.value ? {} : { status: 'active' })
    })
    if (res.success) {
      allProducts.value = res.data.items || []
      displayProducts.value = res.data.items || []
    }
  } catch (e) {
    console.error('按分类加载物料失败:', e)
  }
}

function toggleShowInactive() {
  showInactive.value = !showInactive.value
  loadData()
}

function handleShowAll() {
  selectedCategoryId.value = null
  categoryTreeRef.value?.setCurrentKey(undefined as unknown as string)
  loadAllProducts(100)
}

function handleCategoryNodeClick(data: CategoryNode) {
  selectedCategoryId.value = data.id
  loadProductsByCategory(data.id)
}

// 优化：使用防抖搜索，避免频繁重建树结构
let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    try {
      loading.value = true
      const res = await getProducts({
        page: 1,
        limit: 100,
        search: searchForm.keyword.trim() || undefined,
        // 搜索时不限制分类，允许跨分类搜索
        ...(showInactive.value ? {} : { status: 'active' })
      })
      if (res.success) {
        allProducts.value = res.data.items || []
        displayProducts.value = res.data.items || []
      }
    } catch (e) {
      console.error('搜索物料失败:', e)
    } finally {
      loading.value = false
    }
  }, 300)
}

function handleResetSearch() {
  searchForm.keyword = ''
  if (selectedCategoryId.value) {
    loadProductsByCategory(selectedCategoryId.value)
  } else {
    loadAllProducts(100)
  }
}

// 分类操作
function handleAddRootCategory() {
  categoryIsEdit.value = false
  categoryDialogTitle.value = '新增物料分类'
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
  getCategories().then(res => {
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
    const categoriesRes = await getCategories()
    let categoryName = '该分类'
    if (categoriesRes.success) {
      const categories = categoriesRes.data || []
      const flatCategories = flattenCategories(categories)
      const node = flatCategories.find(c => c.id === selectedCategoryId.value)
      if (node) categoryName = node.name
    }

    await ElMessageBox.confirm(`确定删除分类「${categoryName}」吗？`, '提示', { type: 'warning' })
    const res = await deleteCategory(selectedCategoryId.value)
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
      const res = await updateCategory(categoryForm.id, payload)
      if (res.success) ElMessage.success('更新成功')
    } else {
      const res = await createCategory(payload)
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

// 物料操作
function handleCreateProduct() {
  productIsEdit.value = false
  productDialogTitle.value = '新增物料'
  resetProductForm()
  if (selectedCategoryId.value) {
    productForm.categoryId = selectedCategoryId.value
  }
  productDialogVisible.value = true
}

async function handleEditProduct(row: ProductItem) {
  try {
    const res = await getProductById(row.id)
    if (res.success) {
      productIsEdit.value = true
      productDialogTitle.value = '编辑物料'
      const p = res.data
      productForm.id = p.id
      productForm.code = p.code
      productForm.name = p.name
      productForm.spec = p.spec || ''
      productForm.unit = p.unit || '个'
      productForm.categoryId = p.categoryId || ''
      productForm.costPrice = Number(p.costPrice) || 0
      productForm.salePrice = Number(p.salePrice) || 0
      productForm.status = p.status || 'active'
      productForm.enableBatch = p.enableBatch || false
      productForm.enableExpiry = p.enableExpiry || false
      productForm.enableSN = p.enableSN || false
      productDialogVisible.value = true
    }
  } catch (e) {
    console.error(e)
  }
}

async function toggleProductStatus(row: any) {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const actionName = newStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定${actionName}「${row.name}」吗？`, '提示', { type: 'warning' })
    const res = await toggleProductStatus(row.id, newStatus)
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

async function handleDeleteProduct(row: ProductItem) {
  try {
    await ElMessageBox.confirm(`确定删除物料「${row.name}」吗？`, '提示', { type: 'warning' })
    const res = await deleteProduct(row.id)
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

async function handleSubmitProduct() {
  if (!productFormRef.value) return
  await productFormRef.value.validate()
  productSubmitLoading.value = true
  try {
    const payload = {
      code: productForm.code,
      name: productForm.name,
      spec: productForm.spec,
      unit: productForm.unit,
      categoryId: productForm.categoryId,
      costPrice: productForm.costPrice,
      salePrice: productForm.salePrice,
      status: productForm.status,
      enableBatch: productForm.enableBatch,
      enableExpiry: productForm.enableExpiry,
      enableSN: productForm.enableSN
    }
    if (productIsEdit.value) {
      const res = await updateProduct(productForm.id, payload)
      if (res.success) ElMessage.success('更新成功')
    } else {
      const res = await createProduct(payload as any)
      if (res.success) ElMessage.success('创建成功')
    }
    productDialogVisible.value = false
    await loadData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    productSubmitLoading.value = false
  }
}

function resetProductForm() {
  productForm.id = ''
  productForm.code = ''
  productForm.name = ''
  productForm.spec = ''
  productForm.unit = '个'
  productForm.categoryId = selectedCategoryId.value || ''
  productForm.costPrice = 0
  productForm.salePrice = 0
  productForm.status = 'active'
  productForm.enableBatch = false
  productForm.enableExpiry = false
  productForm.enableSN = false
  productFormRef.value?.resetFields()
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
      newItem.categoryError = `分类 "${item.category}" 不存在`
    }

    return newItem
  })

  return await importProducts(processedData)
}

function handleImportSuccess() {
  loadData()
}

function handleExport() {
  if (typeof XLSX === 'undefined') {
    ElMessage.error('Excel 导出库未加载，请刷新页面重试')
    return
  }
  const headers = ['物料编码', '物料名称', '规格', '单位', '成本价', '销售价', '分类', '状态']
  const data = allProducts.value.map(p => [
    p.code,
    p.name,
    p.spec || '',
    p.unit || '',
    p.costPrice || 0,
    p.salePrice || 0,
    p.category?.name || '',
    p.status === 'active' ? '启用' : '禁用'
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '物料列表')
  XLSX.writeFile(wb, `物料列表_${new Date().toLocaleDateString()}.xlsx`)
  ElMessage.success('导出成功')
}

async function handleDeleteAll() {
  try {
    await ElMessageBox.confirm(
      '确定要删除全部物料吗？此操作不可恢复！',
      '危险操作',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
        distinguishCancelAndClose: true,
      }
    )

    const productIds = allProducts.value.map(p => p.id)
    
    if (productIds.length === 0) {
      ElMessage.info('没有物料需要删除')
      return
    }

    const loadingInstance = ElLoading.service({
      lock: true,
      text: `正在删除 ${productIds.length} 个物料...`,
      background: 'rgba(0, 0, 0, 0.7)',
    })

    try {
      const result = await batchDeleteProducts(productIds)
      loadingInstance.close()

      if (result.success) {
        const { successIds, errors } = result.data
        
        if (errors.length > 0) {
          const errorMessages = errors.map(err => err.message).join('；')
          ElMessage.warning(
            `删除完成：成功 ${successIds.length} 个，失败 ${errors.length} 个。失败原因：${errorMessages}`
          )
          console.error('删除失败的物料:', errors)
        } else {
          ElMessage.success(`删除完成：成功 ${successIds.length} 个`)
        }

        await loadData()
      } else {
        ElMessage.error(result.message || '删除失败')
      }
    } catch (error) {
      loadingInstance.close()
      ElMessage.error('删除失败，请稍后重试')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除全部物料失败:', error)
    }
  }
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
  XLSX.writeFile(wb, `物料分类_${new Date().toLocaleDateString()}.xlsx`)
  ElMessage.success('导出成功')
}

onMounted(() => loadData())
</script>

<style scoped>
.product-page { padding: 0; }

.product-name-with-category {
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

.product-layout {
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