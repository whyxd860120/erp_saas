<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useShopStore } from '@/stores/shop'
import { http, type ApiResponse } from '@/utils/http'

const shopStore = useShopStore()
const orders = ref<any[]>([])
const loading = ref(false)
const activeTab = ref('')
const tabs = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
]
const API = '/api/v1/shop'

async function fetchOrders() {
  if (!shopStore.isLoggedIn) { orders.value = []; return }
  loading.value = true
  try {
    const params: any = { page: 1, pageSize: 50 }
    if (activeTab.value) params.status = activeTab.value
    const res = await http.get<ApiResponse<{ items: any[]; total: number }>>(`${API}/orders`, params)
    if (res.success) orders.value = res.data.items
  } finally { loading.value = false }
}

onShow(() => fetchOrders())

function switchTab(key: string) { activeTab.value = key; fetchOrders() }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/order/detail?id=${id}` }) }

const statusMap: Record<string, string> = {
  pending: '待付款', paid: '待发货', shipped: '待收货', completed: '已完成',
  cancelled: '已取消', refunding: '退款中', refunded: '已退款',
}

async function cancelOrder(order: any) {
  const r = await new Promise<boolean>(resolve => {
    uni.showModal({ title: '提示', content: '确定要取消订单吗？', success: (x) => resolve(x.confirm) })
  })
  if (!r) return
  await http.put(`${API}/orders/${order.id}/cancel`, { reason: '用户取消' })
  fetchOrders()
}

async function receiveOrder(order: any) {
  await http.put(`${API}/orders/${order.id}/receive`)
  fetchOrders()
}
</script>

<template>
  <view class="order-page">
    <view v-if="!shopStore.isLoggedIn" class="empty">
      <text class="empty-icon">📋</text>
      <text class="empty-text">请先登录</text>
    </view>
    <template v-else>
      <view class="tab-row">
        <view v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @tap="switchTab(tab.key)">
          {{ tab.label }}
        </view>
      </view>
      <scroll-view class="order-list" scroll-y>
        <view v-if="orders.length === 0 && !loading" class="empty">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无订单</text>
        </view>
        <view v-for="order in orders" :key="order.id" class="order-card" @tap="goDetail(order.id)">
          <view class="order-header">
            <text class="order-no">订单号：{{ order.orderNo }}</text>
            <text class="order-status">{{ statusMap[order.status] || order.status }}</text>
          </view>
          <view v-for="item in order.items" :key="item.id" class="order-item">
            <image v-if="item.imageUrl" :src="item.imageUrl" class="item-img" mode="aspectFill" />
            <view v-else class="item-img-place">📷</view>
            <view class="item-info">
              <text class="item-name">{{ item.name }}</text>
              <text v-if="item.spec" class="item-spec">{{ item.spec }}</text>
              <view class="item-price-row">
                <text class="item-price">¥{{ item.unitPrice }}</text>
                <text class="item-qty">x{{ item.quantity }}</text>
              </view>
            </view>
          </view>
          <view class="order-footer">
            <text class="order-total">共 {{ order.itemCount }} 件，合计 ¥{{ order.finalAmount }}</text>
            <view class="order-actions" @tap.stop>
              <button v-if="order.status === 'pending'" class="act-btn cancel" @tap="cancelOrder(order)">取消</button>
              <button v-if="order.status === 'shipped'" class="act-btn receive" @tap="receiveOrder(order)">确认收货</button>
            </view>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.order-page { display: flex; flex-direction: column; height: 100vh; background: #f5f5f5; }
.tab-row { display: flex; background: #fff; border-bottom: 1rpx solid #f0f0f0; }
.tab {
  flex: 1; text-align: center; padding: 24rpx 0; font-size: 26rpx; color: #666;
  &.active { color: #ff6b35; font-weight: 600; border-bottom: 4rpx solid #ff6b35; }
}
.order-list { flex: 1; }
.order-card { background: #fff; margin: 16rpx 24rpx; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.order-header { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.order-no { font-size: 24rpx; color: #999; }
.order-status { font-size: 24rpx; color: #ff6b35; font-weight: 600; }
.order-item { display: flex; padding: 16rpx 0; border-top: 1rpx solid #f5f5f5; }
.item-img, .item-img-place { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #f8f8f8; }
.item-img-place { display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.item-info { flex: 1; margin-left: 20rpx; display: flex; flex-direction: column; justify-content: space-between; }
.item-name { font-size: 26rpx; color: #333; }
.item-spec { font-size: 22rpx; color: #999; }
.item-price-row { display: flex; justify-content: space-between; }
.item-price { font-size: 28rpx; font-weight: 600; color: #ff6b35; }
.item-qty { font-size: 24rpx; color: #999; }
.order-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #f5f5f5; }
.order-total { font-size: 24rpx; color: #666; }
.act-btn {
  padding: 10rpx 28rpx; font-size: 24rpx; border-radius: 28rpx; border: 1rpx solid #ddd;
  background: #fff; color: #666; margin-left: 12rpx;
  &.cancel { color: #999; }
  &.receive { background: #ff6b35; color: #fff; border-color: #ff6b35; }
}

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
