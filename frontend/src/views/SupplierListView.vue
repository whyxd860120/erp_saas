<template>
  <div class="supplier-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>��Ӧ�̹���</span>
          <div class="header-actions">
            <el-button type="primary" plain @click="handleAddRootCategory">
              <el-icon><FolderAdd /></el-icon>
              ������Ӧ�̷���
            </el-button>
            <el-button type="primary" plain :disabled="!selectedCategoryId" @click="handleAddChildCategory">
              <el-icon><FolderAdd /></el-icon>
              �����ӷ���
            </el-button>
            <el-button type="primary" :disabled="!selectedCategoryId" @click="handleCreateSupplier">
              <el-icon><Plus /></el-icon>
              ������Ӧ��
            </el-button>
            <el-button @click="loadData">
              <el-icon><Refresh /></el-icon>
              ˢ��
            </el-button>
            <el-button :type="showInactive ? 'warning' : 'default'" @click="toggleShowInactive">
              <el-icon><View v-if="!showInactive" /><Hide v-else /></el-icon>
              {{ showInactive ? '���ؽ���' : '��ʾ����' }}
            </el-button>
            <el-dropdown split-button type="success" plain @click="handleImport">
              <el-icon><Upload /></el-icon>
              ���빩Ӧ��
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleImportCategories">
                    <el-icon><FolderAdd /></el-icon>
                    �������
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-dropdown split-button type="info" plain @click="handleExport">
              <el-icon><Download /></el-icon>
              ������Ӧ��
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleExportCategories">
                    <el-icon><Download /></el-icon>
                    ��������
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </template>

      <div class="supplier-layout">
        <!-- �������� -->
        <div class="category-panel">
          <div class="panel-title">
            <span>��Ӧ�̷���</span>
            <el-button
              link
              type="primary"
              size="small"
              :class="{ 'is-active': !selectedCategoryId }"
              @click="handleShowAll"
            >
              ȫ��
            </el-button>
          </div>
          <el-input
            v-model="categoryFilterText"
            placeholder="ɸѡ����"
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
                    ({{ data.children?.length || 0 }}���ӷ���, {{ data.supplierCount }}����Ӧ��)
                  </span>
                </span>
              </template>
            </el-tree>
          </el-scrollbar>
          <div class="category-actions" v-if="selectedCategoryId">
            <el-button link type="primary" @click="handleEditCategory">�༭����</el-button>
            <el-button link type="danger" @click="handleDeleteCategory">ɾ������</el-button>
          </div>
        </div>

        <!-- �Ҳ����α��� -->
        <div class="table-panel">
          <el-form :inline="true" :model="searchForm" class="search-form" @submit.prevent>
            <el-form-item label="�ؼ���">
              <el-input
                v-model="searchForm.keyword"
                placeholder="���� / ���� / ��ϵ��"
                clearable
                @input="handleSearch"
                @keyup.enter="handleSearch"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">����</el-button>
              <el-button @click="handleResetSearch">����</el-button>
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
            <el-table-column prop="name" label="��Ӧ������" min-width="220">
              <template #default="{ row }">
                <span v-if="row.category?.name" class="supplier-name-with-category">
                  <span class="category-prefix">[{{ row.category.name }}]</span>
                  {{ row.name }}
                </span>
                <span v-else>{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="code" label="��Ӧ�̱���" width="130" />
            <el-table-column prop="contact" label="��ϵ��" width="120" />
            <el-table-column prop="phone" label="�绰" width="140" />
            <el-table-column prop="bankName" label="������" width="180" />
            <el-table-column prop="bankAccount" label="�����˺�" width="180" />
            <el-table-column label="״̬" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '����' : '����' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="����" width="200" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleEditSupplier(row)">
                  �༭
                </el-button>
                <el-button link type="danger" size="small" @click="handleDeleteSupplier(row)">
                  ɾ��
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>

    <!-- ����Ի��� -->
    <el-dialog v-model="categoryDialogVisible" :title="categoryDialogTitle" width="480px" @close="resetCategoryForm">
      <el-form ref="categoryFormRef" :model="categoryForm" :rules="categoryRules" label-width="90px">
        <el-form-item label="��������" prop="name">
          <el-input v-model="categoryForm.name" placeholder="�������������" />
        </el-form-item>
        <el-form-item label="�ϼ�����" prop="parentId">
          <el-tree-select
            v-model="categoryForm.parentId"
            :data="categoryTreeForSelect"
            :props="treeProps"
            check-strictly
            clearable
            placeholder="��ѡ��Ϊ������"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="����" prop="sortOrder">
          <el-input-number v-model="categoryForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">ȡ��</el-button>
        <el-button type="primary" :loading="categorySubmitLoading" @click="handleSubmitCategory">
          ȷ��
        </el-button>
      </template>
    </el-dialog>

    <!-- ��Ӧ�̶Ի��� -->
    <el-dialog v-model="supplierDialogVisible" :title="supplierDialogTitle" width="560px" @close="resetSupplierForm">
      <el-form ref="supplierFormRef" :model="supplierForm" :rules="supplierRules" label-width="90px">
        <el-form-item label="����" prop="code">
          <el-input v-model="supplierForm.code" placeholder="��Ӧ�̱���" />
        </el-form-item>
        <el-form-item label="����" prop="name">
          <el-input v-model="supplierForm.name" placeholder="��Ӧ������" />
        </el-form-item>
        <el-form-item label="��������" prop="categoryId">
          <el-tree-select
            v-model="supplierForm.categoryId"
            :data="categoryTreeForSelect"
            :props="treeProps"
            check-strictly
            placeholder="��ѡ�����"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="��ϵ��" prop="contact">
          <el-input v-model="supplierForm.contact" placeholder="��ϵ��" />
        </el-form-item>
        <el-form-item label="�绰" prop="phone">
          <el-input v-model="supplierForm.phone" placeholder="�绰" />
        </el-form-item>
        <el-form-item label="����" prop="email">
          <el-input v-model="supplierForm.email" placeholder="����" />
        </el-form-item>
        <el-form-item label="��ַ" prop="address">
          <el-input v-model="supplierForm.address" type="textarea" :rows="2" placeholder="��ַ" />
        </el-form-item>
        <el-form-item label="������" prop="bankName">
          <el-input v-model="supplierForm.bankName" placeholder="������" />
        </el-form-item>
        <el-form-item label="�����˺�" prop="bankAccount">
          <el-input v-model="supplierForm.bankAccount" placeholder="�����˺�" />
        </el-form-item>
        <el-form-item label="״̬" prop="status">
          <el-radio-group v-model="supplierForm.status">
            <el-radio value="active">����</el-radio>
            <el-radio value="inactive">����</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="supplierDialogVisible = false">ȡ��</el-button>
        <el-button type="primary" :loading="supplierSubmitLoading" @click="handleSubmitSupplier">
          ȷ��
        </el-button>
      </template>
    </el-dialog>

    <!-- ����Ի��� -->
    <CommonImportDialog
      v-model="importDialogVisible"
      title="��Ӧ��"
      :columns="importColumns"
      :format-tips="importFormatTips"
      :import-fn="handleImportSubmit"
      @success="handleImportSuccess"
    />

    <!-- ���ർ��Ի��� -->
    <SupplierCategoryImportDialog
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
import { Plus, Folder, FolderAdd, Refresh, Upload, Download, View, Hide } from '@element-plus/icons-vue'
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
  toggleSupplierStatus,\n  toggleSupplierStatus
} from '@/api/supplier'
import CommonImportDialog from '@/components/CommonImportDialog.vue'
import SupplierCategoryImportDialog from './SupplierCategoryImportDialog.vue'

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

// ����Ի���
const categoryDialogVisible = ref(false)
const categoryDialogTitle = ref('��������')
const categoryIsEdit = ref(false)
const categorySubmitLoading = ref(false)
const categoryFormRef = ref<FormInstance>()
const categoryForm = reactive({ id: '', name: '', parentId: null as string | null, sortOrder: 0 })
const categoryRules: FormRules = { name: [{ required: true, message: '�������������', trigger: 'blur' }] }

// ��Ӧ�̶Ի���
const supplierDialogVisible = ref(false)
const supplierDialogTitle = ref('������Ӧ��')
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
  code: [{ required: true, message: '�����빩Ӧ�̱���', trigger: 'blur' }],
  name: [{ required: true, message: '�����빩Ӧ������', trigger: 'blur' }],
  categoryId: [{ required: true, message: '��ѡ�����', trigger: 'change' }]
}

// ����
const importDialogVisible = ref(false)
const categoryImportDialogVisible = ref(false)
const importColumns = [
  { prop: 'code', label: '����', required: true, unique: true },
  { prop: 'name', label: '����', required: true },
  { prop: 'category', label: '��Ӧ�̷���' },
  { prop: 'contact', label: '��ϵ��' },
  { prop: 'phone', label: '�绰' },
  { prop: 'email', label: '����' },
  { prop: 'address', label: '��ַ' },
  { prop: 'bankName', label: '������' },
  { prop: 'bankAccount', label: '�����˺�' },
  { prop: 'status', label: '״̬' }
]
const importFormatTips = [
  '���룺���Ψһ��ʶ�������ظ�',
  '���ƣ�����',
  '��Ӧ�̷��ࣺѡ���д�������ƣ�������ʱ���Զ�����',
  '��ϵ�ˡ��绰�����䡢��ַ��ѡ��',
  '�����С������˺ţ�ѡ��',
  '״̬��ѡ���д"����"��"����"��Ĭ��Ϊ����'
]

// ����ѡ�������ݣ��༭ʱ�ų����������
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

// �Ż�������ɸѡ����
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
    // �����ѡ�з��࣬���ظ÷���Ĺ�Ӧ�̣��������ǰ100��
    if (selectedCategoryId.value) {
      await loadSuppliersByCategory(selectedCategoryId.value)
    } else {
      await loadAllSuppliers(100)
    }
  } catch (e) {
    console.error('��������ʧ��:', e)
  } finally {
    loading.value = false
  }
}

// �������й�Ӧ�̣�����������
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
    console.error('���ع�Ӧ���б�ʧ��:', e)
  }
}

// ��������ع�Ӧ��
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
    console.error('��������ع�Ӧ��ʧ��:', e)
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

// �Ż���ʹ�÷�������������Ƶ���ؽ����ṹ
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
        // ����ʱ�����Ʒ��࣬�������������
        ...(showInactive.value ? {} : { status: 'active' })
      })
      if (res.success) {
        allSuppliers.value = res.data.items || []
        displaySuppliers.value = res.data.items || []
      }
    } catch (e) {
      console.error('������Ӧ��ʧ��:', e)
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

// �������
function handleAddRootCategory() {
  categoryIsEdit.value = false
  categoryDialogTitle.value = '������Ӧ�̷���'
  categoryForm.id = ''
  categoryForm.name = ''
  categoryForm.parentId = null
  categoryForm.sortOrder = 0
  categoryDialogVisible.value = true
}

function handleAddChildCategory() {
  if (!selectedCategoryId.value) return
  categoryIsEdit.value = false
  categoryDialogTitle.value = '�����ӷ���'
  categoryForm.id = ''
  categoryForm.name = ''
  categoryForm.parentId = selectedCategoryId.value
  categoryForm.sortOrder = 0
  categoryDialogVisible.value = true
}

async function handleEditCategory() {
  if (!selectedCategoryId.value) return
  // �Ӻ�˻�ȡ��������
  getSupplierCategories().then(res => {
    if (res.success) {
      const categories = res.data || []
      const flatCategories = flattenCategories(categories)
      const node = flatCategories.find(c => c.id === selectedCategoryId.value)
      if (node) {
        categoryIsEdit.value = true
        categoryDialogTitle.value = '�༭����'
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
    // ��ȡ������������ȷ��
    const categoriesRes = await getSupplierCategories()
    let categoryName = '�÷���'
    if (categoriesRes.success) {
      const categories = categoriesRes.data || []
      const flatCategories = flattenCategories(categories)
      const node = flatCategories.find(c => c.id === selectedCategoryId.value)
      if (node) categoryName = node.name
    }

    await ElMessageBox.confirm(`ȷ��ɾ�����ࡸ${categoryName}����`, '��ʾ', { type: 'warning' })
    const res = await deleteSupplierCategory(selectedCategoryId.value)
    if (res.success) {
      ElMessage.success('ɾ���ɹ�')
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
      if (res.success) ElMessage.success('���³ɹ�')
    } else {
      const res = await createSupplierCategory(payload)
      if (res.success) ElMessage.success('�����ɹ�')
    }
    categoryDialogVisible.value = false
    await loadData()
    if (categoryForm.id) {
      nextTick(() => categoryTreeRef.value?.setCurrentKey(categoryForm.id))
    } else if (categoryForm.parentId) {
      nextTick(() => categoryTreeRef.value?.setCurrentKey(categoryForm.parentId!))
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '����ʧ��')
  } finally {
    categorySubmitLoading.value = false
  }
}

function resetCategoryForm() {
  categoryFormRef.value?.resetFields()
}

// ��Ӧ�̲���
function handleCreateSupplier() {
  supplierIsEdit.value = false
  supplierDialogTitle.value = '������Ӧ��'
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
      supplierDialogTitle.value = '�༭��Ӧ��'
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


async function toggleSupplierStatus(row: SupplierItem) {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const actionName = newStatus === 'active' ? '����' : '����'
  try {
    await ElMessageBox.confirm(`ȷ��${actionName}��${row.name}����`, '��ʾ', { type: 'warning' })
    const res = await toggleSupplierStatus(row.id, newStatus)
    if (res.success) {
      ElMessage.success(`${actionName}�ɹ�`)
      await loadData()
    } else {
      ElMessage.error(res.message || `${actionName}ʧ��`)
    }
  } catch (e: any) {
    if (e !== 'cancel' && e?.response?.data?.message) {
      ElMessage.error(e.response.data.message)
    }
  }
}
async function toggleSupplierStatus(row: any) {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const actionName = newStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定${actionName}「${row.name}」吗？`, '提示', { type: 'warning' })
    const res = await toggleSupplierStatus(row.id, newStatus)
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

async function handleDeleteSupplier(row: SupplierItem) {
  try {
    await ElMessageBox.confirm(`ȷ��ɾ����Ӧ�̡�${row.name}����`, '��ʾ', { type: 'warning' })
    const res = await deleteSupplier(row.id)
    if (res.success) {
      ElMessage.success('ɾ���ɹ�')
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
      if (res.success) ElMessage.success('���³ɹ�')
    } else {
      const res = await createSupplier(payload as any)
      if (res.success) ElMessage.success('�����ɹ�')
    }
    supplierDialogVisible.value = false
    await loadData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '����ʧ��')
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

// ���뵼��
function handleImport() {
  importDialogVisible.value = true
}

function handleImportCategories() {
  categoryImportDialogVisible.value = true
}

async function handleImportSubmit(data: any[]) {
  // ת����������Ϊ����ID
  const categoryMap = new Map<string, string>()

  // �����������Ƶ�ID��ӳ��
  const buildCategoryMap = (categories: CategoryNode[]) => {
    categories.forEach(cat => {
      categoryMap.set(cat.name, cat.id)
      if (cat.children?.length) {
        buildCategoryMap(cat.children)
      }
    })
  }
  buildCategoryMap(categoryTree.value)

  // ת����������
  const processedData = data.map(item => {
    const newItem: any = { ...item }

    // ת����������ΪID
    if (item.category && categoryMap.has(item.category)) {
      newItem.categoryId = categoryMap.get(item.category)
      delete newItem.category
    } else if (item.category) {
      newItem.categoryError = `��Ӧ�̷��� "${item.category}" ������`
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
    ElMessage.error('Excel ������δ���أ���ˢ��ҳ������')
    return
  }
  const headers = ['��Ӧ�̱���', '��Ӧ������', '��ϵ��', '�绰', '����', '��ַ', '������', '�����˺�', '����', '״̬']
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
    s.status === 'active' ? '����' : '����'
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '��Ӧ���б�')
  XLSX.writeFile(wb, `��Ӧ���б�_${new Date().toLocaleDateString()}.xlsx`)
  ElMessage.success('�����ɹ�')
}

function handleExportCategories() {
  if (typeof XLSX === 'undefined') {
    ElMessage.error('Excel ������δ���أ���ˢ��ҳ������')
    return
  }
  const headers = ['��������', '�ϼ�����', '����', '״̬']
  const flattenCategories = (nodes: CategoryNode[], parentName = '', result: any[] = []) => {
    nodes.forEach(node => {
      result.push([node.name, parentName, node.sortOrder || 0, node.status === 'active' ? '����' : '����'])
      if (node.children?.length) flattenCategories(node.children, node.name, result)
    })
    return result
  }
  const data = flattenCategories(categoryTree.value)
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '�����б�')
  XLSX.writeFile(wb, `��Ӧ�̷���_${new Date().toLocaleDateString()}.xlsx`)
  ElMessage.success('�����ɹ�')
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
