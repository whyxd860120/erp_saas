<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useShopStore } from '@/stores/shop'
import { http, type ApiResponse } from '@/utils/http'

const shopStore = useShopStore()
const product = ref<any>(null)
const loading = ref(true)
const buyQty = ref(1)
const API = '/api/v1/shop'

onLoad(async (options) => {
  const id = options?.id
  if (!id) return
  try {
    const res = await http.get<ApiResponse<any>>(`${API}/products/${id}`, undefined, false)
    if (res.success) product.value = res.data
  } finally { loading.value = false }
})

async function addToCart() {
  if (!shopStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  try {
    const res = await http.post<ApiResponse<any>>(`${API}/cart`, {
      productId: product.value.id,
      quantity: buyQty.value,
    })
    if (res.success) {
      uni.showToast({ title: '已加入购物车', icon: 'success' })
      shopStore.fetchCartInfo()
    }
  } catch { /* handled */ }
}

function buyNow() {
  if (!shopStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  // 直接跳到确认订单（带商品信息）
  const item = {
    productId: product.value.id, name: product.value.name,
    imageUrl: product.value.imageUrl, spec: product.value.spec,
    price: product.value.price, quantity: buyQty.value,
  }
  uni.navigateTo({ url: `/pages/order/checkout?direct=${JSON.stringify(item)}` })
}

function goCart() { uni.switchTab({ url: '/pages/cart/index' }) }
</script>

<template>
  <view class="detail-page" v-if="product">
    <!-- 商品图片 -->
    <swiper v-if="product.images?.length" class="banner" indicator-dots>
      <swiper-item v-for="(img, i) in product.images" :key="i">
        <image :src="img" class="banner-img" mode="aspectFill" />
      </swiper-item>
    </swiper>
    <view v-else class="banner-single">
      <image v-if="product.imageUrl" :src="product.imageUrl" class="banner-img" mode="aspectFill" />
      <text v-else class="banner-placeholder">📷</text>
    </view>

    <!-- 商品信息 -->
    <view class="info-section">
      <view class="price-row">
        <text class="price">¥{{ product.price }}</text>
        <text v-if="product.originalPrice > product.price" class="original">¥{{ product.originalPrice }}</text>
      </view>
      <text class="name">{{ product.name }}</text>
      <text v-if="product.spec" class="spec">{{ product.spec }}</text>
      <view class="meta-row">
        <text class="sales">已售 {{ product.sales || 0 }}</text>
        <text class="stock" :class="{ low: product.stock < 10 }">库存 {{ product.stock }}</text>
      </view>
    </view>

    <!-- 商品描述 -->
    <view class="desc-section" v-if="product.desc">
      <text class="section-title">商品详情</text>
      <view class="desc-content">{{ product.desc }}</view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="cart-link" @tap="goCart">
        <text class="cart-icon">🛒</text>
        <text v-if="shopStore.cartInfo.totalCount > 0" class="cart-count">{{ shopStore.cartInfo.totalCount }}</text>
      </view>
      <button class="btn-cart" @tap="addToCart">加入购物车</button>
      <button class="btn-buy" @tap="buyNow">立即购买</button>
    </view>
  </view>

  <view v-else-if="loading" class="loading-page"><text>加载中...</text></view>
  <view v-else class="loading-page"><text>商品不存在</text></view>
</template>

<style lang="scss" scoped>
.detail-page { padding-bottom: 120rpx; }
.banner, .banner-single { width: 100%; height: 600rpx; background: #f8f8f8; }
.banner-img { width: 100%; height: 100%; }
.banner-placeholder { font-size: 120rpx; display: flex; align-items: center; justify-content: center; height: 100%; }

.info-section { background: #fff; padding: 32rpx 24rpx; }
.price-row { display: flex; align-items: baseline; margin-bottom: 12rpx; }
.price { font-size: 48rpx; font-weight: 700; color: #ff6b35; }
.original { font-size: 26rpx; color: #999; text-decoration: line-through; margin-left: 12rpx; }
.name { font-size: 34rpx; font-weight: 600; color: #333; display: block; margin-bottom: 8rpx; }
.spec { font-size: 26rpx; color: #999; display: block; margin-bottom: 16rpx; }
.meta-row { display: flex; justify-content: space-between; }
.sales { font-size: 24rpx; color: #999; }
.stock { font-size: 24rpx; color: #52c41a; &.low { color: #ff4d4f; } }

.desc-section { background: #fff; margin-top: 16rpx; padding: 32rpx 24rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; display: block; }
.desc-content { font-size: 28rpx; color: #666; line-height: 1.8; white-space: pre-wrap; }

.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; background: #fff;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 16rpx rgba(0,0,0,0.06);
}
.cart-link { position: relative; margin-right: 24rpx; }
.cart-icon { font-size: 48rpx; }
.cart-count {
  position: absolute; top: -8rpx; right: -8rpx; min-width: 32rpx; height: 32rpx;
  background: #ff4d4f; color: #fff; font-size: 20rpx; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center; padding: 0 6rpx;
}
.btn-cart, .btn-buy {
  flex: 1; height: 80rpx; line-height: 80rpx; font-size: 30rpx; font-weight: 600;
  border-radius: 40rpx; text-align: center; border: none;
}
.btn-cart { background: linear-gradient(135deg, #ff9a56, #ff6b35); color: #fff; margin-right: 16rpx; }
.btn-buy { background: linear-gradient(135deg, #ff6b35, #ff3d00); color: #fff; }
.loading-page { display: flex; align-items: center; justify-content: center; height: 100vh; color: #999; }
</style>
