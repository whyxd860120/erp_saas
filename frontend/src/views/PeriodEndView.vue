<template>
  <div class="period-end-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>期末处理</span>
        </div>
      </template>

      <el-alert
        title="期末处理说明"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p>期末处理用于管理当前账期：</p>
          <ul style="margin: 10px 0 0 20px; padding-left: 0;">
            <li><strong>当前账期</strong>：显示系统当前的会计期间，所有业务单据的日期必须大于等于当前账期</li>
            <li><strong>结转至下期</strong>：将当前账期向后推进一个月，本期数据将锁定</li>
            <li><strong>反结账</strong>：将当前账期向前回退一个月，用于修正错误</li>
          </ul>
        </template>
      </el-alert>

      <div class="current-period-section">
        <h3>当前账期</h3>
        <div class="period-display">
          <div class="period-year">{{ currentPeriod.year }}</div>
          <div class="period-divider">年</div>
          <div class="period-month">{{ getMonthLabel(currentPeriod.month) }}</div>
        </div>

        <el-descriptions :column="2" border style="margin-top: 20px">
          <el-descriptions-item label="账套启用时间">
            {{ fiscalStart.year }}年 {{ getMonthLabel(fiscalStart.month) }}
          </el-descriptions-item>
          <el-descriptions-item label="当前账期">
            {{ currentPeriod.year }}年 {{ getMonthLabel(currentPeriod.month) }}
          </el-descriptions-item>
          <el-descriptions-item label="已结转月数">
            {{ getPeriodsPassed() }} 个月
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag type="success">正常</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-divider />

      <div class="action-section">
        <h3>期末操作</h3>

        <div class="action-buttons">
          <el-button
            type="primary"
            size="large"
            :loading="processing"
            @click="handleCarryForward"
          >
            <template #icon>
              <ArrowRight />
            </template>
            结转至下期
          </el-button>

          <el-button
            type="warning"
            size="large"
            :loading="processing"
            :disabled="!canReverse"
            @click="handleReverse"
          >
            <template #icon>
              <ArrowLeft />
            </template>
            反结账
          </el-button>
        </div>

        <div class="action-tips">
          <p><strong>结转至下期：</strong>将当前账期向后推进一个月，本期业务数据将被锁定，无法新增、修改、删除</p>
          <p><strong>反结账：</strong>将当前账期向前回退一个月，仅允许回退到账套启用时间</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, ArrowLeft } from '@element-plus/icons-vue'
import { getCurrentTenant } from '@/api/tenant-setting'
import { request } from '@/api/http'

const loading = ref(false)
const processing = ref(false)

const fiscalStart = reactive({
  year: 2025,
  month: 1
})

const currentPeriod = reactive({
  year: 2025,
  month: 1
})

// 是否可以反结账（当前账期 > 账套启用时间）
const canReverse = computed(() => {
  const current = currentPeriod.year * 12 + currentPeriod.month
  const start = fiscalStart.year * 12 + fiscalStart.month
  return current > start
})

const getMonthLabel = (month: number): string => {
  const labels = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return labels[month - 1] || ''
}

// 计算已结转月数
const getPeriodsPassed = () => {
  const current = currentPeriod.year * 12 + currentPeriod.month
  const start = fiscalStart.year * 12 + fiscalStart.month
  return current - start
}

// 结转至下期
const handleCarryForward = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要将当前账期结转至下期吗？\n\n当前账期：${currentPeriod.year}年${getMonthLabel(currentPeriod.month)}\n结转后账期：${getNextPeriod().year}年${getMonthLabel(getNextPeriod().month)}\n\n结转后，${currentPeriod.year}年${getMonthLabel(currentPeriod.month)}的业务数据将被锁定。`,
      '结转至下期',
      {
        confirmButtonText: '确定结转',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    processing.value = true

    const res = await request({ url: '/api/v1/tenant-settings/carry-forward', method: 'post' }) as any

    if (res.success) {
      // 更新当前账期
      const next = getNextPeriod()
      currentPeriod.year = next.year
      currentPeriod.month = next.month
      ElMessage.success(`已成功结转至${next.year}年${getMonthLabel(next.month)}`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '结转失败')
    }
  } finally {
    processing.value = false
  }
}

// 反结账
const handleReverse = async () => {
  if (!canReverse.value) {
    ElMessage.warning('当前账期已回到账套启用时间，无法继续反结账')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要反结账吗？\n\n当前账期：${currentPeriod.year}年${getMonthLabel(currentPeriod.month)}\n反结账后账期：${getPrevPeriod().year}年${getMonthLabel(getPrevPeriod().month)}\n\n反结账后，将可以修改${getPrevPeriod().year}年${getMonthLabel(getPrevPeriod().month)}的业务数据。`,
      '反结账',
      {
        confirmButtonText: '确定反结账',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    processing.value = true

    const res = await request({ url: '/api/v1/tenant-settings/reverse', method: 'post' }) as any

    if (res.success) {
      // 更新当前账期
      const prev = getPrevPeriod()
      currentPeriod.year = prev.year
      currentPeriod.month = prev.month
      ElMessage.success(`已成功反结账至${prev.year}年${getMonthLabel(prev.month)}`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '反结账失败')
    }
  } finally {
    processing.value = false
  }
}

// 获取下期
const getNextPeriod = () => {
  let year = currentPeriod.year
  let month = currentPeriod.month + 1

  if (month > 12) {
    month = 1
    year += 1
  }

  return { year, month }
}

// 获取上期
const getPrevPeriod = () => {
  let year = currentPeriod.year
  let month = currentPeriod.month - 1

  if (month < 1) {
    month = 12
    year -= 1
  }

  return { year, month }
}

const loadData = async () => {
  try {
    loading.value = true
    const res = await getCurrentTenant()
    if (res.success && res.data) {
      fiscalStart.year = res.data.fiscalYearStartYear || 2025
      fiscalStart.month = res.data.fiscalYearStartMonth || 1
      currentPeriod.year = res.data.currentFiscalYear || fiscalStart.year
      currentPeriod.month = res.data.currentFiscalMonth || fiscalStart.month
    }
  } catch (error) {
    console.error('加载账期信息失败:', error)
    ElMessage.error('加载账期信息失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.period-end-view {
  padding: 20px;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
}

.current-period-section {
  text-align: center;
  padding: 20px 0;
}

.current-period-section h3 {
  margin-bottom: 20px;
  color: #303133;
}

.period-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
}

.period-year {
  font-size: 48px;
  font-weight: 700;
  color: #409eff;
}

.period-divider {
  font-size: 24px;
  color: #606266;
}

.period-month {
  font-size: 48px;
  font-weight: 700;
  color: #409eff;
}

.action-section {
  padding: 20px 0;
}

.action-section h3 {
  margin-bottom: 20px;
  color: #303133;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.action-tips {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  margin-top: 20px;
}

.action-tips p {
  margin: 8px 0;
  color: #606266;
  font-size: 14px;
}

.action-tips p:first-child {
  margin-top: 0;
}

.action-tips p:last-child {
  margin-bottom: 0;
}
</style>
