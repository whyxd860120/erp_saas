<template>
  <div class="menu-management">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">菜单管理</h2>
        <p class="page-desc">拖拽调整菜单顺序和层级关系</p>
      </div>
      <div class="header-right">
        <el-button @click="handleExpandAll">
          <el-icon><Expand /></el-icon>
          {{ isExpandAll ? '折叠全部' : '展开全部' }}
        </el-button>
        <el-button @click="showGuideDialog = true">
          <el-icon><QuestionFilled /></el-icon>
          使用指南
        </el-button>
        <el-button type="success" @click="handleSaveOrder" :loading="saveLoading">
          <el-icon><Check /></el-icon>
          保存修改
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新增菜单
        </el-button>
      </div>
    </div>

    <div class="content-wrapper">
      <el-card class="tree-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="card-title">菜单结构</span>
            <el-tooltip content="拖拽菜单项可以调整顺序和层级关系" placement="top">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
        </template>

        <div class="tree-toolbar">
          <el-input
            v-model="searchText"
            placeholder="搜索菜单..."
            prefix-icon="Search"
            clearable
            style="width: 250px"
          />
          <div class="tree-stats">
            共 {{ totalMenus }} 个菜单
          </div>
        </div>

        <el-tree
          v-loading="loading"
          ref="treeRef"
          :data="treeData"
          node-key="id"
          :props="treeProps"
          :expand-on-click-node="false"
          :default-expand-all="isExpandAll"
          :filter-node-method="filterNode"
          draggable
          :allow-drop="allowDrop"
          :allow-drag="allowDrag"
          highlight-current
          class="menu-tree"
          @node-drag-start="handleDragStart"
          @node-drag-end="handleDragEnd"
        >
          <template #default="{ node, data }">
            <div
              class="tree-node-content"
              :class="{
                'is-system': data.isSystem,
                'is-dragging': draggingNodeId === data.id
              }"
            >
              <div class="node-left">
                <el-icon class="node-icon" :style="{ color: getIconColor(data.level) }">
                  <component :is="data.icon || 'Folder'" />
                </el-icon>
                <span class="node-name">{{ data.name }}</span>
                <el-tag v-if="data.isSystem" size="small" type="warning">系统</el-tag>
                <el-tag v-if="data.path" size="small" type="info" class="path-tag">
                  {{ data.path }}
                </el-tag>
                <span class="level-badge">L{{ (data.level || 1) }}</span>
              </div>
              <div class="node-right">
                <span class="node-code">{{ data.code }}</span>
                <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, data, node)">
                  <el-button link type="primary" size="small">
                    操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="add">
                        <el-icon><Plus /></el-icon>
                        新增子菜单
                      </el-dropdown-item>
                      <el-dropdown-item command="setAsParent" v-if="!data.parentId">
                        <el-icon><Connection /></el-icon>
                        设为一级菜单
                      </el-dropdown-item>
                      <el-dropdown-item command="edit">
                        <el-icon><Edit /></el-icon>
                        编辑
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided :disabled="hasChildren(data)">
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </template>
        </el-tree>
      </el-card>

      <el-card class="help-card" shadow="never">
        <template #header>
          <span class="card-title">操作提示</span>
        </template>
        <div class="help-content">
          <div class="help-item">
            <el-icon color="#409eff"><Top /></el-icon>
            <span>拖拽到同级菜单上方/下方可以调整顺序</span>
          </div>
          <div class="help-item">
            <el-icon color="#67c23a"><Right /></el-icon>
            <span>拖拽到某个菜单上可以设置为子菜单</span>
          </div>
          <div class="help-item">
            <el-icon color="#e6a23c"><Bottom /></el-icon>
            <span>通过"操作→设为一级菜单"可以提升层级</span>
          </div>
          <div class="help-item">
            <el-icon color="#909399"><QuestionFilled /></el-icon>
            <span>点击"保存修改"才能生效</span>
          </div>
        </div>

        <el-divider />

        <div class="level-legend">
          <div class="legend-title">菜单层级</div>
          <div class="legend-item" v-for="level in 3" :key="level">
            <span class="level-badge" :class="`level-${level}`">L{{ level }}</span>
            <span>{{ level === 1 ? '一级菜单' : level === 2 ? '二级菜单' : '三级菜单' }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="650px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="菜单名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入菜单名称" />
        </el-form-item>

        <el-form-item label="菜单编码" prop="code">
          <el-input
            v-model="formData.code"
            placeholder="请输入菜单编码"
            :disabled="isEdit && formData.isSystem"
          >
            <template #prefix>
              <el-icon><Key /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="路由路径" prop="path">
          <el-input v-model="formData.path" placeholder="请输入路由路径，如 /products">
            <template #prefix>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
          <div class="form-tip">如 /products、/sales-orders、/inventory 等</div>
        </el-form-item>

        <el-form-item label="图标" prop="icon">
          <el-select
            v-model="formData.icon"
            placeholder="选择图标"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="icon in iconOptions"
              :key="icon"
              :label="icon"
              :value="icon"
            >
              <span style="display: flex; align-items: center;">
                <el-icon style="margin-right: 8px"><component :is="icon" /></el-icon>
                {{ icon }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="父级菜单" prop="parentId">
          <el-tree-select
            v-model="formData.parentId"
            :data="menuTreeData"
            :props="treeSelectProps"
            check-strictly
            :render-after-expand="false"
            clearable
            placeholder="选择父级菜单（不选则为一级菜单）"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
          <div class="form-tip">数字越小越靠前</div>
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="2"
            placeholder="请输入描述（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showGuideDialog"
      title="菜单管理使用指南"
      width="700px"
      class="guide-dialog"
    >
      <div class="guide-content">
        <el-tabs>
          <el-tab-pane label="快速入门" name="quick">
            <div class="guide-section">
              <h4>🎯 主要功能</h4>
              <ul>
                <li><strong>查看菜单结构</strong>：树形结构展示所有菜单</li>
                <li><strong>拖拽调整</strong>：拖拽调整菜单顺序和层级关系</li>
                <li><strong>新增菜单</strong>：添加一级或子菜单</li>
                <li><strong>编辑菜单</strong>：修改菜单属性</li>
                <li><strong>删除菜单</strong>：删除不需要的菜单</li>
              </ul>
            </div>

            <div class="guide-section">
              <h4>⚡ 快速操作</h4>
              <div class="guide-steps">
                <el-steps direction="vertical" :space="60" :active="4">
                  <el-step title="查看菜单" description="在左侧看到所有菜单的树形结构" />
                  <el-step title="拖拽调整" description="直接拖拽菜单项到目标位置" />
                  <el-step title="保存修改" description="点击右上角的'保存修改'按钮" />
                  <el-step title="完成！" description="菜单结构已更新" />
                </el-steps>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="拖拽操作" name="drag">
            <div class="guide-section">
              <h4>🖱️ 拖拽调整顺序</h4>
              <p>将菜单拖拽到同级菜单的上方或下方，可以调整菜单的排列顺序。</p>
              <div class="guide-tip">
                <el-icon><InfoFilled /></el-icon>
                <span>提示：数字越小越靠前</span>
              </div>
            </div>

            <div class="guide-section">
              <h4>🔄 调整层级关系</h4>
              <table class="guide-table">
                <tr>
                  <td>设为子菜单</td>
                  <td>拖拽菜单项到另一个菜单上（需非系统菜单）</td>
                </tr>
                <tr>
                  <td>设为一级别</td>
                  <td>拖拽到空白区域，或使用"操作 → 设为一级菜单"</td>
                </tr>
                <tr>
                  <td>层级限制</td>
                  <td>最多支持3级菜单（L1 → L2 → L3）</td>
                </tr>
              </table>
            </div>

            <div class="guide-section">
              <h4>⚠️ 注意事项</h4>
              <ul>
                <li>系统菜单（橙色背景）不能作为拖拽目标</li>
                <li>拖拽操作需要点击"保存修改"才能生效</li>
                <li>删除有子菜单的菜单前需先删除子菜单</li>
              </ul>
            </div>
          </el-tab-pane>

          <el-tab-pane label="菜单属性" name="properties">
            <div class="guide-section">
              <h4>📋 菜单属性说明</h4>
              <table class="guide-table full-width">
                <thead>
                  <tr>
                    <th>属性</th>
                    <th>说明</th>
                    <th>示例</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>菜单名称</strong></td>
                    <td>显示在界面上的名称</td>
                    <td>供应商管理</td>
                  </tr>
                  <tr>
                    <td><strong>菜单编码</strong></td>
                    <td>唯一标识，只能包含小写字母和下划线</td>
                    <td>supplier</td>
                  </tr>
                  <tr>
                    <td><strong>路由路径</strong></td>
                    <td>访问该菜单的URL路径</td>
                    <td>/suppliers</td>
                  </tr>
                  <tr>
                    <td><strong>图标</strong></td>
                    <td>Element Plus图标名称</td>
                    <td>OfficeBuilding</td>
                  </tr>
                  <tr>
                    <td><strong>父级菜单</strong></td>
                    <td>上级菜单，不选则为一级菜单</td>
                    <td>基础资料</td>
                  </tr>
                  <tr>
                    <td><strong>排序</strong></td>
                    <td>数字越小越靠前</td>
                    <td>1</td>
                  </tr>
                  <tr>
                    <td><strong>描述</strong></td>
                    <td>备注信息（可选）</td>
                    <td>管理供应商信息</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="菜单结构" name="structure">
            <div class="guide-section">
              <h4>📊 当前菜单结构</h4>
              <pre class="structure-tree">
仪表盘 (dashboard)
├── 基础资料 (basic)
│   ├── 供应商管理 (supplier)
│   ├── 客户管理 (customer)
│   ├── 物料管理 (product)
│   ├── 仓库管理 (warehouse)
│   └── 账户管理 (account)
├── 采购管理 (purchase)
│   ├── 采购订单 (purchase_order)
│   └── 采购入库 (purchase_inbound)
├── 销售管理 (sales)
│   ├── 销售订单 (sales_order)
│   └── 销售出库 (sales_outbound)
├── 库存管理 (inventory)
│   ├── 库存查询 (inventory_query)
│   ├── 盘点单 (stock_take)
│   ├── 其他入库 (other_inbound)
│   ├── 其他出库 (other_outbound)
│   └── 调拨单 (stock_transfer)
├── 财务管理 (finance)
│   ├── 收款单 (payment_receipt)
│   └── 付款单 (payment_payment)
├── 用户与权限 (user_permission)
│   ├── 人员管理 (user)
│   ├── 角色权限 (role)
│   └── 菜单管理 (menu_management)
├── 工作流 (workflow)
│   ├── 工作流管理 (workflow_management)
│   └── 审批中心 (approval_center)
└── 系统设置 (system_settings)
    ├── 单据编码规则 (numbering_rule)
    ├── 账套参数 (account_period)
    ├── 租户信息 (tenant_setting)
    ├── 功能开关 (feature_settings)
    ├── 安全设置 (security_settings)
    └── 审计日志 (audit_log)</pre>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <template #footer>
        <el-button type="primary" @click="showGuideDialog = false">
          我知道了，开始使用
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Plus,
  Edit,
  Delete,
  Search,
  Expand,
  ArrowDown,
  Check,
  QuestionFilled,
  Top,
  Bottom,
  Right,
  Connection,
  Folder,
  Key,
  Link,
  InfoFilled,
  Loading,
  Document
} from '@element-plus/icons-vue'
import {
  getMenus,
  getMenusFlat,
  createMenu,
  updateMenu,
  deleteMenu,
  batchUpdateMenus,
  type MenuItem
} from '@/api/menu'

const treeRef = ref()
const treeData = ref<any[]>([])
const menuTreeData = ref<any[]>([])
const allMenus = ref<MenuItem[]>([])
const loading = ref(false)
const submitLoading = ref(false)
const saveLoading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const isExpandAll = ref(true)
const searchText = ref('')
const formRef = ref<FormInstance>()
const currentEditId = ref<string | null>(null)
const parentMenuId = ref<string | null>(null)
const draggingNodeId = ref<string | null>(null)
const hasChanges = ref(false)
const showGuideDialog = ref(false)

const treeProps = {
  children: 'children',
  label: 'name'
}

const treeSelectProps = {
  children: 'children',
  label: 'name',
  value: 'id'
}

const iconOptions = [
  'Odometer', 'Files', 'OfficeBuilding', 'UserFilled', 'Goods',
  'House', 'Wallet', 'ShoppingCart', 'List', 'Box', 'Sell',
  'Tickets', 'Van', 'Money', 'CreditCard', 'Postcard', 'Package',
  'Search', 'User', 'Avatar', 'Grid', 'Setting', 'Document',
  'DataAnalysis', 'TrendCharts', 'Collection', 'Connection',
  'Guide', 'Promotion', 'SetUp', 'Tools', 'Location', 'Stamp',
  'Calendar', 'Bell', 'Message', 'ChatDotRound', 'Phone',
  'VideoCamera', 'Monitor', 'Mic', 'Headset', 'Film', 'Picture',
  'Camera', 'Menu', 'Folder', 'FolderOpened', 'Lock', 'Unlock'
]

const formData = ref({
  name: '',
  code: '',
  path: '',
  icon: '',
  parentId: null as string | null,
  sortOrder: 0,
  description: ''
})

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入菜单名称', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入菜单编码', trigger: 'blur' },
    { pattern: /^[a-z_]+$/, message: '只能包含小写字母和下划线', trigger: 'blur' }
  ]
}

const dialogTitle = computed(() => {
  if (isEdit.value) {
    return parentMenuId.value ? '编辑子菜单' : '编辑菜单'
  }
  return parentMenuId.value ? '新增子菜单' : '新增菜单'
})

const getIconColor = (level: number) => {
  const colors = ['#409eff', '#67c23a', '#e6a23c']
  return colors[(level || 1) - 1] || colors[0]
}

const hasChildren = (data: any) => {
  return data.children && data.children.length > 0
}

const calculateLevel = (data: any, treeData: any[], currentLevel = 1) => {
  if (data.parentId) {
    const parent = findNodeById(treeData, data.parentId)
    if (parent) {
      return calculateLevel(parent, treeData, currentLevel + 1)
    }
  }
  return currentLevel
}

const findNodeById = (nodes: any[], id: string): any => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

const totalMenus = computed(() => {
  let count = 0
  const countRecursive = (items: any[]) => {
    items.forEach(item => {
      count++
      if (item.children && item.children.length > 0) {
        countRecursive(item.children)
      }
    })
  }
  countRecursive(treeData.value)
  return count
})

const loadMenus = async () => {
  console.log('🎯 开始加载菜单...')
  loading.value = true
  try {
    console.log('📡 调用API...')
    const [treeRes, flatRes] = await Promise.all([
      getMenus(),
      getMenusFlat()
    ])

    console.log('✅ API响应:', { treeRes, flatRes })

    if (treeRes.success) {
      const addLevel = (items: any[], level = 1) => {
        return items.map(item => ({
          ...item,
          level,
          children: item.children ? addLevel(item.children, level + 1) : []
        }))
      }
      treeData.value = addLevel(treeRes.data)
      console.log('✅ 树形菜单数据:', treeData.value)
    }
    if (flatRes.success) {
      allMenus.value = flatRes.data
      menuTreeData.value = [
        { id: '', name: '无父级菜单（一级菜单）', children: [] },
        ...treeRes.data
      ]
    }
  } catch (error) {
    console.error('❌ 加载菜单失败:', error)
    ElMessage.error('加载菜单失败')
  } finally {
    loading.value = false
  }
}

const filterNode = (value: string, data: any) => {
  if (!value) return true
  return data.name.toLowerCase().includes(value.toLowerCase())
}

watch(searchText, (val) => {
  treeRef.value?.filter(val)
})

const handleExpandAll = () => {
  isExpandAll.value = !isExpandAll.value
  const nodes = treeRef.value?.store?.nodesMap || {}
  Object.values(nodes).forEach((node: any) => {
    node.expanded = isExpandAll.value
  })
}

const handleDragStart = (node: any) => {
  draggingNodeId.value = node.data.id
}

const handleDragEnd = () => {
  draggingNodeId.value = null
  hasChanges.value = true
}

const allowDrag = (draggingNode: any) => {
  return !draggingNode.data.isSystem || allMenus.value.length === 0
}

const allowDrop = (draggingNode: any, dropNode: any, type: string) => {
  if (type === 'inner') {
    return !dropNode.data.isSystem && (draggingNode.data.level || 1) < 3
  }
  return true
}

const handleDrop = () => {
  hasChanges.value = true
}

const handleSaveOrder = async () => {
  const getTreeData = (nodes: any[]): any[] => {
    return nodes.map(node => ({
      id: node.data.id,
      children: node.childNodes && node.childNodes.length > 0
        ? getTreeData(node.childNodes)
        : []
    }))
  }

  const treeRoot = treeRef.value?.store?.root
  if (!treeRoot || !treeRoot.childNodes) {
    ElMessage.warning('没有可保存的更改')
    return
  }

  const menus = getTreeData(treeRoot.childNodes)

  saveLoading.value = true
  try {
    await batchUpdateMenus(menus)
    ElMessage.success('菜单结构已保存')
    hasChanges.value = false
    loadMenus()
  } catch (error: any) {
    console.error('保存失败:', error)
    ElMessage.error(error.response?.data?.message || '保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleCreate = () => {
  isEdit.value = false
  parentMenuId.value = null
  formData.value = {
    name: '',
    code: '',
    path: '',
    icon: '',
    parentId: null,
    sortOrder: 0,
    description: ''
  }
  dialogVisible.value = true
}

const handleCommand = (command: string, data: any, node: any) => {
  switch (command) {
    case 'add':
      handleAddChild(data)
      break
    case 'edit':
      handleEdit(data)
      break
    case 'setAsParent':
      handleSetAsParent(data, node)
      break
    case 'delete':
      handleDelete(data)
      break
  }
}

const handleAddChild = (data: any) => {
  isEdit.value = false
  parentMenuId.value = data.id
  formData.value = {
    name: '',
    code: '',
    path: '',
    icon: '',
    parentId: data.id,
    sortOrder: 0,
    description: ''
  }
  dialogVisible.value = true
}

const handleEdit = (data: any) => {
  isEdit.value = true
  currentEditId.value = data.id
  parentMenuId.value = null
  formData.value = {
    name: data.name,
    code: data.code,
    path: data.path || '',
    icon: data.icon || '',
    parentId: data.parentId || null,
    sortOrder: data.sortOrder || 0,
    description: data.description || ''
  }
  dialogVisible.value = true
}

const handleSetAsParent = async (data: any, node: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要将"${data.name}"设为一级菜单吗？`,
      '设为一级菜单',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    const res = await updateMenu(data.id, {
      parentId: null
    })

    if (res.success) {
      ElMessage.success('已设为一级菜单')
      hasChanges.value = true
      loadMenus()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('设置失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

const handleDelete = async (data: any) => {
  if (hasChildren(data)) {
    ElMessage.warning('请先删除子菜单')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除菜单"${data.name}"吗？删除后不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await deleteMenu(data.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadMenus()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }

  submitLoading.value = true
  try {
    let res
    if (isEdit.value && currentEditId.value) {
      res = await updateMenu(currentEditId.value, formData.value)
    } else {
      res = await createMenu(formData.value)
    }

    if (res.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      hasChanges.value = true
      loadMenus()
    } else {
      ElMessage.error(res.data.message || '操作失败')
    }
  } catch (error: any) {
    console.error('提交失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('操作失败')
    }
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  console.log('✅ MenuListView 组件已挂载！')
  console.log('📋 开始加载菜单数据...')
  loadMenus()
})
</script>

<style scoped>
.menu-management {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-desc {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
}

.tree-card {
  border-radius: 8px;
}

.help-card {
  border-radius: 8px;
  height: fit-content;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

.help-icon {
  color: #909399;
  font-size: 16px;
}

.tree-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.tree-stats {
  font-size: 14px;
  color: #909399;
}

.menu-tree {
  min-height: 500px;
}

.tree-node-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.tree-node-content:hover {
  background-color: #f5f7fa;
}

.tree-node-content.is-dragging {
  opacity: 0.5;
  background-color: #ecf5ff;
}

.tree-node-content.is-system {
  background-color: #fdf6ec;
}

.node-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.node-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.node-name {
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.path-tag {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
}

.level-badge.level-1 {
  background-color: #ecf5ff;
  color: #409eff;
}

.level-badge.level-2 {
  background-color: #f0f9eb;
  color: #67c23a;
}

.level-badge.level-3 {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.node-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.node-code {
  font-size: 12px;
  color: #909399;
  font-family: monospace;
}

.help-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.help-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #606266;
}

.level-legend {
  margin-top: 16px;
}

.legend-title {
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

:deep(.el-tree-node__content) {
  height: auto;
  padding: 4px 0;
}

:deep(.el-tree-node__content:hover) {
  background-color: transparent;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #ecf5ff;
}

:deep(.el-tree__drop-indicator) {
  background-color: #409eff;
  height: 2px;
}

@media (max-width: 1200px) {
  .content-wrapper {
    grid-template-columns: 1fr;
  }

  .help-card {
    order: -1;
  }
}

.guide-content {
  max-height: 60vh;
  overflow-y: auto;
}

.guide-section {
  margin-bottom: 24px;
}

.guide-section:last-child {
  margin-bottom: 0;
}

.guide-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.guide-section p {
  color: #606266;
  line-height: 1.8;
  margin: 8px 0;
}

.guide-section ul {
  list-style: none;
  padding: 0;
  margin: 8px 0;
}

.guide-section ul li {
  padding: 8px 0;
  color: #606266;
  line-height: 1.6;
  border-bottom: 1px solid #f0f0f0;
}

.guide-section ul li:last-child {
  border-bottom: none;
}

.guide-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #ecf5ff;
  border-radius: 6px;
  color: #409eff;
  font-size: 14px;
}

.guide-steps {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.guide-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

.guide-table td {
  padding: 12px;
  border: 1px solid #ebeef5;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
}

.guide-table td:first-child {
  font-weight: 600;
  background-color: #fafafa;
  color: #303133;
  width: 30%;
}

.guide-table.full-width td:first-child {
  width: 20%;
}

.guide-table thead tr {
  background-color: #f5f7fa;
}

.guide-table th {
  padding: 12px;
  border: 1px solid #ebeef5;
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.structure-tree {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
  overflow-x: auto;
  white-space: pre;
  margin: 0;
}

:deep(.guide-dialog .el-dialog__body) {
  padding: 20px;
}

:deep(.guide-dialog .el-tabs__content) {
  padding: 0 4px;
}
</style>
