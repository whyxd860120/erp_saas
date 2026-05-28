<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`${moduleName}帮助`"
    width="800px"
    :close-on-click-modal="false"
  >
    <div class="help-content">
      <div v-if="helpData.operations?.length" class="help-section">
        <h3>📋 操作方法</h3>
        <div class="operation-list">
          <div v-for="(operation, index) in helpData.operations" :key="index" class="operation-item">
            <div class="operation-title">{{ operation.title }}</div>
            <div class="operation-steps">
              <div v-for="(step, stepIndex) in operation.steps" :key="stepIndex" class="step-item">
                <span class="step-number">{{ stepIndex + 1 }}</span>
                <span class="step-text">{{ step }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="helpData.notices?.length" class="help-section">
        <h3>⚠️ 注意事项</h3>
        <div class="notice-list">
          <div v-for="(notice, index) in helpData.notices" :key="index" class="notice-item">
            <el-icon class="notice-icon"><Warning /></el-icon>
            <span>{{ notice }}</span>
          </div>
        </div>
      </div>

      <div v-if="helpData.tips?.length" class="help-section">
        <h3>💡 使用技巧</h3>
        <div class="tip-list">
          <div v-for="(tip, index) in helpData.tips" :key="index" class="tip-item">
            <el-icon class="tip-icon"><InfoFilled /></el-icon>
            <span>{{ tip }}</span>
          </div>
        </div>
      </div>

      <div v-if="helpData.shortcuts?.length" class="help-section">
        <h3>⌨️ 快捷键</h3>
        <div class="shortcut-list">
          <div v-for="(shortcut, index) in helpData.shortcuts" :key="index" class="shortcut-item">
            <kbd class="shortcut-key">{{ shortcut.key }}</kbd>
            <span class="shortcut-desc">{{ shortcut.description }}</span>
          </div>
        </div>
      </div>

      <div v-if="helpData.version" class="help-section version-info">
        <h3>📝 版本信息</h3>
        <div class="version-details">
          <div class="version-item">
            <span class="version-label">当前版本:</span>
            <span class="version-value">{{ helpData.version }}</span>
          </div>
          <div v-if="helpData.lastUpdate" class="version-item">
            <span class="version-label">最后更新:</span>
            <span class="version-value">{{ helpData.lastUpdate }}</span>
          </div>
          <div v-if="helpData.changes?.length" class="version-item">
            <span class="version-label">最近更新:</span>
            <div class="version-changes">
              <div v-for="(change, index) in helpData.changes" :key="index" class="change-item">
                • {{ change }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="dialogVisible = false">知道了</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Warning, InfoFilled } from '@element-plus/icons-vue'

interface HelpData {
  operations?: Array<{
    title: string
    steps: string[]
  }>
  notices?: string[]
  tips?: string[]
  shortcuts?: Array<{
    key: string
    description: string
  }>
  version?: string
  lastUpdate?: string
  changes?: string[]
}

const props = defineProps<{
  modelValue: boolean
  moduleName: string
  helpData: HelpData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<style scoped>
.help-content {
  max-height: 600px;
  overflow-y: auto;
  padding: 10px;
}

.help-section {
  margin-bottom: 24px;
}

.help-section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  border-bottom: 2px solid #409eff;
  padding-bottom: 8px;
}

.operation-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.operation-item {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.operation-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  font-size: 14px;
}

.operation-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-text {
  color: #606266;
  line-height: 1.6;
  font-size: 13px;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #fef0f0;
  border-radius: 6px;
  border-left: 3px solid #f56c6c;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.notice-icon {
  color: #f56c6c;
  flex-shrink: 0;
  margin-top: 2px;
}

.tip-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.tip-icon {
  color: #409eff;
  flex-shrink: 0;
  margin-top: 2px;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 6px;
}

.shortcut-key {
  display: inline-block;
  padding: 4px 8px;
  background: #e4e7ed;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  min-width: 60px;
  text-align: center;
}

.shortcut-desc {
  color: #606266;
  font-size: 13px;
}

.version-info {
  background: #f9fafc;
  padding: 16px;
  border-radius: 8px;
}

.version-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.version-label {
  font-weight: 600;
  color: #303133;
  min-width: 80px;
  font-size: 13px;
}

.version-value {
  color: #606266;
  font-size: 13px;
}

.version-changes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.change-item {
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  padding-left: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .help-content {
    max-height: 400px;
  }
  
  .operation-item,
  .notice-item,
  .tip-item {
    padding: 12px;
  }
}
</style>