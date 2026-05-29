<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { http, type ApiResponse } from '@/utils/http'

const order = ref<any>(null)
const API = '/api/v1/shop'

const statusMap: Record<string, string> = {
  pending: '待付款', paid: '待发货', shipped: '待收货', completed: '已完成',
  cancelled: '已取消', refunding: '退款中', refunded: '已退款',
}

onLoad(async (options) => {
  const id = options?.id
  if (!id) return
  try {
    const res = await http.get<ApiResponse<any>>(`${API}/orders/${id}`)
    if (res.success) order.value = res.data
  } catch { /* ignore */ }
})

async function cancelOrder() {
  const r = await new Promise<boolean>(resolve => {
    uni.showModal({ title: '提示', content: '确定要取消订单吗？', success: (x) => resolve(x.confirm) })
  })
  if (!r) return
  await http.put(`${API}/orders/${order.value.id}/cancel`, { reason: '用户取消' })
  order.value.status = 'cancelled'
}
async function receiveOrder() {
  await http.put(`${API}/orders/${order.value.id}/receive`)
  order.value.status = 'completed'
  order.value.finishTime = new Date().toISOString()
}
</script>

<template>
  <view class="detail-page" v-if="order">
    <view class="status-bar">
      <text class="status-text">{{ statusMap[order.status] || order.status }}</text>
      <text v-if="order.status === 'shipped'" class="status-hint">您的包裹正在路上</text>
    </view>

    <view class="address-card" v-if="order.addressSnapshot">
      <text class="addr-icon">📍</text>
      <view class="addr-info">
        <text class="addr-contact">{{ order.addressSnapshot.name }} {{ order.addressSnapshot.mobile }}</text>
        <text class="addr-detail">{{ order.addressSnapshot.province }}{{ order.addressSnapshot.city }}{{ order.addressSnapshot.district }} {{ order.addressSnapshot.detail }}</text>
      </view>
    </view>

    <view class="items-card">
      <view v-for="item in order.items" :key="item.id" class="item">
        <image v-if="item.imageUrl" :src="item.imageUrl" class="item-img" mode="aspectFill" />
        <view v-else class="item-img-place">📷</view>
        <view class="item-info">
          <text class="item-name">{{ item.name }}</text>
          <view class="item-price-row">
            <text class="item-price">¥{{ item.unitPrice }}</text>
            <text class="item-qty">x{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="amount-card">
      <view class="amount-row">
        <text>商品总额</text><text>¥{{ order.totalAmount }}</text>
      </view>
      <view class="amount-row">
        <text>运费</text><text>¥{{ order.freightAmount || 0 }}</text>
      </view>
      <view class="amount-row total">
        <text>实付金额</text><text class="final">¥{{ order.finalAmount }}</text>
      </view>
    </view>

    <view class="info-card">
      <view class="info-row"><text>订单编号</text><text>{{ order.orderNo }}</text></view>
      <view class="info-row" v-if="order.payTime"><text>付款时间</text><text>{{ order.payTime }}</text></view>
      <view class="info-row" v-if="order.shipTime"><text>发货时间</text><text>{{ order.shipTime }}</text></view>
      <view class="info-row" v-if="order.expressNo"><text>快递单号</text><text>{{ order.expressCompany }} {{ order.expressNo }}</text></view>
    </view>

    <view class="bottom-actions" v-if="order.status === 'pending' || order.status === 'shipped'">
      <button v-if="order.status === 'pending'" class="act-btn cancel" @tap="cancelOrder">取消订单</button>
      <button v-if="order.status === 'shipped'" class="act-btn receive" @tap="receiveOrder">确认收货</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.detail-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 40rpx; }
.status-bar { background: linear-gradient(135deg, #ff6b35, #ff3d00); padding: 40rpx 32rpx; color: #fff; }
.status-text { font-size: 36rpx; font-weight: 700; display: block; }
.status-hint { font-size: 24rpx; opacity: 0.8; margin-top: 8rpx; display: block; }

.address-card, .items-card, .amount-card, .info-card {
  background: #fff; margin: 16rpx 24rpx; border-radius: 16rpx; padding: 24rpx;
}
.address-card { display: flex; }
.addr-icon { font-size: 36rpx; margin-right: 16rpx; }
.addr-contact { font-size: 28rpx; font-weight: 600; display: block; }
.addr-detail { font-size: 24rpx; color: #666; margin-top: 6rpx; display: block; }

.item { display: flex; padding: 16rpx 0; &:not(:last-child) { border-bottom: 1rpx solid #f5f5f5; } }
.item-img, .item-img-place { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #f8f8f8; }
.item-img-place { display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.item-info { flex: 1; margin-left: 20rpx; display: flex; flex-direction: column; justify-content: space-between; }
.item-name { font-size: 26rpx; color: #333; }
.item-price-row { display: flex; justify-content: space-between; }
.item-price { font-size: 28rpx; font-weight: 600; color: #ff6b35; }
.item-qty { font-size: 24rpx; color: #999; }

.amount-row { display: flex; justify-content: space-between; padding: 10rpx 0; font-size: 26rpx; color: #666; }
.amount-row.total { border-top: 1rpx solid #f5f5f5; margin-top: 8rpx; padding-top: 16rpx; }
.final { font-size: 32rpx; font-weight: 700; color: #ff6b35; }

.info-row { display: flex; justify-content: space-between; padding: 12rpx 0; font-size: 24rpx; color: #999; }
.bottom-actions { display: flex; justify-content: flex-end; padding: 24rpx; }
.act-btn {
  padding: 16rpx 48rpx; font-size: 28rpx; border-radius: 36rpx; border: 1rpx solid #ddd;
  background: #fff; color: #666;
  &.cancel { color: #999; }
  &.receive { background: #ff6b35; color: #fff; border-color: #ff6b35; }
}
</style>
