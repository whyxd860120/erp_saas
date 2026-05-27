<script setup lang="ts">
import {
  Odometer, Connection, Files, Guide, Setting, Document, QuestionFilled,
  Grid, ArrowDown, Menu, MoreFilled, List, Fold, Expand, Lock, SwitchButton,
  UserFilled, OfficeBuilding, User, Tools, Calendar, VideoPlay, Timer, DocumentCopy,
  CreditCard, Switch, Avatar, Goods, House, Wallet, ShoppingCart, Sell,
  Money, Box, CircleCheck, Search, Van, Postcard, Tickets,
  FolderOpened, Help, Edit, Delete, Plus, Check
} from '@element-plus/icons-vue'
import { computed } from 'vue'

const props = defineProps<{
  name: string
}>()

const iconMap: Record<string, any> = {
  Odometer, Connection, Files, Guide, Setting, Document, QuestionFilled,
  Grid, ArrowDown, Menu, MoreFilled, List, Fold, Expand, Lock, SwitchButton,
  UserFilled, OfficeBuilding, User, Tools, Calendar, VideoPlay, Timer, DocumentCopy,
  CreditCard, Switch, Avatar, Goods, House, Wallet, ShoppingCart, Sell,
  Money, Box, CircleCheck, Search, Van, Postcard, Tickets,
  FolderOpened, Help, Edit, Delete, Plus, Check,
  // 别名映射
  Package: Box,
  Transfer: Box
}

const iconComponent = computed(() => iconMap[props.name] || null)
</script>

<template>
  <template v-if="iconComponent">
    <component :is="iconComponent" class="menu-icon" />
  </template>
</template>

<style scoped>
.menu-icon {
  width: 1em;
  height: 1em;
  font-size: inherit;
}
</style>