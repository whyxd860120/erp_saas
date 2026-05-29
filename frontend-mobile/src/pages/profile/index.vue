<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        authStore.logout()
      }
    },
  })
}

function goChangePassword() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
</script>

<template>
  <view class="profile-page">
    <!-- 用户信息 -->
    <view class="user-section">
      <view class="avatar">
        <text class="avatar-text">{{ authStore.user?.name?.charAt(0) || 'U' }}</text>
      </view>
      <text class="user-name">{{ authStore.user?.name || '未登录' }}</text>
      <text class="user-role">{{ authStore.user?.role || '' }}</text>
      <text v-if="authStore.tenant" class="tenant-name">{{ authStore.tenant.name }}</text>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-item" @tap="goChangePassword">
        <text class="menu-icon">🔒</text>
        <text class="menu-label">修改密码</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item">
        <text class="menu-icon">📱</text>
        <text class="menu-label">关于应用</text>
        <text class="menu-value">v1.0.0</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-section">
      <button class="logout-btn" @tap="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.user-section {
  background: linear-gradient(135deg, #1677ff, #0958d9);
  padding: 60rpx 32rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.avatar-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
}

.user-name {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8rpx;
}

.user-role {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8rpx;
}

.tenant-name {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  padding: 4rpx 20rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20rpx;
}

.menu-section {
  margin: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.menu-icon {
  font-size: 32rpx;
  margin-right: 20rpx;
}

.menu-label {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.menu-arrow {
  font-size: 36rpx;
  color: #ccc;
}

.menu-value {
  font-size: 24rpx;
  color: #999;
}

.logout-section {
  padding: 40rpx 24rpx;
}

.logout-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: #fff;
  color: #ff4d4f;
  font-size: 30rpx;
  border-radius: 16rpx;
  border: 1rpx solid #ff4d4f;
  text-align: center;
}
</style>
