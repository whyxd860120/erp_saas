<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useShopStore } from '@/stores/shop'
import { http, type ApiResponse } from '@/utils/http'

const shopStore = useShopStore()
const products = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 10

const API = '/api/v1/shop'

onMounted(async () => {
  await shopStore.fetchProfile()
  await shopStore.fetchCartInfo()
  fetchProducts(true)
})

async function fetchProducts(reset = false) {
  if (reset) page.value = 1
  loading.value = true
  try {
    const res = await http.get<ApiResponse<{ items: any[]; total: number }>>(
      `${API}/products`, { page: page.value, pageSize, keyword: keyword.value || undefined }, false
    )
    if (res.success) {
      products.value = reset ? res.data.items : [...products.value, ...res.data.items]
      total.value = res.data.total
    }
  } finally { loading.value = false }
}

function onSearch() { fetchProducts(true) }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/product/detail?id=${id}` }) }

function goLogin() {
  uni.showModal({
    title: '登录',
    content: '请输入您的昵称',
    editable: true,
    placeholderText: '微信用户',
    success: async (r) => {
      if (r.confirm) {
        await shopStore.login('demo_' + Date.now(), r.content || '微信用户')
        await shopStore.fetchCartInfo()
      }
    },
  })
}

function goCart() { uni.switchTab({ url: '/pages/cart/index' }) }
</script>

<template>
  <view class="shop-home">
    <!-- 顶部搜索 + 购物车入口 -->
    <view class="header">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input v-model="keyword" class="search-input" placeholder="搜索商品" @confirm="onSearch" />
      </view>
      <view class="cart-btn" @tap="goCart">
        <text class="cart-icon">🛒</text>
        <text v-if="shopStore.cartInfo.totalCount > 0" class="cart-badge">{{ shopStore.cartInfo.totalCount }}</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <scroll-view class="product-scroll" scroll-y @scrolltolower="() => { page++; fetchProducts() }">
      <view v-if="!loading && products.length === 0" class="empty">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无商品</text>
      </view>

      <view class="product-grid">
        <view v-for="item in products" :key="item.id" class="product-card" @tap="goDetail(item.id)">
          <view class="product-img-wrap">
            <image v-if="item.imageUrl" :src="item.imageUrl" class="product-img" mode="aspectFill" />
            <text v-else class="product-img-placeholder">📷</text>
          </view>
          <view class="product-info">
            <text class="product-name">{{ item.name }}</text>
            <view class="product-price-row">
              <text class="product-price">¥{{ item.price }}</text>
              <text v-if="item.originalPrice > item.price" class="product-original">¥{{ item.originalPrice }}</text>
            </view>
            <text class="product-sales">已售 {{ item.sales || 0 }}</text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading">加载中...</view>
      <view v-if="products.length >= total && total > 0" class="no-more">— 没有更多了 —</view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.shop-home { display: flex; flex-direction: column; height: 100vh; background: #f5f5f5; }

.header {
  display: flex; align-items: center; padding: 16rpx 24rpx; background: #fff;
  padding-top: calc(16rpx + var(--status-bar-height, 0px));
  position: sticky; top: 0; z-index: 100;
}
.search-box {
  flex: 1; display: flex; align-items: center; height: 68rpx; background: #f5f5f5;
  border-radius: 34rpx; padding: 0 24rpx;
}
.search-icon { font-size: 28rpx; margin-right: 12rpx; }
.search-input { flex: 1; font-size: 26rpx; }
.cart-btn { position: relative; margin-left: 24rpx; }
.cart-icon { font-size: 44rpx; }
.cart-badge {
  position: absolute; top: -8rpx; right: -8rpx; min-width: 32rpx; height: 32rpx;
  background: #ff4d4f; color: #fff; font-size: 20rpx; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center; padding: 0 6rpx;
}

.product-scroll { flex: 1; }
.product-grid { display: flex; flex-wrap: wrap; padding: 16rpx; gap: 16rpx; }
.product-card {
  width: calc(50% - 8rpx); background: #fff; border-radius: 16rpx; overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.product-img-wrap {
  width: 100%; height: 340rpx; background: #f8f8f8;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.product-img { width: 100%; height: 100%; }
.product-img-placeholder { font-size: 80rpx; }
.product-info { padding: 16rpx; }
.product-name {
  font-size: 26rpx; font-weight: 500; color: #333; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  line-height: 1.4; min-height: 72rpx;
}
.product-price-row { display: flex; align-items: baseline; margin-top: 12rpx; }
.product-price { font-size: 32rpx; font-weight: 700; color: #ff6b35; }
.product-original { font-size: 22rpx; color: #999; text-decoration: line-through; margin-left: 8rpx; }
.product-sales { font-size: 20rpx; color: #999; margin-top: 6rpx; }

.empty, .loading, .no-more { text-align: center; padding: 60rpx; color: #999; }
.empty-icon { font-size: 80rpx; display: block; margin-bottom: 16rpx; }
</style>
