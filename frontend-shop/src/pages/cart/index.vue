<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useShopStore } from '@/stores/shop'
import { http, type ApiResponse } from '@/utils/http'

const shopStore = useShopStore()
const items = ref<any[]>([])
const totalAmount = ref(0)
const allSelected = ref(true)
const loading = ref(false)
const API = '/api/v1/shop'

async function fetchCart() {
  if (!shopStore.isLoggedIn) { items.value = []; return }
  loading.value = true
  try {
    const res = await http.get<ApiResponse<{ items: any[]; totalCount: number; totalAmount: number }>>(`${API}/cart`)
    if (res.success) {
      items.value = res.data.items
      totalAmount.value = res.data.totalAmount
      allSelected.value = res.data.items.every((i: any) => i.selected)
      shopStore.fetchCartInfo()
    }
  } finally { loading.value = false }
}

onShow(() => fetchCart())

async function toggleItem(item: any) {
  await http.put(`${API}/cart/${item.id}/select`)
  fetchCart()
}
async function toggleAll() {
  await http.put(`${API}/cart/select-all`, { selected: !allSelected.value })
  fetchCart()
}
async function changeQty(item: any, delta: number) {
  const newQty = item.quantity + delta
  if (newQty < 1) return
  await http.put(`${API}/cart/${item.id}`, { quantity: newQty })
  fetchCart()
}
async function removeItem(item: any) {
  const res = await new Promise<boolean>(r => {
    uni.showModal({ title: '提示', content: '确定要删除吗？', success: (x) => r(x.confirm) })
  })
  if (!res) return
  await http.delete(`${API}/cart/${item.id}`)
  fetchCart()
}
function goCheckout() {
  uni.navigateTo({ url: '/pages/order/checkout' })
}
</script>

<template>
  <view class="cart-page">
    <view v-if="!shopStore.isLoggedIn" class="empty">
      <text class="empty-icon">🛒</text>
      <text class="empty-text">请先登录后查看购物车</text>
    </view>

    <view v-else-if="items.length === 0 && !loading" class="empty">
      <text class="empty-icon">🛒</text>
      <text class="empty-text">购物车是空的</text>
      <text class="go-shop" @tap="() => uni.switchTab({ url: '/pages/index/index' })">去逛逛</text>
    </view>

    <template v-else>
      <scroll-view class="cart-list" scroll-y>
        <view v-for="item in items" :key="item.id" class="cart-item">
          <view class="check-wrap" @tap="toggleItem(item)">
            <view class="check-box" :class="{ checked: item.selected }">
              <text v-if="item.selected">✓</text>
            </view>
          </view>
          <image v-if="item.imageUrl" :src="item.imageUrl" class="item-img" mode="aspectFill" />
          <view v-else class="item-img-placeholder">📷</view>
          <view class="item-info">
            <text class="item-name">{{ item.name }}</text>
            <text v-if="item.spec" class="item-spec">{{ item.spec }}</text>
            <view class="item-bottom">
              <text class="item-price">¥{{ item.price }}</text>
              <view class="qty-control">
                <view class="qty-btn" @tap="changeQty(item, -1)">−</view>
                <text class="qty-val">{{ item.quantity }}</text>
                <view class="qty-btn" @tap="changeQty(item, 1)">+</view>
              </view>
            </view>
          </view>
          <view class="del-btn" @tap="removeItem(item)">删除</view>
        </view>
      </scroll-view>

      <view class="bottom-bar">
        <view class="select-all" @tap="toggleAll">
          <view class="check-box" :class="{ checked: allSelected }">
            <text v-if="allSelected">✓</text>
          </view>
          <text>全选</text>
        </view>
        <view class="total-section">
          <text class="total-label">合计：</text>
          <text class="total-price">¥{{ totalAmount }}</text>
        </view>
        <button class="checkout-btn" @tap="goCheckout" :disabled="totalAmount <= 0">
          结算
        </button>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.cart-page { display: flex; flex-direction: column; height: 100vh; background: #f5f5f5; }

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
.empty-icon { font-size: 100rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
.go-shop { margin-top: 24rpx; color: #ff6b35; font-size: 28rpx; }

.cart-list { flex: 1; padding-bottom: 120rpx; }
.cart-item {
  display: flex; align-items: center; background: #fff; padding: 24rpx;
  margin-bottom: 2rpx;
}
.check-wrap { padding: 8rpx 16rpx 8rpx 0; }
.check-box {
  width: 40rpx; height: 40rpx; border: 2rpx solid #ddd; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 24rpx;
  &.checked { background: #ff6b35; border-color: #ff6b35; color: #fff; }
}
.item-img, .item-img-placeholder { width: 160rpx; height: 160rpx; border-radius: 12rpx; background: #f8f8f8; }
.item-img-placeholder { display: flex; align-items: center; justify-content: center; font-size: 60rpx; }
.item-info { flex: 1; margin-left: 20rpx; display: flex; flex-direction: column; justify-content: space-between; min-height: 160rpx; }
.item-name { font-size: 28rpx; font-weight: 500; color: #333; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.item-spec { font-size: 24rpx; color: #999; }
.item-bottom { display: flex; justify-content: space-between; align-items: center; }
.item-price { font-size: 30rpx; font-weight: 700; color: #ff6b35; }
.qty-control { display: flex; align-items: center; }
.qty-btn {
  width: 48rpx; height: 48rpx; border: 1rpx solid #ddd; border-radius: 8rpx;
  display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #666;
}
.qty-val { width: 64rpx; text-align: center; font-size: 28rpx; }
.del-btn { padding: 8rpx; color: #999; font-size: 24rpx; }

.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; background: #fff;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 16rpx rgba(0,0,0,0.06);
}
.select-all { display: flex; align-items: center; font-size: 26rpx; color: #666; }
.select-all .check-box { margin-right: 8rpx; }
.total-section { flex: 1; text-align: right; margin-right: 20rpx; }
.total-label { font-size: 26rpx; color: #666; }
.total-price { font-size: 36rpx; font-weight: 700; color: #ff6b35; }
.checkout-btn {
  width: 180rpx; height: 72rpx; line-height: 72rpx; background: linear-gradient(135deg, #ff6b35, #ff3d00);
  color: #fff; font-size: 30rpx; font-weight: 600; border-radius: 36rpx; text-align: center; border: none;
  &[disabled] { opacity: 0.5; }
}
</style>
