<template>
  <el-dialog
    v-model="visible"
    title="SN码录入"
    width="800px"
    @close="handleClose"
  >
    <div class="sn-input-container">
      <el-alert
        title="SN码管理说明"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      >
        <template #default>
          <p v-if="requiredCount > 0">
            当前需要录入 <strong>{{ requiredCount }}</strong> 个SN码（物料数量：{{ quantity }}）
          </p>
          <p v-else>
            请录入SN码（数量不限制，录入完成后将自动计算数量）
          </p>
          <p v-if="requiredCount > 0 && snList.length < requiredCount" style="color: #f56c6c;">
            还需要录入 {{ requiredCount - snList.length }} 个SN码
          </p>
          <p v-else-if="requiredCount > 0" style="color: #67c23a;">
            SN码录入完整 ✓
          </p>
          <p v-else style="color: #67c23a;">
            已录入 {{ snList.length }} 个SN码
          </p>
        </template>
      </el-alert>

      <el-form :inline="true">
        <el-form-item label="SN码">
          <el-input
            v-model="newSn"
            placeholder="请输入或扫描SN码"
            @keyup.enter="addSn"
            style="width: 300px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addSn">添加</el-button>
          <el-button type="success" @click="batchAdd">批量添加</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="snList" border max-height="300" style="margin-top: 16px">
        <el-table-column type="index" label="序号" width="80" />
        <el-table-column prop="sn" label="SN码" min-width="200">
          <template #default="{ row, $index }">
            <el-input
              v-model="row.sn"
              placeholder="SN码"
              size="small"
              @change="validateSn($index)"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.valid ? 'success' : 'danger'" size="small">
              {{ row.valid ? '有效' : '无效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ $index }">
            <el-button type="danger" size="small" link @click="removeSn($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="sn-stats">
        <span>已录入: {{ snList.length }} 个</span>
        <span>有效: {{ validCount }} 个</span>
        <span>无效: {{ invalidCount }} 个</span>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :disabled="!isValid"
        @click="handleConfirm"
      >
        确认
      </el-button>
    </template>

    <!-- 批量添加对话框 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量添加SN码"
      width="600px"
      append-to-body
    >
      <el-form>
        <el-form-item label="SN码列表">
          <el-input
            v-model="batchSnText"
            type="textarea"
            :rows="8"
            placeholder="请输入SN码，每行一个SN码"
          />
        </el-form-item>
        <el-form-item>
          <span style="color: #909399; font-size: 12px;">
            每行输入一个SN码，支持Excel粘贴
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchAdd">确认添加</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: boolean
  quantity: number
  existingSnList?: string[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', snList: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  existingSnList: () => []
})

const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const newSn = ref('')
const snList = ref<{ sn: string; valid: boolean }[]>([])
const batchDialogVisible = ref(false)
const batchSnText = ref('')

const requiredCount = computed(() => props.quantity)
const validCount = computed(() => snList.value.filter(item => item.valid).length)
const invalidCount = computed(() => snList.value.filter(item => !item.valid).length)
const isValid = computed(() => {
  if (requiredCount.value === 0) {
    // 没有预设数量限制，只要有SN码就有效
    return snList.value.length > 0 && invalidCount.value === 0
  }
  return validCount.value === requiredCount.value && snList.value.length === requiredCount.value
})

// 监听弹窗打开，初始化SN列表
watch(visible, (val) => {
  if (val) {
    snList.value = props.existingSnList.map(sn => ({ sn, valid: !!sn }))
  }
})

const addSn = () => {
  if (!newSn.value.trim()) {
    return
  }

  const sn = newSn.value.trim()
  const existingIndex = snList.value.findIndex(item => item.sn === sn)

  if (existingIndex >= 0) {
    // SN码已存在，更新对应行的有效状态
    snList.value[existingIndex].valid = true
  } else if (requiredCount.value === 0 || snList.value.length < requiredCount.value) {
    // 添加新SN码
    snList.value.push({ sn, valid: true })
  } else {
    // 已达到最大数量
    return
  }

  newSn.value = ''
}

const removeSn = (index: number) => {
  snList.value.splice(index, 1)
}

const validateSn = (index: number) => {
  const item = snList.value[index]
  const duplicateCount = snList.value.filter((i, idx) => i.sn === item.sn && idx !== index).length

  if (duplicateCount > 0 || !item.sn.trim()) {
    item.valid = false
  } else {
    item.valid = true
  }
}

const batchAdd = () => {
  batchDialogVisible.value = true
  batchSnText.value = ''
}

const confirmBatchAdd = () => {
  const lines = batchSnText.value.split('\n').filter(line => line.trim())

  for (const line of lines) {
    const sn = line.trim()
    if (!sn) continue

    if (requiredCount.value > 0 && snList.value.length >= requiredCount.value) {
      break
    }

    const existingIndex = snList.value.findIndex(item => item.sn === sn)

    if (existingIndex >= 0) {
      snList.value[existingIndex].valid = true
    } else {
      snList.value.push({ sn, valid: true })
    }
  }

  batchDialogVisible.value = false
}

const handleConfirm = () => {
  if (!isValid.value) {
    return
  }

  const validSnList = snList.value.filter(item => item.valid).map(item => item.sn)
  emit('confirm', validSnList)
  handleClose()
}

const handleClose = () => {
  visible.value = false
  newSn.value = ''
  snList.value = []
  batchSnText.value = ''
}
</script>

<style scoped>
.sn-input-container {
  padding: 0 8px;
}

.sn-stats {
  margin-top: 16px;
  display: flex;
  gap: 16px;
  color: #606266;
  font-size: 14px;
}

.sn-stats span {
  display: flex;
  align-items: center;
}

.sn-stats span::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
}

.sn-stats span:nth-child(1)::before {
  background-color: #409eff;
}

.sn-stats span:nth-child(2)::before {
  background-color: #67c23a;
}

.sn-stats span:nth-child(3)::before {
  background-color: #f56c6c;
}
</style>