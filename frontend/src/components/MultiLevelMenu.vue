<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import IconResolver from './IconResolver.vue'

interface MenuItem {
  title: string
  icon: string
  index?: string
  children?: MenuItem[]
  requiresAdmin?: boolean
  requiresSuperAdmin?: boolean
  requiresInitComplete?: boolean
}

const props = defineProps<{
  menuItems: MenuItem[]
  activePath: string
  mode: 'vertical' | 'horizontal'
}>()

const router = useRouter()
const hoveredItem = ref<string | null>(null)
const hoveredSubItem = ref<string | null>(null)

const handleMenuClick = (item: MenuItem) => {
  if (item.index && !item.children) {
    router.push(item.index)
  }
}

const handleSubMenuHover = (title: string | null) => {
  hoveredItem.value = title
}

const handleThirdLevelHover = (title: string | null) => {
  hoveredSubItem.value = title
}

const isActive = (item: MenuItem): boolean => {
  if (item.index === props.activePath) return true
  if (item.children) {
    return item.children.some(child => child.index === props.activePath)
  }
  return false
}
</script>

<template>
  <div class="multi-level-menu" :class="`mode-${mode}`">
    <!-- 一级菜单 -->
    <div class="level-1">
      <div
        v-for="item in menuItems"
        :key="item.title"
        class="menu-item"
        :class="{ 
          'has-children': item.children,
          'is-active': isActive(item)
        }"
        @click="handleMenuClick(item)"
        @mouseenter="handleSubMenuHover(item.title)"
        @mouseleave="handleSubMenuHover(null)"
      >
        <IconResolver :name="item.icon" />
        <span class="menu-title">{{ item.title }}</span>
        <span v-if="item.children" class="arrow">›</span>
        
        <!-- 二级菜单 - 垂直模式在右侧，水平模式在下拉 -->
        <div
          v-if="item.children && hoveredItem === item.title"
          class="level-2"
          :class="{ 'popup-right': mode === 'vertical', 'popup-down': mode === 'horizontal' }"
          @mouseenter="handleSubMenuHover(item.title)"
          @mouseleave="handleSubMenuHover(null)"
        >
          <div
            v-for="subItem in item.children"
            :key="subItem.title"
            class="sub-menu-item"
            :class="{ 
              'has-children': subItem.children,
              'is-active': isActive(subItem)
            }"
            @click.stop="handleMenuClick(subItem)"
            @mouseenter="handleThirdLevelHover(subItem.title)"
            @mouseleave="handleThirdLevelHover(null)"
          >
            <IconResolver :name="subItem.icon" />
            <span class="menu-title">{{ subItem.title }}</span>
            <span v-if="subItem.children" class="arrow">›</span>
            
            <!-- 三级菜单 - 始终在右侧弹出 -->
            <div
              v-if="subItem.children && hoveredSubItem === subItem.title"
              class="level-3"
              @mouseenter="handleThirdLevelHover(subItem.title)"
              @mouseleave="handleThirdLevelHover(null)"
            >
              <div
                v-for="thirdItem in subItem.children"
                :key="thirdItem.title"
                class="third-menu-item"
                :class="{ 'is-active': thirdItem.index === activePath }"
                @click.stop="handleMenuClick(thirdItem)"
              >
                <IconResolver :name="thirdItem.icon" />
                <span class="menu-title">{{ thirdItem.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.multi-level-menu {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 100;
}

/* 垂直模式 - 左侧菜单 */
.mode-vertical .level-1 {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.mode-vertical .menu-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  font-size: 13px;
  border-radius: 6px;
  margin: 2px 12px;
}

.mode-vertical .menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.mode-vertical .menu-item.is-active {
  background: linear-gradient(90deg, rgba(0, 210, 255, 0.15) 0%, rgba(58, 123, 213, 0.1) 100%);
  color: #00d2ff;
}

.mode-vertical .menu-item .menu-icon {
  font-size: 16px;
  margin-right: 10px;
  width: 16px;
  height: 16px;
}

.mode-vertical .menu-title {
  flex: 1;
}

.mode-vertical .arrow {
  font-size: 14px;
  opacity: 0.6;
}

/* 二级菜单 - 右侧弹出 */
.mode-vertical .level-2.popup-right {
  position: absolute;
  left: calc(100% + 12px);
  top: 0;
  min-width: 180px;
  background: rgba(26, 31, 53, 0.98);
  border-radius: 8px;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 0;
  z-index: 9999;
}

.mode-vertical .sub-menu-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  font-size: 13px;
}

.mode-vertical .sub-menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.mode-vertical .sub-menu-item.is-active {
  background: rgba(0, 210, 255, 0.12);
  color: #00d2ff;
}

/* 三级菜单 - 右侧弹出 */
.mode-vertical .level-3 {
  position: absolute;
  left: calc(100% + 4px);
  top: 0;
  min-width: 180px;
  background: rgba(26, 31, 53, 0.98);
  border-radius: 8px;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 0;
  z-index: 10000;
}

.mode-vertical .third-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.mode-vertical .third-menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #00d2ff;
}

.mode-vertical .third-menu-item.is-active {
  color: #00d2ff;
  background: rgba(0, 210, 255, 0.1);
}

/* 水平模式 - 顶部菜单 */
.mode-horizontal .level-1 {
  display: flex;
  flex-direction: row;
  height: 100%;
}

.mode-horizontal .menu-item {
  display: flex;
  align-items: center;
  padding: 0 20px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  font-size: 14px;
  height: 60px;
}

.mode-horizontal .menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.mode-horizontal .menu-item.is-active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.mode-horizontal .menu-item .menu-icon {
  font-size: 16px;
  margin-right: 8px;
}

.mode-horizontal .arrow {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.7;
}

/* 二级菜单 - 下拉弹出 */
.mode-horizontal .level-2.popup-down {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background: rgba(26, 31, 53, 0.98);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 0;
  z-index: 1000;
}

.mode-horizontal .sub-menu-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  font-size: 13px;
}

.mode-horizontal .sub-menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.mode-horizontal .sub-menu-item.is-active {
  background: rgba(0, 210, 255, 0.12);
  color: #00d2ff;
}

/* 三级菜单 - 右侧弹出 */
.mode-horizontal .level-3 {
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 180px;
  background: rgba(26, 31, 53, 0.98);
  border-radius: 8px;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 0;
  z-index: 1001;
}

.mode-horizontal .third-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.mode-horizontal .third-menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #00d2ff;
}

.mode-horizontal .third-menu-item.is-active {
  color: #00d2ff;
  background: rgba(0, 210, 255, 0.1);
}
</style>
