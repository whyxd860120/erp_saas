<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => console.log('微信商城启动'))
onShow(() => console.log('商城显示'))
onHide(() => console.log('商城隐藏'))
</script>

<template>
  <view><view></view></view>
</template>

<style lang="scss">
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  color: #333;
  background-color: #f5f5f5;
  box-sizing: border-box;
}
view, text, image, scroll-view, input, button { box-sizing: border-box; }
</style>
