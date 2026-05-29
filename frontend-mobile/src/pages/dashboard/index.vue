<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const statsCards = ref([
  { title: '库存商品', value: '--', icon: '📦', key: 'products' },
  { title: '采购订单', value: '--', icon: '📋', key: 'purchaseOrders' },
  { title: '销售订单', value: '--', icon: '💰', key: 'salesOrders' },
  { title: '待处理事项', value: '--', icon: '⏳', key: 'pendingTasks' },
])

const shortcuts = [
  { label: '库存查询', icon: '📦', path: '/pages/inventory/index' },
  { label: '采购订单', icon: '📋', path: '/pages/order/index?type=purchase' },
  { label: '销售订单', icon: '💰', path: '/pages/order/index?type=sales' },
  { label: '商品管理', icon: '🏷️', path: '/pages/inventory/index' },
]

onMounted(() => {
  // TODO: 从 API 获取统计数据
  statsCards.value[0].value = '--'
  statsCards.value[1].value = '--'
  statsCards.value[2].value = '--'
  statsCards.value[3].value = '--'
})

function goTo(path: string) {
  uni.navigateTo({ url: path })
}
</script>

<template>
  <view class="dashboard">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-info">
        <view class="avatar">
          <text class="avatar-text">{{ authStore.user?.name?.charAt(0) || 'U' }}</text>
        </view>
        <view class="user-detail">
          <text class="user-name">{{ authStore.user?.name || '未登录' }}</text>
          <text class="user-tenant">{{ authStore.tenant?.name || '' }}</text>
        </view>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-grid">
      <view v-for="card in statsCards" :key="card.key" class="stat-card">
        <text class="stat-icon">{{ card.icon }}</text>
        <text class="stat-value">{{ card.value }}</text>
        <text class="stat-title">{{ card.title }}</text>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="section">
      <text class="section-title">快捷操作</text>
      <view class="shortcut-grid">
        <view
          v-for="item in shortcuts"
          :key="item.label"
          class="shortcut-item"
          @tap="goTo(item.path)"
        >
          <view class="shortcut-icon">
            <text class="shortcut-emoji">{{ item.icon }}</text>
          </view>
          <text class="shortcut-label">{{ item.label }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.dashboard {
  min-height: 100vh;
  background: #f5f5f5;
}

.user-card {
  background: linear-gradient(135deg, #1677ff, #0958d9);
  padding: 40rpx 32rpx;
  padding-top: calc(40rpx + var(--status-bar-height, 0px));
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

.user-detail {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6rpx;
}

.user-tenant {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 24rpx;
  margin-top: -20rpx;
}

.stat-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.stat-icon {
  font-size: 40rpx;
  margin-bottom: 12rpx;
}

.stat-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 6rpx;
}

.stat-title {
  font-size: 24rpx;
  color: #999;
}

.section {
  padding: 0 24rpx;
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.shortcut-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.shortcut-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: #f0f5ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.shortcut-emoji {
  font-size: 36rpx;
}

.shortcut-label {
  font-size: 24rpx;
  color: #666;
}
</style>
