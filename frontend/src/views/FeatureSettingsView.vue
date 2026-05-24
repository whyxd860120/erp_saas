<template>
  <div class="feature-settings">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">功能开关</h2>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave" :loading="saving">保存设置</el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧内容 -->
      <el-col :xs="24" :lg="16">
        <!-- 功能模块 -->
        <el-card class="feature-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>功能模块</span>
              <el-tag type="info">{{ enabledCount }} / {{ totalCount }} 已启用</el-tag>
            </div>
          </template>

          <div class="feature-list">
            <!-- 多仓库管理 -->
            <div class="feature-item" :class="{ locked: !features.featureMultiWarehouse.available }">
              <div class="feature-header">
                <div class="feature-info">
                  <el-icon :size="24"><House /></el-icon>
                  <div class="feature-text">
                    <h4>多仓库管理</h4>
                    <p>支持多个仓库的库存管理，仓库间调拨功能</p>
                  </div>
                </div>
                <div class="feature-control">
                  <el-tag v-if="!features.featureMultiWarehouse.available" type="info" size="small">需升级</el-tag>
                  <el-switch
                    v-model="features.featureMultiWarehouse.enabled"
                    :disabled="!features.featureMultiWarehouse.available"
                    @change="handleFeatureToggle('featureMultiWarehouse')"
                  />
                </div>
              </div>
              <div v-if="features.featureMultiWarehouse.enabled" class="feature-settings">
                <el-form label-width="120px" size="small">
                  <el-form-item label="默认仓库">
                    <el-select v-model="featureSettings.defaultWarehouse" placeholder="选择默认仓库" style="width: 200px;">
                      <el-option label="仓库A" value="wh_a" />
                      <el-option label="仓库B" value="wh_b" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="自动库存预警">
                    <el-switch v-model="featureSettings.autoStockAlert" />
                  </el-form-item>
                </el-form>
              </div>
            </div>

            <!-- 多币种支持 -->
            <div class="feature-item" :class="{ locked: !features.featureMultiCurrency.available }">
              <div class="feature-header">
                <div class="feature-info">
                  <el-icon :size="24"><Coin /></el-icon>
                  <div class="feature-text">
                    <h4>多币种支持</h4>
                    <p>支持多种货币的采购、销售和财务管理</p>
                  </div>
                </div>
                <div class="feature-control">
                  <el-tag v-if="!features.featureMultiCurrency.available" type="info" size="small">需升级</el-tag>
                  <el-switch v-model="features.featureMultiCurrency.enabled" :disabled="!features.featureMultiCurrency.available" />
                </div>
              </div>
              <div v-if="features.featureMultiCurrency.enabled" class="feature-settings">
                <el-form label-width="120px" size="small">
                  <el-form-item label="默认货币">
                    <el-select v-model="featureSettings.defaultCurrency" placeholder="选择货币" style="width: 200px;">
                      <el-option label="人民币 (CNY)" value="CNY" />
                      <el-option label="美元 (USD)" value="USD" />
                      <el-option label="欧元 (EUR)" value="EUR" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="汇率自动更新">
                    <el-switch v-model="featureSettings.autoExchangeRate" />
                  </el-form-item>
                </el-form>
              </div>
            </div>

            <!-- 自定义字段 -->
            <div class="feature-item" :class="{ locked: !features.featureCustomFields.available }">
              <div class="feature-header">
                <div class="feature-info">
                  <el-icon :size="24"><Edit /></el-icon>
                  <div class="feature-text">
                    <h4>自定义字段</h4>
                    <p>为供应商、客户、物料等添加自定义属性</p>
                  </div>
                </div>
                <div class="feature-control">
                  <el-tag v-if="!features.featureCustomFields.available" type="info" size="small">需升级</el-tag>
                  <el-switch v-model="features.featureCustomFields.enabled" :disabled="!features.featureCustomFields.available" />
                </div>
              </div>
            </div>

            <!-- API访问 -->
            <div class="feature-item" :class="{ locked: !features.featureApiAccess.available }">
              <div class="feature-header">
                <div class="feature-info">
                  <el-icon :size="24"><Key /></el-icon>
                  <div class="feature-text">
                    <h4>API访问</h4>
                    <p>通过API接口集成第三方应用</p>
                  </div>
                </div>
                <div class="feature-control">
                  <el-tag v-if="!features.featureApiAccess.available" type="info" size="small">需升级</el-tag>
                  <el-switch v-model="features.featureApiAccess.enabled" :disabled="!features.featureApiAccess.available" />
                </div>
              </div>
            </div>

            <!-- Webhook -->
            <div class="feature-item" :class="{ locked: !features.featureWebhooks.available }">
              <div class="feature-header">
                <div class="feature-info">
                  <el-icon :size="24"><Connection /></el-icon>
                  <div class="feature-text">
                    <h4>Webhook支持</h4>
                    <p>配置事件通知，推送数据到指定URL</p>
                  </div>
                </div>
                <div class="feature-control">
                  <el-tag v-if="!features.featureWebhooks.available" type="info" size="small">需升级</el-tag>
                  <el-switch v-model="features.featureWebhooks.enabled" :disabled="!features.featureWebhooks.available" />
                </div>
              </div>
            </div>

            <!-- 审计日志 -->
            <div class="feature-item">
              <div class="feature-header">
                <div class="feature-info">
                  <el-icon :size="24"><Document /></el-icon>
                  <div class="feature-text">
                    <h4>审计日志</h4>
                    <p>记录所有操作日志，支持追溯和合规审计</p>
                  </div>
                </div>
                <div class="feature-control">
                  <el-tag type="success" size="small">基础功能</el-tag>
                  <el-switch v-model="features.featureAuditLogs.enabled" disabled />
                </div>
              </div>
              <div v-if="features.featureAuditLogs.enabled" class="feature-settings">
                <el-form label-width="120px" size="small">
                  <el-form-item label="日志保留天数">
                    <el-input-number v-model="featureSettings.logRetentionDays" :min="30" :max="365" />
                    <span class="form-tip">建议保留90天以上</span>
                  </el-form-item>
                  <el-form-item label="记录IP">
                    <el-switch v-model="featureSettings.logIpAddress" />
                  </el-form-item>
                  <el-form-item label="记录User-Agent">
                    <el-switch v-model="featureSettings.logUserAgent" />
                  </el-form-item>
                </el-form>
              </div>
            </div>

            <!-- 数据分析 -->
            <div class="feature-item" :class="{ locked: !features.featureAnalytics.available }">
              <div class="feature-header">
                <div class="feature-info">
                  <el-icon :size="24"><DataLine /></el-icon>
                  <div class="feature-text">
                    <h4>数据分析</h4>
                    <p>销售报表、库存分析、经营数据可视化</p>
                  </div>
                </div>
                <div class="feature-control">
                  <el-tag v-if="!features.featureAnalytics.available" type="info" size="small">需升级</el-tag>
                  <el-switch v-model="features.featureAnalytics.enabled" :disabled="!features.featureAnalytics.available" />
                </div>
              </div>
              <div v-if="features.featureAnalytics.enabled" class="feature-settings">
                <el-form label-width="120px" size="small">
                  <el-form-item label="数据刷新频率">
                    <el-select v-model="featureSettings.analyticsRefreshRate" style="width: 200px;">
                      <el-option label="实时" value="realtime" />
                      <el-option label="每小时" value="hourly" />
                      <el-option label="每日" value="daily" />
                    </el-select>
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 高级功能 -->
        <el-card class="feature-card advanced" shadow="never">
          <template #header>
            <div class="card-header">
              <span>高级功能</span>
              <el-tag type="warning">企业版</el-tag>
            </div>
          </template>

          <div class="feature-list">
            <div class="feature-item locked">
              <div class="feature-header">
                <div class="feature-info">
                  <el-icon :size="24"><Bell /></el-icon>
                  <div class="feature-text">
                    <h4>智能提醒</h4>
                    <p>智能库存预警、采购建议、销售预测</p>
                  </div>
                </div>
                <div class="feature-control">
                  <el-tag type="warning" size="small">企业版</el-tag>
                  <el-button size="small" @click="handleUpgrade">升级解锁</el-button>
                </div>
              </div>
            </div>

            <div class="feature-item locked">
              <div class="feature-header">
                <div class="feature-info">
                  <el-icon :size="24"><Operation /></el-icon>
                  <div class="feature-text">
                    <h4>自动化工作流</h4>
                    <p>自定义业务流程自动化，减少人工操作</p>
                  </div>
                </div>
                <div class="feature-control">
                  <el-tag type="warning" size="small">企业版</el-tag>
                  <el-button size="small" @click="handleUpgrade">升级解锁</el-button>
                </div>
              </div>
            </div>

            <div class="feature-item locked">
              <div class="feature-header">
                <div class="feature-info">
                  <el-icon :size="24"><Share /></el-icon>
                  <div class="feature-text">
                    <h4>多语言支持</h4>
                    <p>支持多语言界面，满足国际化需求</p>
                  </div>
                </div>
                <div class="feature-control">
                  <el-tag type="warning" size="small">企业版</el-tag>
                  <el-button size="small" @click="handleUpgrade">升级解锁</el-button>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧信息 -->
      <el-col :xs="24" :lg="8">
        <!-- 当前计划 -->
        <el-card class="plan-card" shadow="never">
          <template #header>
            <span>当前计划</span>
          </template>
          <div class="current-plan">
            <div class="plan-badge">专业版</div>
            <p class="plan-desc">您正在使用专业版，已解锁以下功能：</p>
            <ul class="plan-features">
              <li>多仓库管理</li>
              <li>Webhook支持</li>
              <li>API访问</li>
              <li>自定义字段</li>
              <li>数据分析</li>
            </ul>
            <el-button type="primary" @click="router.push('/subscription')" style="width: 100%;">
              查看套餐详情
            </el-button>
          </div>
        </el-card>

        <!-- 使用提示 -->
        <el-card class="tips-card" shadow="never">
          <template #header>
            <span>使用提示</span>
          </template>
          <div class="tips-list">
            <div class="tip-item">
              <el-icon color="#E6A23C"><WarningFilled /></el-icon>
              <span>禁用功能前请确认是否有数据依赖</span>
            </div>
            <div class="tip-item">
              <el-icon color="#409EFF"><InfoFilled /></el-icon>
              <span>功能设置变更后会在下次登录生效</span>
            </div>
            <div class="tip-item">
              <el-icon color="#67C23A"><CircleCheckFilled /></el-icon>
              <span>基础功能无法禁用，确保系统正常运行</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  House,
  Coin,
  Edit,
  Key,
  Connection,
  Document,
  DataLine,
  Bell,
  Operation,
  Share,
  WarningFilled,
  InfoFilled,
  CircleCheckFilled
} from '@element-plus/icons-vue'
import tenantSettingApi from '@/api/tenant-setting'

const router = useRouter()
const saving = ref(false)

interface FeatureConfig {
  available: boolean
  enabled: boolean
}

const features = reactive<Record<string, FeatureConfig>>({
  featureMultiWarehouse: { available: true, enabled: true },
  featureMultiCurrency: { available: false, enabled: false },
  featureCustomFields: { available: false, enabled: false },
  featureApiAccess: { available: true, enabled: true },
  featureWebhooks: { available: true, enabled: true },
  featureAuditLogs: { available: true, enabled: true },
  featureAnalytics: { available: false, enabled: false }
})

const featureSettings = reactive({
  defaultWarehouse: 'wh_a',
  autoStockAlert: true,
  defaultCurrency: 'CNY',
  autoExchangeRate: false,
  logRetentionDays: 90,
  logIpAddress: true,
  logUserAgent: true,
  analyticsRefreshRate: 'daily'
})

const enabledCount = computed(() => {
  return Object.values(features).filter(f => f.enabled).length
})

const totalCount = computed(() => {
  return Object.keys(features).length
})

const handleFeatureToggle = (key: string) => {
  const feature = features[key]
  if (feature.enabled) {
    ElMessage.success(`${getFeatureName(key)}已启用`)
  } else {
    ElMessage.warning(`${getFeatureName(key)}已禁用`)
  }
}

const getFeatureName = (key: string) => {
  const map: Record<string, string> = {
    featureMultiWarehouse: '多仓库管理',
    featureMultiCurrency: '多币种支持',
    featureCustomFields: '自定义字段',
    featureApiAccess: 'API访问',
    featureWebhooks: 'Webhook支持',
    featureAuditLogs: '审计日志',
    featureAnalytics: '数据分析'
  }
  return map[key] || key
}

const handleSave = async () => {
  try {
    saving.value = true
    await tenantSettingApi.updateTenant({
      featureMultiWarehouse: features.featureMultiWarehouse.enabled,
      featureMultiCurrency: features.featureMultiCurrency.enabled,
      featureCustomFields: features.featureCustomFields.enabled,
      featureApiAccess: features.featureApiAccess.enabled,
      featureWebhooks: features.featureWebhooks.enabled,
      featureAuditLogs: features.featureAuditLogs.enabled,
      featureAnalytics: features.featureAnalytics.enabled
    })
    ElMessage.success('功能设置已保存')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleUpgrade = () => {
  router.push('/subscription')
}
</script>

<style scoped>
.feature-settings .page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.feature-settings .page-header .header-left .page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.feature-settings .feature-card {
  margin-bottom: 20px;
}
.feature-settings .feature-card .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.feature-settings .feature-card .feature-list .feature-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 16px 0;
}
.feature-settings .feature-card .feature-list .feature-item:last-child {
  border-bottom: none;
}
.feature-settings .feature-card .feature-list .feature-item.locked {
  opacity: 0.7;
  background: #fafafa;
  margin: 0 -20px;
  padding: 16px 20px;
  border-radius: 8px;
}
.feature-settings .feature-card .feature-list .feature-item .feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.feature-settings .feature-card .feature-list .feature-item .feature-header .feature-info {
  display: flex;
  align-items: center;
  gap: 16px;
}
.feature-settings .feature-card .feature-list .feature-item .feature-header .feature-info .el-icon {
  color: #409EFF;
}
.feature-settings .feature-card .feature-list .feature-item .feature-header .feature-info .feature-text h4 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 500;
}
.feature-settings .feature-card .feature-list .feature-item .feature-header .feature-info .feature-text p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
.feature-settings .feature-card .feature-list .feature-item .feature-header .feature-control {
  display: flex;
  align-items: center;
  gap: 12px;
}
.feature-settings .feature-card .feature-list .feature-item .feature-settings {
  margin-top: 16px;
  padding-left: 40px;
  padding-top: 16px;
  border-top: 1px dashed #e8e8e8;
}
.feature-settings .feature-card .feature-list .feature-item .feature-settings .form-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
.feature-settings .feature-card.advanced {
  border: 1px dashed #E6A23C;
}
.feature-settings .plan-card .current-plan {
  text-align: center;
}
.feature-settings .plan-card .current-plan .plan-badge {
  display: inline-block;
  padding: 4px 20px;
  background: #E6A23C;
  color: #fff;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
}
.feature-settings .plan-card .current-plan .plan-desc {
  color: #909399;
  font-size: 13px;
  margin: 12px 0;
}
.feature-settings .plan-card .current-plan .plan-features {
  text-align: left;
  padding-left: 20px;
  margin-bottom: 16px;
}
.feature-settings .plan-card .current-plan .plan-features li {
  padding: 4px 0;
  color: #606266;
  font-size: 14px;
}
.feature-settings .tips-card {
  margin-top: 20px;
}
.feature-settings .tips-card .tips-list .tip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 13px;
  color: #606266;
}
</style>