<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useShopStore } from '@/stores/shop'
import { http, type ApiResponse } from '@/utils/http'

const shopStore = useShopStore()
const addresses = ref<any[]>([])
const cartItems = ref<any[]>([])
const totalAmount = ref(0)
const selectedAddress = ref<any>(null)
const buyerRemark = ref('')
const loading = ref(false)
const API = '/api/v1/shop'

onMounted(async () => {
  // 获取地址
  const addrRes = await http.get<ApiResponse<any[]>>(`${API}/addresses`)
  if (addrRes.success) {
    addresses.value = addrRes.data
    selectedAddress.value = addrRes.data.find((a: any) => a.isDefault) || addrRes.data[0]
  }
  // 获取购物车选中项
  const cartRes = await http.get<ApiResponse<{ items: any[]; totalAmount: number }>>(`${API}/cart`)
  if (cartRes.success) {
    cartItems.value = cartRes.data.items.filter((i: any) => i.selected)
    totalAmount.value = cartRes.data.totalAmount
  }
})

async function submitOrder() {
  if (!selectedAddress.value) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await http.post<ApiResponse<{ orderNo: string; finalAmount: number }>>(`${API}/orders`, {
      addressId: selectedAddress.value.id,
      buyerRemark: buyerRemark.value,
    })
    if (res.success) {
      shopStore.fetchCartInfo()
      uni.showModal({
        title: '下单成功',
        content: `订单号：${res.data.orderNo}\n金额：¥${res.data.finalAmount}`,
        showCancel: false,
        success: () => uni.switchTab({ url: '/pages/order/index' }),
      })
    }
  } finally { loading.value = false }
}

function goAddAddress() { uni.navigateTo({ url: '/pages/mine/address' }) }
</script>

<template>
  <view class="checkout-page">
    <!-- 收货地址 -->
    <view class="section" @tap="goAddAddress">
      <view v-if="selectedAddress" class="address-card">
        <text class="addr-icon">📍</text>
        <view class="addr-info">
          <text class="addr-contact">{{ selectedAddress.name }} {{ selectedAddress.mobile }}</text>
          <text class="addr-detail">{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }} {{ selectedAddress.detail }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view v-else class="no-address">请添加收货地址 ›</view>
    </view>

    <!-- 商品列表 -->
    <view class="section">
      <view v-for="item in cartItems" :key="item.productId" class="goods-item">
        <image v-if="item.imageUrl" :src="item.imageUrl" class="goods-img" mode="aspectFill" />
        <view v-else class="goods-img-place">📷</view>
        <view class="goods-info">
          <text class="goods-name">{{ item.name }}</text>
          <view class="goods-price-row">
            <text class="goods-price">¥{{ item.price }}</text>
            <text class="goods-qty">x{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 金额 -->
    <view class="section amount-section">
      <view class="amount-row">
        <text>商品总额</text><text>¥{{ totalAmount }}</text>
      </view>
      <view class="amount-row">
        <text>运费</text><text>免运费</text>
      </view>
      <view class="amount-row total">
        <text>实付金额</text><text class="final">¥{{ totalAmount }}</text>
      </view>
    </view>

    <!-- 备注 -->
    <view class="section remark-section">
      <input v-model="buyerRemark" class="remark-input" placeholder="买家备注（选填）" />
    </view>

    <!-- 提交 -->
    <view class="submit-bar">
      <text class="submit-total">合计：¥{{ totalAmount }}</text>
      <button class="submit-btn" :loading="loading" @tap="submitOrder">提交订单</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.checkout-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 120rpx; }
.section { background: #fff; margin: 16rpx 0; padding: 24rpx; }
.address-card { display: flex; align-items: center; }
.addr-icon { font-size: 36rpx; margin-right: 16rpx; }
.addr-info { flex: 1; }
.addr-contact { font-size: 28rpx; font-weight: 600; display: block; }
.addr-detail { font-size: 24rpx; color: #666; margin-top: 6rpx; display: block; }
.arrow { font-size: 36rpx; color: #ccc; }
.no-address { text-align: center; padding: 40rpx 0; color: #ff6b35; font-size: 28rpx; }

.goods-item { display: flex; padding: 16rpx 0; &:not(:last-child) { border-bottom: 1rpx solid #f5f5f5; } }
.goods-img, .goods-img-place { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #f8f8f8; }
.goods-img-place { display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.goods-info { flex: 1; margin-left: 20rpx; display: flex; flex-direction: column; justify-content: space-between; }
.goods-name { font-size: 26rpx; color: #333; }
.goods-price-row { display: flex; justify-content: space-between; }
.goods-price { font-size: 28rpx; font-weight: 600; color: #ff6b35; }
.goods-qty { font-size: 24rpx; color: #999; }

.amount-section { padding: 24rpx; }
.amount-row { display: flex; justify-content: space-between; padding: 10rpx 0; font-size: 26rpx; color: #666; }
.amount-row.total { border-top: 1rpx solid #f5f5f5; margin-top: 8rpx; padding-top: 16rpx; }
.final { font-size: 32rpx; font-weight: 700; color: #ff6b35; }

.remark-input { height: 72rpx; font-size: 26rpx; }

.submit-bar {
  position: fixed; bottom: 0; left: 0; right: 0; background: #fff;
  display: flex; align-items: center; justify-content: flex-end; padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 16rpx rgba(0,0,0,0.06);
}
.submit-total { font-size: 28rpx; color: #333; margin-right: 24rpx; }
.submit-btn {
  width: 220rpx; height: 80rpx; line-height: 80rpx; background: linear-gradient(135deg, #ff6b35, #ff3d00);
  color: #fff; font-size: 30rpx; font-weight: 600; border-radius: 40rpx; text-align: center; border: none;
}
</style>
