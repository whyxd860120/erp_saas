<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getInventoryDetail, getInventoryLogs, type InventoryItem } from '@/api/inventory'
import type { ApiResponse } from '@/utils/http'

const detail = ref<InventoryItem | null>(null)
const logs = ref<any[]>([])
const loading = ref(false)

onLoad((options) => {
  const id = options?.id
  if (id) {
    fetchDetail(id as string)
  }
})

async function fetchDetail(id: string) {
  loading.value = true
  try {
    const [detailRes, logsRes] = await Promise.all([
      getInventoryDetail(id) as Promise<ApiResponse<InventoryItem>>,
      getInventoryLogs(id, { page: 1, pageSize: 10 }) as Promise<ApiResponse<{ items: any[] }>>,
    ])

    if (detailRes.success) {
      detail.value = detailRes.data
    }
    if (logsRes.success) {
      logs.value = logsRes.data.items || []
    }
  } catch {
    // 错误已在 http.ts 中统一处理
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="detail-page">
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <template v-else-if="detail">
      <!-- 基本信息 -->
      <view class="info-section">
        <text class="section-title">基本信息</text>
        <view class="info-grid">
          <view class="info-item">
            <text class="label">商品名称</text>
            <text class="value">{{ detail.productName }}</text>
          </view>
          <view class="info-item">
            <text class="label">商品编码</text>
            <text class="value">{{ detail.productCode }}</text>
          </view>
          <view class="info-item">
            <text class="label">规格型号</text>
            <text class="value">{{ detail.productSpec || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="label">单位</text>
            <text class="value">{{ detail.productUnit || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="label">仓库</text>
            <text class="value">{{ detail.warehouseName }}</text>
          </view>
          <view class="info-item">
            <text class="label">库存数量</text>
            <text class="value highlight">{{ detail.quantity }}</text>
          </view>
          <view class="info-item">
            <text class="label">锁定数量</text>
            <text class="value">{{ detail.lockedQuantity ?? 0 }}</text>
          </view>
          <view class="info-item">
            <text class="label">可用数量</text>
            <text class="value highlight-green">{{ detail.availableQuantity ?? 0 }}</text>
          </view>
        </view>
      </view>

      <!-- 变动日志 -->
      <view class="info-section">
        <text class="section-title">最近变动</text>
        <view v-if="logs.length === 0" class="empty">
          <text>暂无变动记录</text>
        </view>
        <view v-for="log in logs" :key="log.id" class="log-item">
          <view class="log-header">
            <text class="log-type">{{ log.type || '变动' }}</text>
            <text class="log-time">{{ log.createdAt }}</text>
          </view>
          <view class="log-body">
            <text class="log-desc">数量: {{ log.quantity || 0 }}</text>
          </view>
        </view>
      </view>
    </template>

    <view v-else class="empty">
      <text>数据加载失败</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

.loading, .empty {
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
    color: #1677ff;
    font-weight: 700;
  }

  &.highlight-green {
    color: #52c41a;
    font-weight: 700;
  }
}

.log-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.log-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.log-type {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.log-time {
  font-size: 22rpx;
  color: #999;
}

.log-desc {
  font-size: 24rpx;
  color: #666;
}
</style>
