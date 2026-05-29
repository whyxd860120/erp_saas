<script setup lang="ts">
import { useShopStore } from '@/stores/shop'

const shopStore = useShopStore()

function goLogin() {
  uni.showModal({
    title: '登录',
    content: '请输入您的昵称',
    editable: true,
    placeholderText: '微信用户',
    success: async (r) => {
      if (r.confirm) {
        await shopStore.login('demo_' + Date.now(), r.content || '微信用户')
      }
    },
  })
}

function goAddress() { uni.navigateTo({ url: '/pages/mine/address' }) }
function goOrders() { uni.switchTab({ url: '/pages/order/index' }) }
function handleLogout() { shopStore.logout() }
</script>

<template>
  <view class="mine-page">
    <!-- 用户信息 -->
    <view class="user-section" v-if="shopStore.isLoggedIn">
      <image v-if="shopStore.user?.avatarUrl" :src="shopStore.user.avatarUrl" class="avatar" mode="aspectFill" />
      <view v-else class="avatar-place">{{ shopStore.user?.nickname?.charAt(0) || 'U' }}</view>
      <text class="nickname">{{ shopStore.user?.nickname }}</text>
    </view>
    <view v-else class="user-section" @tap="goLogin">
      <view class="avatar-place">?</view>
      <text class="nickname">点击登录</text>
    </view>

    <!-- 我的订单 -->
    <view class="menu-section">
      <view class="menu-title">我的订单</view>
      <view class="order-nav">
        <view class="nav-item" @tap="() => { uni.switchTab({ url: '/pages/order/index' }) }">
          <text class="nav-icon">📋</text><text>全部</text>
        </view>
        <view class="nav-item" @tap="() => { uni.setStorageSync('order_tab', 'pending'); uni.switchTab({ url: '/pages/order/index' }) }">
          <text class="nav-icon">💳</text><text>待付款</text>
        </view>
        <view class="nav-item" @tap="() => { uni.setStorageSync('order_tab', 'shipped'); uni.switchTab({ url: '/pages/order/index' }) }">
          <text class="nav-icon">📦</text><text>待收货</text>
        </view>
        <view class="nav-item" @tap="() => { uni.setStorageSync('order_tab', 'completed'); uni.switchTab({ url: '/pages/order/index' }) }">
          <text class="nav-icon">✅</text><text>已完成</text>
        </view>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="menu-section">
      <view class="menu-item" @tap="goAddress">
        <text class="menu-icon">📍</text>
        <text class="menu-label">收货地址</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 退出 -->
    <view class="logout-section" v-if="shopStore.isLoggedIn">
      <button class="logout-btn" @tap="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mine-page { min-height: 100vh; background: #f5f5f5; }
.user-section {
  background: linear-gradient(135deg, #ff6b35, #ff3d00);
  padding: 80rpx 32rpx 48rpx; display: flex; flex-direction: column; align-items: center;
}
.avatar { width: 120rpx; height: 120rpx; border-radius: 50%; border: 4rpx solid rgba(255,255,255,0.3); }
.avatar-place {
  width: 120rpx; height: 120rpx; border-radius: 50%; background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center; font-size: 48rpx; color: #fff;
}
.nickname { font-size: 34rpx; font-weight: 600; color: #fff; margin-top: 20rpx; }

.menu-section { background: #fff; margin: 16rpx 24rpx; border-radius: 16rpx; padding: 24rpx; }
.menu-title { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; }
.order-nav { display: flex; justify-content: space-around; }
.nav-item { display: flex; flex-direction: column; align-items: center; font-size: 24rpx; color: #666; }
.nav-icon { font-size: 40rpx; margin-bottom: 8rpx; }

.menu-item { display: flex; align-items: center; padding: 20rpx 0; }
.menu-icon { font-size: 32rpx; margin-right: 20rpx; }
.menu-label { flex: 1; font-size: 28rpx; color: #333; }
.menu-arrow { font-size: 36rpx; color: #ccc; }

.logout-section { padding: 40rpx 24rpx; }
.logout-btn {
  width: 100%; height: 88rpx; line-height: 88rpx; background: #fff; color: #ff4d4f;
  font-size: 30rpx; border-radius: 16rpx; border: 1rpx solid #ff4d4f; text-align: center;
}
</style>
