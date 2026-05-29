<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPurchaseOrders, getSalesOrders, type PurchaseOrder, type SalesOrder } from '@/api'
import type { ApiResponse } from '@/utils/http'

type OrderItem = PurchaseOrder | SalesOrder

const activeTab = ref<'purchase' | 'sales'>('purchase')
const list = ref<OrderItem[]>([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 20

onLoad((options) => {
  if (options?.type === 'sales') {
    activeTab.value = 'sales'
  }
})

async function fetchList(reset = false) {
  if (reset) page.value = 1
  loading.value = true
  try {
    let res: ApiResponse<{ items: OrderItem[]; total: number }>
    if (activeTab.value === 'purchase') {
      res = await getPurchaseOrders({ page: page.value, pageSize }) as ApiResponse<{ items: OrderItem[]; total: number }>
    } else {
      res = await getSalesOrders({ page: page.value, pageSize }) as ApiResponse<{ items: OrderItem[]; total: number }>
    }
    if (res.success) {
      if (reset) list.value = res.data.items
      else list.value.push(...res.data.items)
      total.value = res.data.total
    }
  } catch {
    // 错误已统一处理
  } finally {
    loading.value = false
  }
}

function switchTab(tab: 'purchase' | 'sales') {
  activeTab.value = tab
  list.value = []
  fetchList(true)
}

function onLoadMore() {
  if (list.value.length >= total.value) return
  page.value++
  fetchList(false)
}

function goDetail(item: OrderItem) {
  uni.navigateTo({ url: `/pages/order/detail?id=${item.id}&type=${activeTab.value}` })
}

function getOrderNo(item: OrderItem): string {
  return (item as PurchaseOrder).orderNo || (item as SalesOrder).orderNo || ''
}

function getSupplierOrCustomer(item: OrderItem): string {
  return (item as PurchaseOrder).supplierName || (item as SalesOrder).customerName || ''
}

onMounted(() => {
  fetchList(true)
})
</script>

<template>
  <view class="order-page">
    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'purchase' }"
        @tap="switchTab('purchase')"
      >
        <text>采购订单</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'sales' }"
        @tap="switchTab('sales')"
      >
        <text>销售订单</text>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="onLoadMore"
    >
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无订单数据</text>
      </view>

      <view v-for="item in list" :key="item.id" class="order-card" @tap="goDetail(item)">
        <view class="card-header">
          <text class="order-no">{{ getOrderNo(item) }}</text>
          <text class="order-status" :class="'status-' + item.status">
            {{ item.status || '未知' }}
          </text>
        </view>
        <view class="card-body">
          <view class="info-row">
            <text class="info-label">
              {{ activeTab === 'purchase' ? '供应商' : '客户' }}
            </text>
            <text class="info-value">{{ getSupplierOrCustomer(item) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">订单日期</text>
            <text class="info-value">{{ item.orderDate }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">金额</text>
            <text class="info-value amount">¥{{ item.totalAmount || 0 }}</text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading-tip"><text>加载中...</text></view>
      <view v-if="list.length >= total && list.length > 0" class="no-more"><text>— 没有更多了 —</text></view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.order-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.tab-bar {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;

  &.active {
    color: #1677ff;
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 4rpx;
      background: #1677ff;
      border-radius: 2rpx;
    }
  }
}

.list-scroll {
  flex: 1;
  padding: 16rpx 24rpx;
}

.order-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.order-no {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.order-status {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;

  &.status-pending { background: #fff7e6; color: #fa8c16; }
  &.status-approved { background: #e6f7ff; color: #1890ff; }
  &.status-completed { background: #f6ffed; color: #52c41a; }
  &.status-cancelled { background: #fff2f0; color: #ff4d4f; }
  &.status-draft { background: #f5f5f5; color: #999; }
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;

  &:last-child { margin-bottom: 0; }
}

.info-label {
  font-size: 26rpx;
  color: #999;
}

.info-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;

  &.amount {
    color: #ff4d4f;
    font-weight: 700;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.loading-tip, .no-more {
  text-align: center;
  padding: 20rpx;
  color: #999;
  font-size: 24rpx;
}
</style>
