<template>
  <div class="cost-calculation">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 入库成本核算 -->
      <el-tab-pane label="入库成本核算" name="inbound">
        <div class="tab-content">
          <el-form :inline="true" :model="inboundForm" class="search-form">
            <el-form-item label="仓库">
              <el-select v-model="inboundForm.warehouseId" placeholder="请选择仓库" clearable style="width: 180px">
                <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="开始日期">
              <el-date-picker v-model="inboundForm.startDate" type="date" placeholder="开始日期" style="width: 140px" />
            </el-form-item>
            <el-form-item label="结束日期">
              <el-date-picker v-model="inboundForm.endDate" type="date" placeholder="结束日期" style="width: 140px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleInboundCalculate" :loading="inboundLoading">核算</el-button>
              <el-button @click="resetInboundForm">重置</el-button>
            </el-form-item>
          </el-form>

          <el-alert v-if="inboundSummary.totalProducts > 0" :title="`共 ${inboundSummary.totalProducts} 种产品，总入库数量 ${inboundSummary.totalQuantity}，总金额 ¥${formatAmount(inboundSummary.totalAmount)}`" type="info" show-icon :closable="false" class="summary-alert" />

          <el-table :data="inboundData" border v-loading="inboundLoading" size="small">
            <el-table-column prop="productCode" label="物料编码" width="120" />
            <el-table-column prop="productName" label="物料名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="productSpec" label="规格" width="100" />
            <el-table-column prop="unit" label="单位" width="70" />
            <el-table-column prop="totalQuantity" label="入库数量" width="100" align="right" />
            <el-table-column prop="totalAmount" label="入库金额" width="120" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.totalAmount) }}</template>
            </el-table-column>
            <el-table-column prop="avgUnitPrice" label="平均单价" width="120" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.avgUnitPrice) }}</template>
            </el-table-column>
            <el-table-column prop="inboundCount" label="入库次数" width="90" align="center" />
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 存货出库核算 -->
      <el-tab-pane label="存货出库核算" name="outbound">
        <div class="tab-content">
          <el-form :inline="true" :model="outboundForm" class="search-form">
            <el-form-item label="仓库">
              <el-select v-model="outboundForm.warehouseId" placeholder="请选择仓库" clearable style="width: 180px">
                <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="开始日期">
              <el-date-picker v-model="outboundForm.startDate" type="date" placeholder="开始日期" style="width: 140px" />
            </el-form-item>
            <el-form-item label="结束日期">
              <el-date-picker v-model="outboundForm.endDate" type="date" placeholder="结束日期" style="width: 140px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleOutboundCalculate" :loading="outboundLoading">核算</el-button>
              <el-button @click="resetOutboundForm">重置</el-button>
            </el-form-item>
          </el-form>

          <el-alert v-if="outboundSummary.totalProducts > 0" type="info" show-icon :closable="false" class="summary-alert">
            <template #title>
              <div class="outbound-summary">
                <span>产品数: {{ outboundSummary.totalProducts }}</span>
                <span>期初: {{ outboundSummary.totalBeginningQty }} / ¥{{ formatAmount(outboundSummary.totalBeginningCost) }}</span>
                <span>入库: {{ outboundSummary.totalInboundQty }} / ¥{{ formatAmount(outboundSummary.totalInboundAmount) }}</span>
                <span>出库: {{ outboundSummary.totalOutboundQty }} / ¥{{ formatAmount(outboundSummary.totalOutboundCost) }}</span>
                <span>期末: {{ outboundSummary.totalEndingQty }} / ¥{{ formatAmount(outboundSummary.totalEndingCost) }}</span>
              </div>
            </template>
          </el-alert>

          <el-table :data="outboundData" border v-loading="outboundLoading" size="small">
            <el-table-column prop="productCode" label="物料编码" width="100" />
            <el-table-column prop="productName" label="物料名称" min-width="150" show-overflow-tooltip />
            <el-table-column prop="warehouseName" label="仓库" width="100" />
            <el-table-column label="期初" align="center">
              <el-table-column prop="beginningQty" label="数量" width="80" align="right" />
              <el-table-column prop="beginningCost" label="成本" width="100" align="right">
                <template #default="{ row }">¥{{ formatAmount(row.beginningCost) }}</template>
              </el-table-column>
            </el-table-column>
            <el-table-column label="本期入库" align="center">
              <el-table-column prop="inboundQty" label="数量" width="80" align="right" />
              <el-table-column prop="inboundAmount" label="金额" width="100" align="right">
                <template #default="{ row }">¥{{ formatAmount(row.inboundAmount) }}</template>
              </el-table-column>
            </el-table-column>
            <el-table-column label="本期出库" align="center">
              <el-table-column prop="outboundQty" label="数量" width="80" align="right" />
              <el-table-column prop="outboundCost" label="成本" width="100" align="right">
                <template #default="{ row }">¥{{ formatAmount(row.outboundCost) }}</template>
              </el-table-column>
            </el-table-column>
            <el-table-column prop="weightedAvgCost" label="加权平均成本" width="120" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.weightedAvgCost) }}</template>
            </el-table-column>
            <el-table-column label="期末" align="center">
              <el-table-column prop="endingQty" label="数量" width="80" align="right" />
              <el-table-column prop="endingCost" label="成本" width="100" align="right">
                <template #default="{ row }">¥{{ formatAmount(row.endingCost) }}</template>
              </el-table-column>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 异常成本核算 -->
      <el-tab-pane label="异常成本核算" name="abnormal">
        <div class="tab-content">
          <el-form :inline="true" :model="abnormalForm" class="search-form">
            <el-form-item label="仓库">
              <el-select v-model="abnormalForm.warehouseId" placeholder="请选择仓库" clearable style="width: 180px">
                <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleAbnormalCalculate" :loading="abnormalLoading">查询异常</el-button>
              <el-button @click="resetAbnormalForm">重置</el-button>
            </el-form-item>
          </el-form>

          <el-alert v-if="abnormalSummary.totalCount > 0" :title="`发现 ${abnormalSummary.totalCount} 条异常记录（成本为0: ${abnormalSummary.zeroCostCount}，数量为0: ${abnormalSummary.zeroQuantityCount}）`" type="warning" show-icon :closable="false" class="summary-alert" />

          <div class="table-actions" v-if="abnormalData.length > 0">
            <el-button type="danger" size="small" @click="handleFixAll">一键修复所有建议成本</el-button>
          </div>

          <el-table :data="abnormalData" border v-loading="abnormalLoading" size="small">
            <el-table-column type="selection" width="50" />
            <el-table-column prop="productCode" label="物料编码" width="120" />
            <el-table-column prop="productName" label="物料名称" min-width="180" show-overflow-tooltip />
            <el-table-column prop="warehouseName" label="仓库" width="120" />
            <el-table-column prop="quantity" label="数量" width="100" align="right" />
            <el-table-column prop="costPrice" label="当前成本" width="100" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.costPrice) }}</template>
            </el-table-column>
            <el-table-column prop="totalCost" label="总成本" width="100" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.totalCost) }}</template>
            </el-table-column>
            <el-table-column prop="abnormalDesc" label="异常类型" width="150">
              <template #default="{ row }">
                <el-tag :type="row.abnormalType === 'zero_cost' ? 'danger' : 'warning'" size="small">{{ row.abnormalDesc }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="suggestedCost" label="建议成本" width="120" align="right">
              <template #default="{ row }">
                <span v-if="row.suggestedCost !== null" class="suggested-cost">¥{{ formatAmount(row.suggestedCost) }}</span>
                <span v-else class="no-suggestion">无建议</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.suggestedCost !== null" type="primary" size="small" @click="handleFixSingle(row)">修复</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { calculateInboundCost, calculateOutboundCost, calculateAbnormalCost, fixAbnormalCost } from '@/api/cost-calculation'
import { getWarehouses } from '@/api/warehouse'

const activeTab = ref('inbound')
const warehouses = ref<any[]>([])

// 入库成本核算
const inboundForm = reactive({
  warehouseId: '',
  startDate: '',
  endDate: ''
})
const inboundLoading = ref(false)
const inboundData = ref<any[]>([])
const inboundSummary = reactive({
  totalProducts: 0,
  totalQuantity: 0,
  totalAmount: 0
})

// 出库成本核算
const outboundForm = reactive({
  warehouseId: '',
  startDate: '',
  endDate: ''
})
const outboundLoading = ref(false)
const outboundData = ref<any[]>([])
const outboundSummary = reactive({
  totalProducts: 0,
  totalBeginningQty: 0,
  totalBeginningCost: 0,
  totalInboundQty: 0,
  totalInboundAmount: 0,
  totalOutboundQty: 0,
  totalOutboundCost: 0,
  totalEndingQty: 0,
  totalEndingCost: 0
})

// 异常成本核算
const abnormalForm = reactive({
  warehouseId: ''
})
const abnormalLoading = ref(false)
const abnormalData = ref<any[]>([])
const abnormalSummary = reactive({
  totalCount: 0,
  zeroCostCount: 0,
  zeroQuantityCount: 0
})

// 获取仓库列表
const fetchWarehouses = async () => {
  try {
    const res: any = await getWarehouses({ page: 1, limit: 1000 })
    if (res.success) {
      warehouses.value = res.data.items || []
    }
  } catch (error) {
    console.error('获取仓库失败:', error)
  }
}

// 入库成本核算
const handleInboundCalculate = async () => {
  inboundLoading.value = true
  try {
    const res: any = await calculateInboundCost({
      warehouseId: inboundForm.warehouseId || undefined,
      startDate: inboundForm.startDate || undefined,
      endDate: inboundForm.endDate || undefined
    })
    if (res.success) {
      inboundData.value = res.data.items || []
      inboundSummary.totalProducts = res.data.totalProducts
      inboundSummary.totalQuantity = res.data.totalQuantity
      inboundSummary.totalAmount = res.data.totalAmount
    }
  } catch (error) {
    console.error('入库成本核算失败:', error)
    ElMessage.error('核算失败')
  } finally {
    inboundLoading.value = false
  }
}

const resetInboundForm = () => {
  inboundForm.warehouseId = ''
  inboundForm.startDate = ''
  inboundForm.endDate = ''
  inboundData.value = []
}

// 出库成本核算
const handleOutboundCalculate = async () => {
  outboundLoading.value = true
  try {
    const res: any = await calculateOutboundCost({
      warehouseId: outboundForm.warehouseId || undefined,
      startDate: outboundForm.startDate || undefined,
      endDate: outboundForm.endDate || undefined
    })
    if (res.success) {
      outboundData.value = res.data.items || []
      Object.assign(outboundSummary, {
        totalProducts: res.data.totalProducts,
        totalBeginningQty: res.data.totalBeginningQty,
        totalBeginningCost: res.data.totalBeginningCost,
        totalInboundQty: res.data.totalInboundQty,
        totalInboundAmount: res.data.totalInboundAmount,
        totalOutboundQty: res.data.totalOutboundQty,
        totalOutboundCost: res.data.totalOutboundCost,
        totalEndingQty: res.data.totalEndingQty,
        totalEndingCost: res.data.totalEndingCost
      })
    }
  } catch (error) {
    console.error('出库成本核算失败:', error)
    ElMessage.error('核算失败')
  } finally {
    outboundLoading.value = false
  }
}

const resetOutboundForm = () => {
  outboundForm.warehouseId = ''
  outboundForm.startDate = ''
  outboundForm.endDate = ''
  outboundData.value = []
}

// 异常成本核算
const handleAbnormalCalculate = async () => {
  abnormalLoading.value = true
  try {
    const res: any = await calculateAbnormalCost({
      warehouseId: abnormalForm.warehouseId || undefined
    })
    if (res.success) {
      abnormalData.value = res.data.items || []
      abnormalSummary.totalCount = res.data.totalCount
      abnormalSummary.zeroCostCount = res.data.zeroCostCount
      abnormalSummary.zeroQuantityCount = res.data.zeroQuantityCount
    }
  } catch (error) {
    console.error('异常成本核算失败:', error)
    ElMessage.error('查询失败')
  } finally {
    abnormalLoading.value = false
  }
}

const resetAbnormalForm = () => {
  abnormalForm.warehouseId = ''
  abnormalData.value = []
}

// 修复单个异常
const handleFixSingle = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定将 "${row.productName}" 的成本修复为 ¥${formatAmount(row.suggestedCost)} 吗？`, '确认修复')
    const res: any = await fixAbnormalCost([{
      inventoryItemId: row.id,
      newCostPrice: row.suggestedCost
    }])
    if (res.success) {
      ElMessage.success('修复成功')
      handleAbnormalCalculate()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('修复失败:', error)
    }
  }
}

// 修复所有建议成本
const handleFixAll = async () => {
  const itemsWithSuggestion = abnormalData.value.filter(row => row.suggestedCost !== null)
  if (itemsWithSuggestion.length === 0) {
    ElMessage.warning('没有可修复的记录')
    return
  }

  try {
    await ElMessageBox.confirm(`确定修复 ${itemsWithSuggestion.length} 条记录的成本吗？`, '确认批量修复')
    const items = itemsWithSuggestion.map(row => ({
      inventoryItemId: row.id,
      newCostPrice: row.suggestedCost
    }))
    const res: any = await fixAbnormalCost(items)
    if (res.success) {
      ElMessage.success(`成功修复 ${items.length} 条记录`)
      handleAbnormalCalculate()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量修复失败:', error)
    }
  }
}

// 格式化金额
const formatAmount = (amount: number) => {
  if (amount === undefined || amount === null) return '0.00'
  const num = Number(amount)
  if (isNaN(num)) return '0.00'
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

onMounted(() => {
  fetchWarehouses()
})
</script>

<style scoped>
.cost-calculation {
  padding: 20px;
}

.tab-content {
  padding: 20px 0;
}

.search-form {
  margin-bottom: 20px;
}

.summary-alert {
  margin-bottom: 20px;
}

.outbound-summary {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.table-actions {
  margin-bottom: 15px;
}

.suggested-cost {
  color: #67C23A;
  font-weight: bold;
}

.no-suggestion {
  color: #909399;
}
</style>