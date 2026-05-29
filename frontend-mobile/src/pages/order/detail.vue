<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPurchaseOrderDetail, getSalesOrderDetail, type PurchaseOrder, type SalesOrder } from '@/api'
import type { ApiResponse } from '@/utils/http'

const detail = ref<PurchaseOrder | SalesOrder | null>(null)
const orderType = ref<'purchase' | 'sales'>('purchase')
const loading = ref(false)

onLoad((options) => {
  const id = options?.id as string
  orderType.value = (options?.type as 'purchase' | 'sales') || 'purchase'
  if (id) fetchDetail(id)
})

async function fetchDetail(id: string) {
  loading.value = true
  try {
    const res = orderType.value === 'purchase'
      ? await getPurchaseOrderDetail(id) as ApiResponse<PurchaseOrder>
      : await getSalesOrderDetail(id) as ApiResponse<SalesOrder>
    if (res.success) detail.value = res.data
  } catch {
    // 错误已统一处理
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="detail-page">
    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <template v-else-if="detail">
      <view class="info-section">
        <text class="section-title">基本信息</text>
        <view class="info-grid">
          <view class="info-item">
            <text class="label">单据编号</text>
            <text class="value">{{ detail.orderNo }}</text>
          </view>
          <view class="info-item">
            <text class="label">状态</text>
            <text class="value">{{ detail.status }}</text>
          </view>
          <view class="info-item">
            <text class="label">{{ orderType === 'purchase' ? '供应商' : '客户' }}</text>
            <text class="value">{{ (detail as PurchaseOrder).supplierName || (detail as SalesOrder).customerName }}</text>
          </view>
          <view class="info-item">
            <text class="label">日期</text>
            <text class="value">{{ detail.orderDate }}</text>
          </view>
          <view class="info-item">
            <text class="label">总金额</text>
            <text class="value highlight">¥{{ detail.totalAmount || 0 }}</text>
          </view>
        </view>
      </view>

      <!-- 明细 -->
      <view v-if="detail.items && detail.items.length > 0" class="info-section">
        <text class="section-title">商品明细</text>
        <view v-for="item in detail.items" :key="item.id" class="item-row">
          <view class="item-info">
            <text class="item-name">{{ item.productName }}</text>
            <text class="item-code">{{ item.productCode }}</text>
          </view>
          <view class="item-meta">
            <text class="item-qty">x{{ item.quantity }}</text>
            <text class="item-price">¥{{ item.unitPrice || 0 }}</text>
            <text class="item-amount">¥{{ item.amount || 0 }}</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  font-size: 28rpx;
  color: #999;
}

.info-section {
  background: #fff;
  margin: 20rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
}

.info-item {
  width: 50%;
  margin-bottom: 20rpx;
}

.label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;

  &.highlight {
    color: #ff4d4f;
    font-weight: 700;
  }
}

.item-row {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.item-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.item-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.item-code {
  font-size: 24rpx;
  color: #999;
}

.item-meta {
  display: flex;
  justify-content: flex-end;
  gap: 24rpx;
}

.item-qty {
  font-size: 24rpx;
  color: #666;
}

.item-price {
  font-size: 24rpx;
  color: #666;
}

.item-amount {
  font-size: 26rpx;
  color: #ff4d4f;
  font-weight: 600;
}
</style>
