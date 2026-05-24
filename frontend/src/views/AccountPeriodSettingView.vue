<template>
  <div class="account-period-setting">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>账套参数设置</span>
        </div>
      </template>

      <el-alert
        title="账套参数说明"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p>账套参数用于设置账套的启用时间：</p>
          <ul style="margin: 10px 0 0 20px; padding-left: 0;">
            <li><strong>账套启用年度/月度</strong>：设置账套从什么时候开始启用，保存后不可修改</li>
            <li><strong>当前账期</strong>：初始化完成后，可在"期末处理"菜单中进行结转</li>
          </ul>
        </template>
      </el-alert>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="140px"
        style="max-width: 600px"
      >
        <el-form-item label="账套启用年度" prop="fiscalYearStartYear">
          <el-input-number
            v-model="formData.fiscalYearStartYear"
            :min="2020"
            :max="2100"
            :disabled="isInitialized"
            style="width: 100%"
          />
          <div class="form-tip">账套启用的年度，保存后不可修改</div>
        </el-form-item>

        <el-form-item label="账套启用月度" prop="fiscalYearStartMonth">
          <el-select v-model="formData.fiscalYearStartMonth" placeholder="选择月份" style="width: 100%" :disabled="isInitialized">
            <el-option
              v-for="month in 12"
              :key="month"
              :label="getMonthLabel(month)"
              :value="month"
            />
          </el-select>
          <div class="form-tip">账套启用的月份，保存后不可修改</div>
        </el-form-item>

        <el-divider />

        <el-form-item label="账套启用时间">
          <div class="period-preview">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="账套启用时间">
                {{ formData.fiscalYearStartYear }}年 {{ getMonthLabel(formData.fiscalYearStartMonth) }}
              </el-descriptions-item>
              <el-descriptions-item label="当前账期">
                {{ currentFiscalYear }}年 {{ getMonthLabel(currentFiscalMonth) }}
                <el-tag v-if="isInitialized" type="success" size="small" style="margin-left: 8px">已初始化</el-tag>
                <el-tag v-else type="warning" size="small" style="margin-left: 8px">未初始化</el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave" :disabled="isInitialized">
            保存设置
          </el-button>
          <el-button @click="handleReset" :disabled="isInitialized">
            重置
          </el-button>
          <span v-if="isInitialized" class="disabled-tip">账套已初始化，参数不可修改</span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getCurrentTenant, updateTenant } from '@/api/tenant-setting'

const formRef = ref<FormInstance>()
const saving = ref(false)
const loading = ref(false)
const initStatus = ref('pending')
const currentFiscalYear = ref(2025)
const currentFiscalMonth = ref(1)

const formData = reactive({
  fiscalYearStartYear: 2025,
  fiscalYearStartMonth: 1
})

const originalData = reactive({
  fiscalYearStartYear: 2025,
  fiscalYearStartMonth: 1
})

const isInitialized = computed(() => {
  return initStatus.value === 'completed' || initStatus.value === 'data_entry'
})

const formRules: FormRules = {
  fiscalYearStartYear: [
    { required: true, message: '请输入账套启用年度', trigger: 'blur' }
  ],
  fiscalYearStartMonth: [
    { required: true, message: '请选择账套启用月度', trigger: 'change' }
  ]
}

const getMonthLabel = (month: number): string => {
  const labels = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return labels[month - 1] || ''
}

const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    saving.value = true

    // 保存账套启用时间，同时设置当前账期等于启用时间
    const res = await updateTenant({
      fiscalYearStartYear: formData.fiscalYearStartYear,
      fiscalYearStartMonth: formData.fiscalYearStartMonth,
      currentFiscalYear: formData.fiscalYearStartYear,
      currentFiscalMonth: formData.fiscalYearStartMonth,
      initializationStatus: 'data_entry'
    } as any)

    if (res.success) {
      Object.assign(originalData, formData)
      currentFiscalYear.value = formData.fiscalYearStartYear
      currentFiscalMonth.value = formData.fiscalYearStartMonth
      initStatus.value = 'data_entry'
      ElMessage.success('账套参数保存成功，现在可以进行账套初始化')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleReset = () => {
  Object.assign(formData, originalData)
}

const loadData = async () => {
  try {
    loading.value = true
    const res = await getCurrentTenant()
    if (res.success && res.data) {
      formData.fiscalYearStartYear = res.data.fiscalYearStartYear || 2025
      formData.fiscalYearStartMonth = res.data.fiscalYearStartMonth || 1
      currentFiscalYear.value = res.data.currentFiscalYear || formData.fiscalYearStartYear
      currentFiscalMonth.value = res.data.currentFiscalMonth || formData.fiscalYearStartMonth
      initStatus.value = res.data.initializationStatus || 'pending'
      Object.assign(originalData, formData)
    }
  } catch (error) {
    console.error('加载账套参数失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

// 暴露初始化状态给外部
defineExpose({
  loadData
})
</script>

<style scoped>
.account-period-setting {
  padding: 20px;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.period-preview {
  width: 100%;
}

.disabled-tip {
  font-size: 12px;
  color: #f56c6c;
  margin-left: 8px;
}
</style>
