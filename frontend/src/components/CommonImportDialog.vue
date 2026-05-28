<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`批量导入${title}`"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="import-steps">
      <el-steps :active="currentStep" finish-status="success" simple>
        <el-step title="上传文件" />
        <el-step title="数据预览" />
        <el-step title="导入进度" />
        <el-step title="导入结果" />
      </el-steps>
    </div>

    <!-- 步骤1: 上传文件 -->
    <div v-if="currentStep === 0" class="step-content">
      <div class="template-section">
        <h4>下载导入模板</h4>
        <p class="desc">请先下载模板文件，按格式填写信息后上传</p>
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
          <li v-for="(tip, index) in formatTips" :key="index">{{ tip }}</li>
        </ul>
      </div>
    </div>

    <!-- 步骤2: 数据预览 -->
    <div v-if="currentStep === 1" class="step-content">
      <div class="preview-header">
        <span>共解析到 <strong>{{ parsedData.length }}</strong> 条数据</span>
        <span class="valid-count">有效数据: <strong>{{ validDataCount }}</strong> 条</span>
        <span v-if="invalidDataCount > 0" class="invalid-count">无效数据: <strong>{{ invalidDataCount }}</strong> 条</span>
        <el-button v-if="invalidDataCount > 0" type="danger" size="small" @click="showInvalidData" plain>
          查看无效数据
        </el-button>
      </div>

      <el-table
        :data="parsedData.slice(0, 50)"
        height="350"
        border
        stripe
        size="small"
      >
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column
          v-for="col in previewColumns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
        >
          <template #default="{ row }">
            <span :class="{ 'error-text': row.errors?.[col.prop] }">{{ row[col.prop] || '-' }}</span>
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
    <div v-if="currentStep === 2" class="step-content">
      <div class="progress-section">
        <h3 class="progress-title">正在导入{{ title }}...</h3>
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
            <el-table-column
              v-for="col in failureColumns"
              :key="col.prop"
              :prop="col.prop"
              :label="col.label"
              :width="col.width"
              :min-width="col.minWidth"
            />
            <el-table-column prop="reason" label="失败原因" min-width="200" />
          </el-table>
        </div>
      </div>
    </div>

    <!-- 无效数据对话框 -->
    <el-dialog
      v-model="invalidDataDialogVisible"
      title="无效数据明细"
      width="900px"
      append-to-body
    >
      <div class="invalid-data-header">
        <span>共 {{ invalidDataCount }} 条无效数据</span>
        <el-button size="small" @click="copyInvalidData">复制全部</el-button>
        <el-button size="small" type="primary" @click="exportInvalidData">导出Excel</el-button>
      </div>
      <el-table
        :data="invalidDataList"
        border
        stripe
        size="small"
        height="400"
      >
        <el-table-column type="index" width="60" label="行号" />
        <el-table-column
          v-for="col in previewColumns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :min-width="120"
        >
          <template #default="{ row }">
            <span :class="{ 'error-text': row.errors?.[col.prop] }">{{ row[col.prop] || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="errorMsg" label="错误原因" min-width="250" />
      </el-table>
    </el-dialog>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="currentStep > 0 && currentStep < 2" @click="currentStep--">
          上一步
        </el-button>
        <el-button v-if="currentStep === 0 || currentStep === 3" @click="dialogVisible = false">
          {{ currentStep === 3 ? '完成' : '取消' }}
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
          @click="confirmImport"
        >
          确认导入
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Document } from '@element-plus/icons-vue'

// XLSX is loaded from CDN
declare const XLSX: any

interface ColumnConfig {
  prop: string
  label: string
  width?: number
  minWidth?: number
  required?: boolean
  unique?: boolean
}

interface ImportResult {
  success: boolean
  message: string
  successCount: number
  failCount: number
  totalCount: number
  failures: any[]
}

const props = defineProps<{
  modelValue: boolean
  title: string
  columns: ColumnConfig[]
  formatTips: string[]
  importFn: (data: any[]) => Promise<{ success: boolean; message?: string; data?: { successCount: number; failCount: number; errors?: any[] } }>
  customValidateFn?: (data: any[]) => any[]
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
const parsedData = ref<any[]>([])
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
const invalidDataDialogVisible = ref(false)

const previewColumns = computed(() => props.columns.filter(c => c.prop !== 'errors' && c.prop !== 'valid' && c.prop !== 'errorMsg'))
const failureColumns = computed(() => props.columns.filter(c => c.required).slice(0, 2))
const validDataCount = computed(() => parsedData.value.filter(d => d.valid).length)
const invalidDataCount = computed(() => parsedData.value.filter(d => !d.valid).length)
const invalidDataList = computed(() => parsedData.value.filter(d => !d.valid))

watch(() => props.modelValue, (val) => {
  if (val) resetData()
})

function resetData() {
  currentStep.value = 0
  uploadFile.value = null
  parsedData.value = []
  importProgress.value = { current: 0, total: 0, success: 0, fail: 0, percentage: 0, currentItem: '' }
  importResult.value = { success: false, message: '', successCount: 0, failCount: 0, totalCount: 0, failures: [] }
  uploadRef.value?.clearFiles()
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

function showInvalidData() {
  invalidDataDialogVisible.value = true
}

function copyInvalidData() {
  const invalidItems = invalidDataList.value.map((item, index) => {
    const row = index + 1
    const errors = item.errorMsg
    const data = Object.entries(item)
      .filter(([key]) => key !== 'valid' && key !== 'errorMsg')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
    return `行${row}: ${errors}\n数据: ${data}`
  }).join('\n\n')

  navigator.clipboard.writeText(invalidItems).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function exportInvalidData() {
  if (typeof XLSX === 'undefined') {
    ElMessage.error('Excel 导出库未加载，请刷新页面重试')
    return
  }

  const invalidItems = invalidDataList.value.map((item, index) => {
    const row = index + 1
    const exportItem: any = {
      行号: row,
      错误信息: item.errorMsg
    }
    
    // 添加所有列的数据
    props.columns.forEach(col => {
      exportItem[col.label] = item[col.prop] || ''
    })
    
    // 标记错误字段
    props.columns.forEach(col => {
      if (item.errors?.[col.prop]) {
        const label = col.label + '(错误)'
        exportItem[label] = '❌ ' + (item[col.prop] || '')
      }
    })
    
    return exportItem
  })

  const worksheet = XLSX.utils.json_to_sheet(invalidItems)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '错误数据')
  
  // 设置列宽
  const colWidths = props.columns.map(col => ({
    wch: Math.max(col.label.length + 5, 15)
  }))
  worksheet['!cols'] = colWidths
  
  const fileName = `${props.title}_错误数据_${new Date().toLocaleDateString()}.xlsx`
  XLSX.writeFile(workbook, fileName)
  ElMessage.success(`已导出 ${invalidItems.length} 条错误数据`)
}

function downloadTemplate(type: 'excel' | 'csv') {
  const headers = props.columns.map(c => c.label)
  const example = props.columns.map(c => {
    if (c.prop === 'code') return 'EX001'
    if (c.prop === 'name') return `示例${props.title}`
    if (c.prop === 'status') return '启用'
    return ''
  })

  if (type === 'excel' && typeof XLSX !== 'undefined') {
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${props.title}导入模板`)
    XLSX.writeFile(wb, `${props.title}导入模板.xlsx`)
  } else {
    const csvContent = [headers.join(','), example.join(',')].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${props.title}导入模板.csv`
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
    let validatedData = validateData(rows)
    
    // 如果有自定义验证函数，则调用它
    if (props.customValidateFn) {
      validatedData = props.customValidateFn(validatedData)
    }
    
    parsedData.value = validatedData
    currentStep.value = 1
  } catch (error) {
    console.error('解析文件失败:', error)
    ElMessage.error('解析文件失败，请检查文件格式')
  }
}

function readFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result)
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

  if (jsonData.length < 2) return []

  const headers = jsonData[0].map((h: string) => h?.toString().trim())
  const rows = jsonData.slice(1)

  // 映射列索引
  const colIndex: Record<string, number> = {}
  props.columns.forEach(col => {
    const idx = headers.findIndex(h => h?.includes(col.label) || h?.toLowerCase().includes(col.prop.toLowerCase()))
    if (idx >= 0) colIndex[col.prop] = idx
  })

  return rows.map((row: any[]) => {
    const obj: any = {}
    props.columns.forEach(col => {
      obj[col.prop] = row[colIndex[col.prop]]?.toString().trim() || ''
    })
    return obj
  })
}

function validateData(rows: any[]): any[] {
  const uniqueValues: Record<string, Set<string>> = {}
  props.columns.filter(c => c.unique).forEach(c => uniqueValues[c.prop] = new Set())

  return rows.map(row => {
    const errors: Record<string, boolean> = {}
    const errorsList: string[] = []

    props.columns.forEach(col => {
      if (col.required && !row[col.prop]) {
        errors[col.prop] = true
        errorsList.push(`${col.label}不能为空`)
      }
      if (col.unique && row[col.prop]) {
        if (uniqueValues[col.prop].has(row[col.prop])) {
          errors[col.prop] = true
          errorsList.push(`${col.label} "${row[col.prop]}" 重复`)
        } else {
          uniqueValues[col.prop].add(row[col.prop])
        }
      }
    })

    // 处理状态
    if (row.status) {
      const statusStr = row.status.toString().toLowerCase()
      if (['停用', '禁用', 'inactive', '0', 'false', '否'].includes(statusStr)) {
        row.status = 'inactive'
      } else {
        row.status = 'active'
      }
    } else {
      row.status = 'active'
    }

    return {
      ...row,
      valid: errorsList.length === 0,
      errorMsg: errorsList.join('; '),
      errors
    }
  })
}

async function confirmImport() {
  const validData = parsedData.value.filter(d => d.valid)
  const invalidData = parsedData.value.filter(d => !d.valid)
  
  if (invalidData.length > 0) {
    ElMessageBox.confirm(
      `发现 ${invalidData.length} 条数据不符合要求，是否继续导入有效的 ${validData.length} 条数据？`,
      '数据验证结果',
      {
        confirmButtonText: '继续导入',
        cancelButtonText: '导出错误数据',
        distinguishCancelAndClose: true,
        type: 'warning',
      }
    ).then(() => {
      startImport(validData)
    }).catch((action) => {
      if (action === 'cancel') {
        exportInvalidData()
      }
    })
    return
  }
  
  if (validData.length === 0) {
    ElMessage.warning('没有有效的数据可以导入')
    return
  }

  startImport(validData)
}

async function startImport(validData: any[]) {
  importing.value = true
  currentStep.value = 2

  importProgress.value = {
    current: 0,
    total: validData.length,
    success: 0,
    fail: 0,
    percentage: 0,
    currentItem: ''
  }

  const failures: any[] = []
  let successCount = 0

  try {
    // 逐行导入
    for (let i = 0; i < validData.length; i++) {
      const row = validData[i]
      importProgress.value.current = i + 1
      importProgress.value.currentItem = row.name || row.code || `第${i + 1}条`
      importProgress.value.percentage = Math.round(((i + 1) / validData.length) * 100)

      try {
        const res = await props.importFn([row])
        if (res.success && res.data) {
          if (res.data.successCount > 0) {
            successCount += res.data.successCount
            importProgress.value.success += res.data.successCount
          }
          if (res.data.errors && res.data.errors.length > 0) {
            res.data.errors.forEach((err: any) => {
              failures.push({ ...row, reason: err.message || '导入失败' })
            })
            importProgress.value.fail += res.data.errors.length
          }
        } else {
          failures.push({ ...row, reason: res.message || '创建失败' })
          importProgress.value.fail++
        }
      } catch (error: any) {
        failures.push({ ...row, reason: error?.response?.data?.message || '网络错误' })
        importProgress.value.fail++
      }

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

.invalid-data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #fef0f0;
  border-radius: 4px;
  border-left: 4px solid #f56c6c;
}

.invalid-data-header span {
  font-size: 14px;
  color: #f56c6c;
  font-weight: 600;
}

.preview-header {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}

.preview-header .valid-count {
  color: #67c23a;
}

.preview-header .invalid-count {
  color: #f56c6c;
}

.preview-header .el-button {
  margin-left: auto;
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
</style>