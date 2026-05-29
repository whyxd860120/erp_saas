<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value.trim()) {
    uni.showToast({ title: '请输入用户名', icon: 'none' })
    return
  }
  if (!password.value.trim()) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    await authStore.login({
      username: username.value.trim(),
      password: password.value.trim(),
    })
    uni.showToast({ title: '登录成功', icon: 'success' })
    // 使用 reLaunch 跳转到 tabBar 首页（switchTab 要求页面在 tabBar 中，login 不在）
    uni.reLaunch({ url: '/pages/dashboard/index' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '登录失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="login-page">
    <view class="login-header">
      <view class="logo-area">
        <view class="logo-icon">
          <text class="logo-text">ERP</text>
        </view>
        <text class="app-name">进销存管理系统</text>
        <text class="app-subtitle">移动端管理平台</text>
      </view>
    </view>

    <view class="login-form">
      <view class="form-item">
        <text class="form-label">用户名</text>
        <input
          v-model="username"
          class="form-input"
          type="text"
          placeholder="请输入用户名"
          placeholder-class="placeholder"
          :disabled="loading"
        />
      </view>

      <view class="form-item">
        <text class="form-label">密码</text>
        <input
          v-model="password"
          class="form-input"
          type="password"
          placeholder="请输入密码"
          placeholder-class="placeholder"
          :disabled="loading"
          @confirm="handleLogin"
        />
      </view>

      <button
        class="login-btn"
        :class="{ 'login-btn--loading': loading }"
        :loading="loading"
        :disabled="loading"
        @tap="handleLogin"
      >
        {{ loading ? '登录中...' : '登 录' }}
      </button>
    </view>

    <view class="login-footer">
      <text class="footer-text">ERP2026 进销存管理系统</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%);
}

.login-header {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 120rpx;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
  backdrop-filter: blur(10px);
}

.logo-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  letter-spacing: 4rpx;
}

.app-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12rpx;
}

.app-subtitle {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
}

.login-form {
  padding: 60rpx 48rpx 80rpx;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
}

.form-item {
  margin-bottom: 36rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.form-input {
  height: 96rpx;
  padding: 0 28rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #333;
}

.placeholder {
  color: #bbb;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  margin-top: 48rpx;
  background: linear-gradient(135deg, #1677ff, #0958d9);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
  text-align: center;

  &--loading {
    opacity: 0.7;
  }

  &[disabled] {
    opacity: 0.7;
  }
}

.login-footer {
  padding: 40rpx 0;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  text-align: center;
}

.footer-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
}
</style>
