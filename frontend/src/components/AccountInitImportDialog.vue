<template>
  <el-dialog
    v-model="visible"
    :title="`${title}导入`"
    width="800px"
    @close="handleClose"
  >
    <div class="import-dialog">
      <el-alert
        title="导入说明"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <template #default>
          <p>1. 支持 Excel (.xlsx) 和 WPS (.xlsx) 格式</p>
          <p>2. 请按照模板格式填写数据</p>
          <p>3. 导入前请先下载模板</p>
          <p>4. 重复数据会自动更新，新增数据会自动添加</p>
        </template>
      </el-alert>

      <div class="template-download">
        <el-button type="primary" @click="downloadTemplate">
          <el-icon><Download /></el-icon>
          下载导入模板
        </el-button>
      </div>

      <el-divider />

      <el-upload
        ref="uploadRef"
        class="upload-area"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 .xlsx 或 .xls 格式的 Excel/WPS 文件，文件大小不超过 10MB
          </div>
        </template>
      </el-upload>

      <div v-if="uploadFile" class="file-info">
        <div class="file-name">
          <el-icon><Document /></el-icon>
          {{ uploadFile.name }}
        </div>
        <div class="file-size">{{ formatFileSize(uploadFile.size) }}</div>
      </div>

      <el-button
        v-if="uploadFile"
        type="primary"
        :loading="importing"
        style="width: 100%; margin-top: 20px"
        @click="handleImport"
      >
        {{ importing ? '导入中...' : '开始导入' }}
      </el-button>

      <!-- 导入结果 -->
      <div v-if="importResult" class="import-result">
        <el-divider />
        <h4>导入结果</h4>
        <el-result
          :icon="importResult.success ? 'success' : 'error'"
          :title="importResult.success ? '导入成功' : '导入失败'"
        >
          <template #sub-title>
            <div class="result-details">
              <p>成功：{{ importResult.successCount }} 条</p>
              <p>失败：{{ importResult.failCount }} 条</p>
              <p v-if="importResult.failCount > 0" style="color: #f56c6c;">
                错误：{{ importResult.errorMessage }}
              </p>
            </div>
          </template>
          <template #extra v-if="importResult.errors && importResult.errors.length > 0">
            <el-collapse>
              <el-collapse-item title="查看详细错误信息" name="errors">
                <div class="error-list">
                  <div v-for="(error, index) in importResult.errors" :key="index" class="error-item">
                    <span class="error-row">第 {{ error.row }} 行：</span>
                    <span class="error-message">{{ error.message }}</span>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </template>
        </el-result>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, UploadFilled, Document } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'

interface Props {
  modelValue: boolean
  title: string
  columns: ImportColumn[]
  onImport: (data: any[]) => Promise<ImportResult>
}

interface ImportColumn {
  prop: string
  label: string
  required?: boolean
  type?: 'string' | 'number' | 'date' | 'boolean'
  options?: string[]
}

interface ImportResult {
  success: boolean
  successCount: number
  failCount: number
  errorMessage?: string
  errors?: Array<{ row: number; message: string }>
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const uploadRef = ref()
const uploadFile = ref<File | null>(null)
const importing = ref(false)
const importResult = ref<ImportResult | null>(null)

const handleFileChange = (file: any) => {
  uploadFile.value = file.raw
  importResult.value = null
}

const handleFileRemove = () => {
  uploadFile.value = null
  importResult.value = null
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const downloadTemplate = () => {
  // 创建模板数据
  const templateData: any[] = [{}]

  // 第一行是表头
  props.columns.forEach(col => {
    templateData[0][col.label] = ''
  })

  // 添加示例行
  const exampleRow: any = {}
  props.columns.forEach(col => {
    if (col.type === 'number') {
      exampleRow[col.label] = col.required ? 0 : ''
    } else if (col.type === 'boolean') {
      exampleRow[col.label] = col.options ? col.options[0] : '是'
    } else if (col.type === 'date') {
      exampleRow[col.label] = '2024-01-01'
    } else {
      exampleRow[col.label] = col.required ? `示例${col.label}` : ''
    }
  })
  templateData.push(exampleRow)

  // 创建工作簿
  const ws = XLSX.utils.json_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, props.title)

  // 生成文件名
  const fileName = `${props.title}导入模板_${new Date().toLocaleDateString()}.xlsx`

  // 下载文件
  XLSX.writeFile(wb, fileName)
  ElMessage.success('模板下载成功')
}

const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = (error) => {
      reject(error)
    }

    reader.readAsArrayBuffer(file)
  })
}

const validateAndMapData = (rawData: any[]): { valid: boolean; data: any[]; errors: Array<{ row: number; message: string }> } => {
  const errors: Array<{ row: number; message: string }> = []
  const validData: any[] = []

  // 跳过第一行（表头）
  const dataRows = rawData.slice(1)

  dataRows.forEach((row, index) => {
    const rowData: any = {}
    const rowErrors: string[] = []

    props.columns.forEach(col => {
      const value = row[col.label]

      // 检查必填字段
      if (col.required && (value === undefined || value === null || value === '')) {
        rowErrors.push(`${col.label}不能为空`)
        return
      }

      // 类型转换和验证
      if (value !== undefined && value !== null && value !== '') {
        if (col.type === 'number') {
          const numValue = parseFloat(value)
          if (isNaN(numValue)) {
            rowErrors.push(`${col.label}必须是数字`)
          } else {
            rowData[col.prop] = numValue
          }
        } else if (col.type === 'boolean') {
          const boolValue = ['是', 'true', '1', 'yes'].includes(String(value).toLowerCase())
          rowData[col.prop] = boolValue
        } else if (col.type === 'date') {
          const dateValue = new Date(value)
          if (isNaN(dateValue.getTime())) {
            rowErrors.push(`${col.label}格式不正确`)
          } else {
            rowData[col.prop] = dateValue
          }
        } else if (col.options && col.options.length > 0) {
          if (!col.options.includes(value)) {
            rowErrors.push(`${col.label}必须是以下之一：${col.options.join('、')}`)
          } else {
            rowData[col.prop] = value
          }
        } else {
          rowData[col.prop] = String(value).trim()
        }
      }
    })

    if (rowErrors.length > 0) {
      errors.push({
        row: index + 2, // +2 因为有表头行和从1开始计数
        message: rowErrors.join('；')
      })
    } else {
      validData.push(rowData)
    }
  })

  return {
    valid: errors.length === 0,
    data: validData,
    errors
  }
}

const handleImport = async () => {
  if (!uploadFile.value) {
    ElMessage.warning('请先选择要导入的文件')
    return
  }

  try {
    importing.value = true
    importResult.value = null

    // 解析Excel文件
    const rawData = await parseExcelFile(uploadFile.value)

    if (!rawData || rawData.length <= 1) {
      throw new Error('文件中没有有效数据')
    }

    // 验证和映射数据
    const { valid, data, errors } = validateAndMapData(rawData)

    if (!valid) {
      importResult.value = {
        success: false,
        successCount: 0,
        failCount: errors.length,
        errorMessage: '数据验证失败',
        errors
      }
      return
    }

    // 调用导入接口
    const result = await props.onImport(data)
    importResult.value = result

    if (result.success) {
      ElMessage.success(`导入成功：${result.successCount} 条`)
      emit('success')
    } else {
      ElMessage.error(`导入失败：${result.errorMessage}`)
    }
  } catch (error: any) {
    ElMessage.error(error.message || '导入失败，请检查文件格式')
    importResult.value = {
      success: false,
      successCount: 0,
      failCount: 0,
      errorMessage: error.message || '导入失败'
    }
  } finally {
    importing.value = false
  }
}

const handleClose = () => {
  visible.value = false
  uploadFile.value = null
  importResult.value = null
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}
</script>

<style scoped>
.import-dialog {
  padding: 0 8px;
}

.template-download {
  text-align: center;
  margin-bottom: 16px;
}

.upload-area {
  margin: 20px 0;
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-top: 16px;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #303133;
}

.file-size {
  font-size: 12px;
  color: #909399;
}

.import-result {
  margin-top: 20px;
}

.result-details {
  text-align: left;
}

.result-details p {
  margin: 4px 0;
  font-size: 14px;
}

.error-list {
  max-height: 300px;
  overflow-y: auto;
}

.error-item {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.error-row {
  font-weight: 600;
  color: #606266;
  min-width: 80px;
}

.error-message {
  color: #f56c6c;
}
</style>