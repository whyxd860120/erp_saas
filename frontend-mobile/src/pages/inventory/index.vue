<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getInventoryList, type InventoryItem } from '@/api/inventory'
import type { ApiResponse } from '@/utils/http'

const list = ref<InventoryItem[]>([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 20

async function fetchList(reset = false) {
  if (reset) page.value = 1
  loading.value = true
  try {
    const res = await getInventoryList({
      page: page.value,
      pageSize,
      keyword: keyword.value || undefined,
    }) as ApiResponse<{ items: InventoryItem[]; total: number }>
    if (res.success) {
      if (reset) {
        list.value = res.data.items
      } else {
        list.value.push(...res.data.items)
      }
      total.value = res.data.total
    }
  } catch {
    // 错误已在 http.ts 中统一处理
  } finally {
    loading.value = false
  }
}

function onSearch() {
  fetchList(true)
}

function onLoadMore() {
  if (list.value.length >= total.value) return
  page.value++
  fetchList(false)
}

function goDetail(item: InventoryItem) {
  uni.navigateTo({ url: `/pages/inventory/detail?id=${item.id}` })
}

onMounted(() => {
  fetchList(true)
})
</script>

<template>
  <view class="inventory-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          placeholder="搜索商品名称/编码"
          placeholder-class="placeholder"
          @confirm="onSearch"
        />
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="onLoadMore"
    >
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">📦</text>
        <text class="empty-text">暂无库存数据</text>
      </view>

      <view v-for="item in list" :key="item.id" class="inventory-card" @tap="goDetail(item)">
        <view class="card-header">
          <text class="product-name">{{ item.productName }}</text>
          <text class="product-code">{{ item.productCode }}</text>
        </view>
        <view class="card-body">
          <view class="info-row">
            <text class="info-label">仓库</text>
            <text class="info-value">{{ item.warehouseName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">库存数量</text>
            <text class="info-value quantity">{{ item.quantity }}</text>
          </view>
          <view v-if="item.availableQuantity !== undefined" class="info-row">
            <text class="info-label">可用数量</text>
            <text class="info-value available">{{ item.availableQuantity }}</text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>

      <view v-if="list.length >= total && list.length > 0" class="no-more">
        <text>— 没有更多了 —</text>
      </view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.inventory-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.search-bar {
  padding: 20rpx 24rpx;
  background: #fff;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f7f8fa;
  border-radius: 36rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.placeholder {
  color: #bbb;
}

.list-scroll {
  flex: 1;
  padding: 16rpx 24rpx;
}

.inventory-card {
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

.product-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-code {
  font-size: 24rpx;
  color: #999;
  margin-left: 16rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.info-label {
  font-size: 26rpx;
  color: #999;
}

.info-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;

  &.quantity {
    color: #1677ff;
    font-weight: 700;
  }

  &.available {
    color: #52c41a;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

.loading-tip {
  text-align: center;
  padding: 20rpx;
  color: #999;
  font-size: 24rpx;
}

.no-more {
  text-align: center;
  padding: 20rpx;
  color: #ccc;
  font-size: 24rpx;
}
</style>
