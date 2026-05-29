<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { http, type ApiResponse } from '@/utils/http'

const isEdit = ref(false)
const id = ref('')
const form = ref({ name: '', mobile: '', province: '', city: '', district: '', detail: '', isDefault: false })

const API = '/api/v1/shop'

onLoad(async (options) => {
  if (options?.id) {
    isEdit.value = true
    id.value = options.id
    const res = await http.get<ApiResponse<any>>(`${API}/addresses`)
    if (res.success) {
      const addr = res.data.find((a: any) => a.id === id.value)
      if (addr) {
        form.value = {
          name: addr.name, mobile: addr.mobile, province: addr.province,
          city: addr.city, district: addr.district || '',
          detail: addr.detail, isDefault: addr.isDefault,
        }
      }
    }
  }
})

async function submit() {
  const f = form.value
  if (!f.name || !f.mobile || !f.province || !f.city || !f.detail) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  if (isEdit.value) {
    await http.put(`${API}/addresses/${id.value}`, f)
  } else {
    await http.post(`${API}/addresses`, f)
  }
  uni.showToast({ title: '保存成功', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 500)
}
</script>

<template>
  <view class="edit-page">
    <view class="form-group">
      <view class="form-item">
        <text class="label">收货人</text>
        <input v-model="form.name" class="input" placeholder="请输入收货人姓名" />
      </view>
      <view class="form-item">
        <text class="label">手机号</text>
        <input v-model="form.mobile" class="input" type="number" maxlength="11" placeholder="请输入手机号" />
      </view>
      <view class="form-item">
        <text class="label">省份</text>
        <input v-model="form.province" class="input" placeholder="省份" />
      </view>
      <view class="form-item">
        <text class="label">城市</text>
        <input v-model="form.city" class="input" placeholder="城市" />
      </view>
      <view class="form-item">
        <text class="label">区县</text>
        <input v-model="form.district" class="input" placeholder="区/县" />
      </view>
      <view class="form-item">
        <text class="label">详细地址</text>
        <input v-model="form.detail" class="input" placeholder="街道/门牌号" />
      </view>
      <view class="form-item">
        <text class="label">默认地址</text>
        <switch :checked="form.isDefault" @change="(e: any) => form.isDefault = e.detail.value" color="#ff6b35" />
      </view>
    </view>

    <view class="btn-wrap">
      <button class="save-btn" @tap="submit">保存</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.edit-page { min-height: 100vh; background: #f5f5f5; }
.form-group { background: #fff; margin: 16rpx 0; }
.form-item {
  display: flex; align-items: center; padding: 24rpx; border-bottom: 1rpx solid #f5f5f5;
}
.label { width: 140rpx; font-size: 28rpx; color: #333; }
.input { flex: 1; font-size: 28rpx; }
.btn-wrap { padding: 40rpx 24rpx; }
.save-btn {
  width: 100%; height: 88rpx; line-height: 88rpx; background: linear-gradient(135deg, #ff6b35, #ff3d00);
  color: #fff; font-size: 30rpx; font-weight: 600; border-radius: 16rpx; text-align: center; border: none;
}
</style>
