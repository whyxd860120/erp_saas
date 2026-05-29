<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { http, type ApiResponse } from '@/utils/http'

const addresses = ref<any[]>([])
const API = '/api/v1/shop'

async function fetchAddresses() {
  const res = await http.get<ApiResponse<any[]>>(`${API}/addresses`)
  if (res.success) addresses.value = res.data
}
onShow(() => fetchAddresses())

function goEdit(id?: string) {
  uni.navigateTo({ url: `/pages/mine/address-edit${id ? '?id=' + id : ''}` })
}
async function deleteAddress(addr: any) {
  const r = await new Promise<boolean>(resolve => {
    uni.showModal({ title: '提示', content: '确定要删除吗？', success: (x) => resolve(x.confirm) })
  })
  if (!r) return
  await http.delete(`${API}/addresses/${addr.id}`)
  fetchAddresses()
}
</script>

<template>
  <view class="address-page">
    <view v-if="addresses.length === 0" class="empty">
      <text class="empty-icon">📍</text>
      <text class="empty-text">暂无收货地址</text>
    </view>
    <view v-for="addr in addresses" :key="addr.id" class="addr-card">
      <view class="addr-info" @tap="goEdit(addr.id)">
        <text class="addr-contact">{{ addr.name }} {{ addr.mobile }}</text>
        <text class="addr-detail">{{ addr.province }}{{ addr.city }}{{ addr.district }} {{ addr.detail }}</text>
        <text v-if="addr.isDefault" class="default-tag">默认</text>
      </view>
      <view class="addr-actions">
        <text class="act" @tap="goEdit(addr.id)">编辑</text>
        <text class="act delete" @tap="deleteAddress(addr)">删除</text>
      </view>
    </view>

    <view class="add-btn-wrap">
      <button class="add-btn" @tap="goEdit()">+ 新增收货地址</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.address-page { min-height: 100vh; background: #f5f5f5; padding: 16rpx 0; }
.addr-card {
  background: #fff; margin: 16rpx 24rpx; border-radius: 16rpx; padding: 24rpx;
}
.addr-contact { font-size: 28rpx; font-weight: 600; display: block; }
.addr-detail { font-size: 24rpx; color: #666; margin-top: 6rpx; display: block; }
.default-tag {
  display: inline-block; font-size: 20rpx; color: #ff6b35; border: 1rpx solid #ff6b35;
  padding: 2rpx 12rpx; border-radius: 4rpx; margin-top: 8rpx;
}
.addr-actions { display: flex; justify-content: flex-end; margin-top: 16rpx; }
.act { font-size: 24rpx; color: #666; margin-left: 32rpx; }
.act.delete { color: #ff4d4f; }

.add-btn-wrap { padding: 40rpx 24rpx; }
.add-btn {
  width: 100%; height: 88rpx; line-height: 88rpx; background: linear-gradient(135deg, #ff6b35, #ff3d00);
  color: #fff; font-size: 30rpx; font-weight: 600; border-radius: 16rpx; text-align: center; border: none;
}

.empty { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; }
.empty-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.empty-text { font-size: 28rpx; color: #999; }
</style>
