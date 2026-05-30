<template>
  <div class="recalculate-page">
    <el-card class="page-header">
      <h2>数据重算 / 校对</h2>
      <p class="subtitle">当系统数据出现不一致时，使用以下功能重新计算并修复数据</p>
    </el-card>

    <!-- 库存重算 -->
    <el-card class="section-card">
      <template #header>
        <div class="section-header">
          <el-icon :size="22" color="#409EFF"><Box /></el-icon>
          <span>库存重算</span>
        </div>
      </template>
      <p class="section-desc">
        根据所有已确认单据<b>全量重建</b>库存表：先清空旧数据，再根据采购入库、销售出库、其他入库、其他出库、盘点单、调整单、调拨单重新计算。<br/>
        自动处理批次号：启用批次管理的物料批次号必须有值，未启用批次的物料统一归为无批次。
      </p>
      <div class="section-actions">
        <el-select v-model="selectedWarehouse" placeholder="全部仓库" clearable style="width: 240px">
          <el-option v-for="wh in warehouses" :key="wh.id" :label="wh.name" :value="wh.id" />
        </el-select>
        <el-popconfirm title="确认全量重建库存？这将清空并重新计算所有库存数据。" @confirm="handleRecalculateInventory">
          <template #reference>
            <el-button type="primary" :loading="inventoryLoading" :disabled="inventoryLoading">
              <el-icon><RefreshRight /></el-icon>
              {{ inventoryLoading ? '重算中...' : '开始重算库存' }}
            </el-button>
          </template>
        </el-popconfirm>
      </div>
      <div v-if="inventoryResult" class="result-box">
        <el-alert :title="inventoryMessage" type="success" :closable="false" show-icon />
        <el-descriptions :column="3" border style="margin-top: 12px">
          <el-descriptions-item label="删除旧记录">{{ inventoryResult.deletedCount }} 条</el-descriptions-item>
          <el-descriptions-item label="写入新记录">{{ inventoryResult.createdCount }} 条</el-descriptions-item>
          <el-descriptions-item label="库存维度总数">{{ inventoryResult.totalDimensions }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <!-- 账户余额重算 -->
    <el-card class="section-card">
      <template #header>
        <div class="section-header">
          <el-icon :size="22" color="#67c23a"><Wallet /></el-icon>
          <span>账户余额重算</span>
        </div>
      </template>
      <p class="section-desc">
        根据所有已确认的收款单（+）和付款单（-），重新计算每个账户的当前余额。
      </p>
      <div class="section-actions">
        <el-button type="primary" :loading="accountLoading" :disabled="accountLoading" @click="handleRecalculateAccount">
          <el-icon><RefreshRight /></el-icon>
          {{ accountLoading ? '重算中...' : '开始重算账户余额' }}
        </el-button>
      </div>
      <div v-if="accountResult" class="result-box">
        <el-alert :title="accountMessage" :type="accountResult.updatedCount > 0 ? 'warning' : 'success'" :closable="false" show-icon />
        <el-descriptions v-if="accountResult" :column="3" border style="margin-top: 12px">
          <el-descriptions-item label="账户总数">{{ accountResult.totalAccounts }}</el-descriptions-item>
          <el-descriptions-item label="已更新">{{ accountResult.updatedCount }}</el-descriptions-item>
          <el-descriptions-item label="余额一致">{{ accountResult.unchangedCount }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="accountResult.details && accountResult.details.length > 0" style="margin-top: 12px">
          <h4>变化明细：</h4>
          <el-table :data="accountResult.details" size="small" max-height="300" border stripe>
            <el-table-column prop="accountName" label="账户名称" width="160" />
            <el-table-column prop="oldBalance" label="原余额" width="140" />
            <el-table-column prop="newBalance" label="新余额" width="140" />
            <el-table-column prop="diff" label="差异" width="140">
              <template #default="{ row }">
                <span :style="{ color: row.diff > 0 ? '#67c23a' : row.diff < 0 ? '#f56c6c' : '' }">
                  {{ row.diff > 0 ? '+' : '' }}{{ row.diff }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>

    <!-- 应收应付重算 -->
    <el-card class="section-card">
      <template #header>
        <div class="section-header">
          <el-icon :size="22" color="#e6a23c"><Money /></el-icon>
          <span>应收应付重算</span>
        </div>
      </template>
      <p class="section-desc">
        根据所有已确认的收款单和付款单，重新计算每个销售订单的已收款金额（应收）和采购订单的已付款金额（应付）。
      </p>
      <div class="section-actions">
        <el-button type="primary" :loading="orderLoading" :disabled="orderLoading" @click="handleRecalculateOrders">
          <el-icon><RefreshRight /></el-icon>
          {{ orderLoading ? '重算中...' : '开始重算应收应付' }}
        </el-button>
      </div>
      <div v-if="orderResult" class="result-box">
        <el-alert
          :title="orderMessage"
          :type="(orderResult.sales.updated + orderResult.purchase.updated) > 0 ? 'warning' : 'success'"
          :closable="false" show-icon
        />
        <el-row :gutter="16" style="margin-top: 12px">
          <el-col :span="12">
            <el-descriptions title="销售订单（应收）" :column="2" border>
              <el-descriptions-item label="已更新">{{ orderResult.sales.updated }}</el-descriptions-item>
              <el-descriptions-item label="一致">{{ orderResult.sales.unchanged }}</el-descriptions-item>
            </el-descriptions>
            <el-table v-if="orderResult.sales.details && orderResult.sales.details.length > 0"
              :data="orderResult.sales.details" size="small" max-height="250" border stripe style="margin-top: 8px">
              <el-table-column prop="orderNo" label="订单号" width="160" />
              <el-table-column prop="oldPaidAmount" label="原已收" width="120" />
              <el-table-column prop="newPaidAmount" label="新已收" width="120" />
            </el-table>
          </el-col>
          <el-col :span="12">
            <el-descriptions title="采购订单（应付）" :column="2" border>
              <el-descriptions-item label="已更新">{{ orderResult.purchase.updated }}</el-descriptions-item>
              <el-descriptions-item label="一致">{{ orderResult.purchase.unchanged }}</el-descriptions-item>
            </el-descriptions>
            <el-table v-if="orderResult.purchase.details && orderResult.purchase.details.length > 0"
              :data="orderResult.purchase.details" size="small" max-height="250" border stripe style="margin-top: 8px">
              <el-table-column prop="orderNo" label="订单号" width="160" />
              <el-table-column prop="oldPaidAmount" label="原已付" width="120" />
              <el-table-column prop="newPaidAmount" label="新已付" width="120" />
            </el-table>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Box, Wallet, Money, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  recalculateInventory,
  recalculateAccountBalance,
  recalculateOrderPayments,
  type RecalculateInventoryResult,
  type RecalculateAccountBalanceResult,
  type RecalculateOrderPaymentsResult,
} from '../api/recalculate'
import { api } from '../api/http'

const selectedWarehouse = ref('')
const warehouses = ref<Array<{ id: string; name: string }>>([])

// 库存重算
const inventoryLoading = ref(false)
const inventoryResult = ref<RecalculateInventoryResult | null>(null)
const inventoryMessage = ref('')

// 账户余额重算
const accountLoading = ref(false)
const accountResult = ref<RecalculateAccountBalanceResult | null>(null)
const accountMessage = ref('')

// 应收应付重算
const orderLoading = ref(false)
const orderResult = ref<RecalculateOrderPaymentsResult | null>(null)
const orderMessage = ref('')

onMounted(async () => {
  try {
    const res = await api.get('/api/v1/warehouses', { params: { limit: 999 } })
    warehouses.value = res.data.data?.items || []
  } catch { /* ignore */ }
})

const handleRecalculateInventory = async () => {
  inventoryLoading.value = true
  inventoryResult.value = null
  try {
    const data = await recalculateInventory(selectedWarehouse.value || undefined)
    inventoryResult.value = data.data
    inventoryMessage.value = data.message
    ElMessage.success(data.message)
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '库存重算失败')
  } finally {
    inventoryLoading.value = false
  }
}

const handleRecalculateAccount = async () => {
  accountLoading.value = true
  accountResult.value = null
  try {
    const data = await recalculateAccountBalance()
    accountResult.value = data.data
    accountMessage.value = data.message
    ElMessage.success(data.message)
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '账户余额重算失败')
  } finally {
    accountLoading.value = false
  }
}

const handleRecalculateOrders = async () => {
  orderLoading.value = true
  orderResult.value = null
  try {
    const data = await recalculateOrderPayments()
    orderResult.value = data.data
    orderMessage.value = data.message
    ElMessage.success(data.message)
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '应收应付重算失败')
  } finally {
    orderLoading.value = false
  }
}
</script>

<style scoped>
.recalculate-page {
  padding: 20px;
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 22px;
}

.subtitle {
  color: #909399;
  margin: 0;
  font-size: 14px;
}

.section-card {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.section-desc {
  color: #606266;
  font-size: 14px;
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.result-box {
  margin-top: 8px;
}

.result-box h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
}
</style>
