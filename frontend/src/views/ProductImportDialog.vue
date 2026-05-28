<template>
  <el-dialog
    v-model="dialogVisible"
    title="批量导入物料"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="import-steps">
      <el-steps :active="currentStep" finish-status="success" simple>
        <el-step title="上传文件" />
        <el-step title="数据预览" />
        <el-step title="导入结果" />
      </el-steps>
    </div>

    <!-- 步骤1: 上传文件 -->
    <div v-if="currentStep === 0" class="step-content">
      <div class="template-section">
        <h4>下载导入模板</h4>
        <p class="desc">请先下载模板文件，按格式填写物料信息后上传</p>
        <div class="template-actions">
          <el-button type="primary" plain @click="downloadTemplate('excel')">
            <el-icon><Document /></el-icon>
            下载 Excel 模板
          </el-button>
          <el-button type="info" plain @click="downloadTemplate('csv')">
            <el-icon><Document /></el-icon>
            下载 CSV 模板
          </el-button>
        </div>
      </div>

      <el-divider />

      <div class="upload-section">
        <h4>上传文件</h4>
        <p class="desc">支持 Excel (.xlsx, .xls) 或 CSV 格式文件</p>
        <el-upload
          ref="uploadRef"
          class="upload-area"
          drag
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :limit="1"
          accept=".xlsx,.xls,.csv"
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">
            拖拽文件到此处或 <em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              请上传 Excel 或 CSV 文件，文件大小不超过 10MB
            </div>
          </template>
        </el-upload>
      </div>

      <div class="format-tips">
        <h4>格式说明</h4>
        <ul>
          <li>物料编码：必填，唯一标识，不可重复</li>
          <li>物料名称：必填</li>
          <li>规格：选填</li>
          <li>单位：选填，如：个、件、箱等</li>
          <li>成本价：选填，数字格式</li>
          <li>销售价：选填，数字格式</li>
          <li>条码：选填</li>
          <li>品牌：选填</li>
          <li>产地：选填</li>
          <li>重量：选填，数字格式，如：1.5（表示1.5kg）</li>
          <li>体积：选填，数字格式，如：0.05（表示0.05m³）</li>
          <li>启用批次管理：选填，填写"是"或"否"，默认为否</li>
          <li>启用保质期管理：选填，填写"是"或"否"，默认为否</li>
          <li>保质期(天)：选填，数字格式，如：365</li>
          <li>启用SN码管理：选填，填写"是"或"否"，默认为否</li>
          <li>安全库存：选填，数字格式</li>
          <li>最大库存：选填，数字格式</li>
          <li>采购提前期(天)：选填，数字格式</li>
          <li>默认仓库：选填，填写仓库名称</li>
          <li>分类：选填，填写分类名称</li>
          <li>状态：选填，填写"启用"或"停用"，默认为启用</li>
          <li>备注：选填</li>
        </ul>
      </div>
    </div>

    <!-- 步骤2: 数据预览 -->
    <div v-if="currentStep === 1" class="step-content">
      <div class="preview-header">
        <span>共解析到 <strong>{{ parsedData.length }}</strong> 条数据</span>
        <span class="valid-count">有效数据: <strong>{{ validDataCount }}</strong> 条</span>
        <span v-if="invalidDataCount > 0" class="invalid-count">无效数据: <strong>{{ invalidDataCount }}</strong> 条</span>
      </div>

      <el-table
        :data="parsedData.slice(0, 50)"
        height="350"
        border
        stripe
        size="small"
      >
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column prop="code" label="物料编码" width="120">
          <template #default="{ row }">
            <span :class="{ 'error-text': row.errors?.code }">{{ row.code || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="物料名称" min-width="150">
          <template #default="{ row }">
            <span :class="{ 'error-text': row.errors?.name }">{{ row.name || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="spec" label="规格" width="100" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="costPrice" label="成本价" width="100" align="right">
          <template #default="{ row }">
            {{ row.costPrice ? Number(row.costPrice).toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="salePrice" label="销售价" width="100" align="right">
          <template #default="{ row }">
            {{ row.salePrice ? Number(row.salePrice).toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="barcode" label="条码" width="120" />
        <el-table-column prop="brand" label="品牌" width="100" />
        <el-table-column prop="categoryName" label="分类" width="100" />
        <el-table-column prop="defaultWarehouseName" label="默认仓库" width="120" />
        <el-table-column label="管理属性" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.enableBatch" size="small" type="primary">批次</el-tag>
            <el-tag v-if="row.enableExpiry" size="small" type="warning">保质期</el-tag>
            <el-tag v-if="row.enableSN" size="small" type="success">SN码</el-tag>
            <span v-if="!row.enableBatch && !row.enableExpiry && !row.enableSN">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="校验" width="100" fixed="right">
          <template #default="{ row }">
            <el-tag v-if="row.valid" type="success" size="small">有效</el-tag>
            <el-tooltip v-else :content="row.errorMsg" placement="top">
              <el-tag type="danger" size="small">错误</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="parsedData.length > 50" class="preview-more">
        仅显示前 50 条数据，共 {{ parsedData.length }} 条
      </div>
    </div>

    <!-- 步骤3: 导入进度 -->
    <div v-if="currentStep === 2 && importing" class="step-content">
      <div class="progress-section">
        <h3 class="progress-title">正在导入物料...</h3>
        <el-progress
          :percentage="importProgress.percentage"
          :stroke-width="20"
          :text-inside="true"
          status="success"
        />
        
        <div class="progress-stats">
          <div class="stat">
            <span class="label">已处理:</span>
            <span class="value">{{ importProgress.current }} / {{ importProgress.total }} 条</span>
          </div>
          <div class="stat">
            <span class="label">成功:</span>
            <span class="value success">{{ importProgress.success }} 条</span>
          </div>
          <div class="stat">
            <span class="label">失败:</span>
            <span class="value error">{{ importProgress.fail }} 条</span>
          </div>
        </div>
        
        <div class="progress-detail">
          <p>正在处理: {{ importProgress.currentItem || '准备中...' }}</p>
        </div>
      </div>
    </div>

    <!-- 步骤4: 导入结果 -->
    <div v-if="currentStep === 3" class="step-content">
      <div class="result-section">
        <el-result
          :icon="importResult.success ? 'success' : 'warning'"
          :title="importResult.success ? '导入成功' : '导入完成'"
          :sub-title="importResult.message"
        >
          <template #extra>
            <div class="result-stats">
              <div class="stat-item">
                <span class="label">成功导入:</span>
                <span class="value success">{{ importResult.successCount }} 条</span>
              </div>
              <div v-if="importResult.failCount > 0" class="stat-item">
                <span class="label">导入失败:</span>
                <span class="value error">{{ importResult.failCount }} 条</span>
              </div>
              <div class="stat-item">
                <span class="label">总计:</span>
                <span class="value">{{ importResult.totalCount }} 条</span>
              </div>
            </div>
          </template>
        </el-result>

        <div v-if="importResult.failures && importResult.failures.length > 0" class="failures-list">
          <h4>失败明细</h4>
          <el-table :data="importResult.failures" border size="small" height="200">
            <el-table-column type="index" width="50" label="行号" />
            <el-table-column prop="code" label="物料编码" width="120" />
            <el-table-column prop="name" label="物料名称" width="150" />
            <el-table-column prop="reason" label="失败原因" min-width="200" />
          </el-table>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="currentStep > 0 && currentStep < 2" @click="currentStep--">
          上一步
        </el-button>
        <el-button v-if="currentStep === 0" @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          v-if="currentStep === 0"
          type="primary"
          :disabled="!uploadFile"
          @click="parseFile"
        >
          下一步
        </el-button>
        <el-button
          v-if="currentStep === 1"
          type="primary"
          :disabled="validDataCount === 0"
          :loading="importing"
          @click="confirmImport"
        >
          确认导入
        </el-button>
        <el-button v-if="currentStep === 3" type="primary" @click="dialogVisible = false">
          完成
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Document } from '@element-plus/icons-vue'
import { createProduct } from '@/api/product'

// XLSX is loaded from CDN
declare const XLSX: any

interface CategoryNode {
  id: string
  name: string
  parentId?: string | null
  children?: CategoryNode[]
}

interface Warehouse {
  id: string
  name: string
  code: string
}

interface ImportRow {
  code: string
  name: string
  spec?: string
  unit?: string
  costPrice?: number
  salePrice?: number
  barcode?: string
  brand?: string
  origin?: string
  weight?: number
  volume?: number
  enableBatch?: boolean
  enableExpiry?: boolean
  shelfLife?: number
  enableSN?: boolean
  minStock?: number
  maxStock?: number
  leadTime?: number
  defaultWarehouseId?: string
  defaultWarehouseName?: string
  categoryId?: string
  categoryName?: string
  status: string
  remark?: string
  valid: boolean
  errorMsg?: string
  errors?: Record<string, boolean>
}

interface ImportResult {
  success: boolean
  message: string
  successCount: number
  failCount: number
  totalCount: number
  failures: Array<{ code: string; name: string; reason: string }>
}

const props = defineProps<{
  modelValue: boolean
  categoryTree: CategoryNode[]
  warehouses: Warehouse[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const currentStep = ref(0)
const uploadRef = ref()
const uploadFile = ref<File | null>(null)
const parsedData = ref<ImportRow[]>([])
const importing = ref(false)
const importProgress = ref({
  current: 0,
  total: 0,
  success: 0,
  fail: 0,
  percentage: 0,
  currentItem: ''
})
const importResult = ref<ImportResult>({
  success: false,
  message: '',
  successCount: 0,
  failCount: 0,
  totalCount: 0,
  failures: []
})

const validDataCount = computed(() => parsedData.value.filter(d => d.valid).length)
const invalidDataCount = computed(() => parsedData.value.filter(d => !d.valid).length)

// 构建分类名称映射
const categoryMap = computed(() => {
  const map = new Map<string, string>()
  const walk = (nodes: CategoryNode[], parentName = '') => {
    nodes.forEach(node => {
      map.set(node.id, node.name)
      map.set(node.name, node.id)
      map.set(node.name.toLowerCase(), node.id)
      if (node.children?.length) {
        walk(node.children, parentName)
      }
    })
  }
  walk(props.categoryTree)
  return map
})

// 构建仓库名称映射
const warehouseMap = computed(() => {
  const map = new Map<string, string>()
  props.warehouses.forEach(wh => {
    map.set(wh.id, wh.name)
    map.set(wh.name, wh.id)
    map.set(wh.code, wh.id)
    map.set(wh.name.toLowerCase(), wh.id)
    map.set(wh.code.toLowerCase(), wh.id)
  })
  return map
})

watch(() => props.modelValue, (val) => {
  if (val) {
    resetData()
  }
})

function resetData() {
  currentStep.value = 0
  uploadFile.value = null
  parsedData.value = []
  importProgress.value = {
    current: 0,
    total: 0,
    success: 0,
    fail: 0,
    percentage: 0,
    currentItem: ''
  }
  importResult.value = {
    success: false,
    message: '',
    successCount: 0,
    failCount: 0,
    totalCount: 0,
    failures: []
  }
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

function handleClose() {
  resetData()
}

function handleFileChange(file: any) {
  uploadFile.value = file.raw
}

function handleFileRemove() {
  uploadFile.value = null
}

function downloadTemplate(type: 'excel' | 'csv') {
  const defaultWarehouse = props.warehouses.length > 0 ? props.warehouses[0].name : ''
  const headers = [
    '物料编码', '物料名称', '规格', '单位', '成本价', '销售价', '条码',
    '品牌', '产地', '重量', '体积',
    '启用批次管理', '启用保质期管理', '保质期(天)',
    '启用SN码管理', '安全库存', '最大库存', '采购提前期(天)',
    '默认仓库', '分类', '状态', '备注'
  ]
  const example = [
    'P001', '示例物料A', '规格A', '个', '10.00', '15.00', '6901234567890',
    '示例品牌', '中国', '1.5', '0.05',
    '否', '否', '',
    '否', '', '', '',
    defaultWarehouse, '默认分类', '启用', '示例备注'
  ]

  if (type === 'excel' && typeof XLSX !== 'undefined') {
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '物料导入模板')
    XLSX.writeFile(wb, '物料导入模板.xlsx')
  } else {
    const csvContent = [headers.join(','), example.join(',')].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '物料导入模板.csv'
    link.click()
  }
  ElMessage.success('模板下载成功')
}

async function parseFile() {
  if (!uploadFile.value) {
    ElMessage.warning('请先上传文件')
    return
  }

  if (typeof XLSX === 'undefined') {
    ElMessage.error('Excel 解析库未加载，请刷新页面重试')
    return
  }

  try {
    const file = uploadFile.value
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
      ElMessage.error('不支持的文件格式，请上传 Excel 或 CSV 文件')
      return
    }

    const data = await readFile(file)
    const rows = parseData(data, extension as string)
    parsedData.value = validateData(rows)
    currentStep.value = 1
  } catch (error) {
    console.error('解析文件失败:', error)
    ElMessage.error('解析文件失败，请检查文件格式')
  }
}

function readFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        resolve(data)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'csv') {
      reader.readAsText(file, 'UTF-8')
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

function parseData(data: any, extension: string): any[] {
  let workbook: any

  if (extension === 'csv') {
    workbook = XLSX.read(data, { type: 'string', codepage: 65001 })
  } else {
    workbook = XLSX.read(data, { type: 'array' })
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

  if (jsonData.length < 2) {
    return []
  }

  const headers = jsonData[0].map((h: string) => h?.toString().trim())
  const rows = jsonData.slice(1)

  // 映射列索引
  const colIndex: Record<string, number> = {}
  const headerMap: Record<string, string[]> = {
    code: ['物料编码', '编码', 'code', 'sku', '编号'],
    name: ['物料名称', '名称', 'name', '产品名称', '商品名称'],
    spec: ['规格', '规格型号', 'spec', '型号'],
    unit: ['单位', 'unit', '计量单位'],
    costPrice: ['成本价', '成本价格', 'costPrice', 'cost', '进价'],
    salePrice: ['销售价', '销售价格', 'salePrice', 'price', '售价', '单价'],
    barcode: ['条码', 'barcode', '条形码', '商品条码'],
    brand: ['品牌', 'brand', '商标'],
    origin: ['产地', 'origin', '原产地', '生产地'],
    weight: ['重量', 'weight', '净重'],
    volume: ['体积', 'volume', '容积'],
    enableBatch: ['启用批次管理', '批次管理', 'enableBatch'],
    enableExpiry: ['启用保质期管理', '保质期管理', 'enableExpiry'],
    shelfLife: ['保质期(天)', '保质期', 'shelfLife', '有效期'],
    enableSN: ['启用SN码管理', 'SN码管理', '序列号管理', 'enableSN'],
    minStock: ['安全库存', '最小库存', 'minStock', '安全存货'],
    maxStock: ['最大库存', 'maxStock', '最大存货'],
    leadTime: ['采购提前期(天)', '采购提前期', 'leadTime', '供货周期'],
    defaultWarehouse: ['默认仓库', 'defaultWarehouse', '仓库'],
    category: ['分类', '类别', 'category', '分类名称', '所属分类'],
    status: ['状态', 'status', '启用状态'],
    remark: ['备注', 'remark', '说明']
  }

  for (const [key, aliases] of Object.entries(headerMap)) {
    for (let i = 0; i < headers.length; i++) {
      if (aliases.some(alias => headers[i]?.includes(alias))) {
        colIndex[key] = i
        break
      }
    }
  }

  return rows.map((row: any[]) => ({
    code: row[colIndex.code]?.toString().trim() || '',
    name: row[colIndex.name]?.toString().trim() || '',
    spec: row[colIndex.spec]?.toString().trim() || '',
    unit: row[colIndex.unit]?.toString().trim() || '',
    costPrice: parseFloat(row[colIndex.costPrice]) || undefined,
    salePrice: parseFloat(row[colIndex.salePrice]) || undefined,
    barcode: row[colIndex.barcode]?.toString().trim() || '',
    brand: row[colIndex.brand]?.toString().trim() || '',
    origin: row[colIndex.origin]?.toString().trim() || '',
    weight: parseFloat(row[colIndex.weight]) || undefined,
    volume: parseFloat(row[colIndex.volume]) || undefined,
    enableBatch: parseBoolean(row[colIndex.enableBatch]),
    enableExpiry: parseBoolean(row[colIndex.enableExpiry]),
    shelfLife: parseInt(row[colIndex.shelfLife]) || undefined,
    enableSN: parseBoolean(row[colIndex.enableSN]),
    minStock: parseInt(row[colIndex.minStock]) || undefined,
    maxStock: parseInt(row[colIndex.maxStock]) || undefined,
    leadTime: parseInt(row[colIndex.leadTime]) || undefined,
    defaultWarehouse: row[colIndex.defaultWarehouse]?.toString().trim() || '',
    category: row[colIndex.category]?.toString().trim() || '',
    status: row[colIndex.status]?.toString().trim() || '启用',
    remark: row[colIndex.remark]?.toString().trim() || ''
  }))
}

function parseBoolean(value: any): boolean {
  if (!value) return false
  const str = value.toString().toLowerCase()
  return ['是', 'yes', 'true', '1', '启用'].includes(str)
}

function validateData(rows: any[]): ImportRow[] {
  const codes = new Set<string>()

  return rows.map((row, index) => {
    const errors: Record<string, boolean> = {}
    const errorsList: string[] = []

    // 校验编码
    if (!row.code) {
      errors.code = true
      errorsList.push('物料编码不能为空')
    } else if (codes.has(row.code)) {
      errors.code = true
      errorsList.push(`物料编码 "${row.code}" 重复`)
    } else {
      codes.add(row.code)
    }

    // 校验名称
    if (!row.name) {
      errors.name = true
      errorsList.push('物料名称不能为空')
    }

    // 处理分类
    let categoryId: string | undefined
    let categoryName: string | undefined
    if (row.category) {
      categoryId = categoryMap.value.get(row.category)
      if (!categoryId) {
        categoryId = categoryMap.value.get(row.category.toLowerCase())
      }
      if (categoryId) {
        const findCategory = (nodes: CategoryNode[]): CategoryNode | undefined => {
          for (const n of nodes) {
            if (n.id === categoryId) return n
            if (n.children?.length) {
              const found = findCategory(n.children)
              if (found) return found
            }
          }
          return undefined
        }
        const cat = findCategory(props.categoryTree)
        categoryName = cat?.name || row.category
      }
    }

    // 处理默认仓库
    let defaultWarehouseId: string | undefined
    let defaultWarehouseName: string | undefined
    if (row.defaultWarehouse) {
      defaultWarehouseId = warehouseMap.value.get(row.defaultWarehouse)
      if (!defaultWarehouseId) {
        defaultWarehouseId = warehouseMap.value.get(row.defaultWarehouse.toLowerCase())
      }
      if (defaultWarehouseId) {
        const wh = props.warehouses.find(w => w.id === defaultWarehouseId)
        defaultWarehouseName = wh?.name || row.defaultWarehouse
      }
    }

    // 处理状态
    let status = 'active'
    if (row.status) {
      const statusStr = row.status.toString().toLowerCase()
      if (['停用', '禁用', 'inactive', '0', 'false', '否'].includes(statusStr)) {
        status = 'inactive'
      }
    }

    // 保质期管理校验
    if (row.enableExpiry && !row.shelfLife) {
      errors.shelfLife = true
      errorsList.push('启用保质期管理时必须填写保质期')
    }

    return {
      code: row.code,
      name: row.name,
      spec: row.spec,
      unit: row.unit,
      costPrice: row.costPrice,
      salePrice: row.salePrice,
      barcode: row.barcode,
      brand: row.brand,
      origin: row.origin,
      weight: row.weight,
      volume: row.volume,
      enableBatch: row.enableBatch,
      enableExpiry: row.enableExpiry,
      shelfLife: row.shelfLife,
      enableSN: row.enableSN,
      minStock: row.minStock,
      maxStock: row.maxStock,
      leadTime: row.leadTime,
      defaultWarehouseId,
      defaultWarehouseName,
      categoryId,
      categoryName,
      status,
      remark: row.remark,
      valid: errorsList.length === 0,
      errorMsg: errorsList.join('; '),
      errors
    }
  })
}

async function confirmImport() {
  const validData = parsedData.value.filter(d => d.valid)
  if (validData.length === 0) {
    ElMessage.warning('没有有效的数据可以导入')
    return
  }

  importing.value = true
  currentStep.value = 2

  // 初始化进度
  importProgress.value = {
    current: 0,
    total: validData.length,
    success: 0,
    fail: 0,
    percentage: 0,
    currentItem: ''
  }

  const failures: Array<{ code: string; name: string; reason: string }> = []
  let successCount = 0

  try {
    for (let i = 0; i < validData.length; i++) {
      const row = validData[i]

      // 更新进度
      importProgress.value.current = i + 1
      importProgress.value.currentItem = `${row.code} - ${row.name}`
      importProgress.value.percentage = Math.round(((i + 1) / validData.length) * 100)

      try {
        const res: any = await createProduct({
          code: row.code,
          name: row.name,
          spec: row.spec,
          unit: row.unit,
          costPrice: row.costPrice,
          salePrice: row.salePrice,
          barcode: row.barcode,
          brand: row.brand,
          origin: row.origin,
          weight: row.weight,
          volume: row.volume,
          enableBatch: row.enableBatch,
          enableExpiry: row.enableExpiry,
          shelfLife: row.shelfLife,
          enableSN: row.enableSN,
          minStock: row.minStock,
          maxStock: row.maxStock,
          leadTime: row.leadTime,
          defaultWarehouseId: row.defaultWarehouseId,
          categoryId: row.categoryId,
          status: row.status,
          remark: row.remark
        })

        if (res.success) {
          successCount++
          importProgress.value.success++
        } else {
          failures.push({
            code: row.code,
            name: row.name,
            reason: res.message || '创建失败'
          })
          importProgress.value.fail++
        }
      } catch (error: any) {
        failures.push({
          code: row.code,
          name: row.name,
          reason: error?.response?.data?.message || '网络错误'
        })
        importProgress.value.fail++
      }

      // 每处理10条让出时间片，避免UI卡顿
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    importResult.value = {
      success: failures.length === 0,
      message: failures.length === 0
        ? `成功导入 ${successCount} 条数据`
        : `导入完成，成功 ${successCount} 条，失败 ${failures.length} 条`,
      successCount,
      failCount: failures.length,
      totalCount: validData.length,
      failures
    }

    currentStep.value = 3
    emit('success')
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.import-steps {
  margin-bottom: 20px;
}

.step-content {
  min-height: 300px;
}

.template-section,
.upload-section {
  margin-bottom: 20px;
}

.template-section h4,
.upload-section h4,
.format-tips h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.template-section .desc,
.upload-section .desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: #909399;
}

.template-actions {
  display: flex;
  gap: 12px;
}

.upload-area {
  width: 100%;
}

.format-tips {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
}

.format-tips ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #606266;
}

.format-tips li {
  margin: 4px 0;
}

.preview-header {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
  font-size: 14px;
}

.preview-header .valid-count {
  color: #67c23a;
}

.preview-header .invalid-count {
  color: #f56c6c;
}

.preview-header strong {
  font-weight: 600;
}

.preview-more {
  text-align: center;
  padding: 12px;
  color: #909399;
  font-size: 13px;
}

.error-text {
  color: #f56c6c;
}

.result-section {
  padding: 20px 0;
}

.result-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  padding: 0 40px;
}

.result-stats .stat-item {
  display: flex;
  justify-content: space-between;
}

.result-stats .value {
  font-weight: 600;
}

.result-stats .value.success {
  color: #67c23a;
}

.result-stats .value.error {
  color: #f56c6c;
}

.failures-list {
  margin-top: 20px;
}

.failures-list h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 进度条样式 */
.progress-section {
  padding: 40px 20px;
  text-align: center;
}

.progress-title {
  margin: 0 0 30px;
  font-size: 18px;
  font-weight: 500;
  color: #303133;
}

.progress-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 30px;
}

.progress-stats .stat {
  text-align: center;
}

.progress-stats .label {
  display: block;
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.progress-stats .value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.progress-stats .value.success {
  color: #67c23a;
}

.progress-stats .value.error {
  color: #f56c6c;
}

.progress-detail {
  margin-top: 30px;
  padding: 12px 20px;
  background: #f5f7fa;
  border-radius: 4px;
}

.progress-detail p {
  margin: 0;
  font-size: 13px;
  color: #606266;
}
</style>