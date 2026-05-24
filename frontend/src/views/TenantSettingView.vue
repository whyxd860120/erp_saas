<template>
  <div class="tenant-settings">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">租户信息</h2>
        <el-tag :type="getStatusType(form.status)" size="small">{{ getStatusName(form.status) }}</el-tag>
      </div>
      <div class="header-right">
        <el-button @click="handleExport">导出配置</el-button>
        <el-button type="primary" @click="handleSave" :loading="loading">保存更改</el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧菜单 -->
      <el-col :xs="24" :sm="6" :md="5" :lg="4">
        <el-card class="settings-nav" shadow="never">
          <div
            v-for="(item, index) in settingTabs"
            :key="index"
            :class="['nav-item', { active: activeTab === index }]"
            @click="activeTab = index"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <div class="nav-text">
              <span class="nav-title">{{ item.title }}</span>
              <span class="nav-desc">{{ item.desc }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧内容 -->
      <el-col :xs="24" :sm="18" :md="19" :lg="20">
        <!-- 基本信息 -->
        <el-card v-show="activeTab === 0" class="settings-content">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
            </div>
          </template>
          <el-form :model="form" ref="basicFormRef" :rules="basicRules" label-width="120px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="机构名称" prop="name">
                  <el-input v-model="form.name" disabled placeholder="机构名称（不可修改）" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="显示名称" prop="displayName">
                  <el-input v-model="form.displayName" placeholder="对外显示的名称" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="机构描述" prop="description">
              <el-input v-model="form.description" type="textarea" :rows="3" placeholder="简单描述您的机构" />
            </el-form-item>
            <el-form-item label="Logo" prop="logoUrl">
              <div class="logo-upload">
                <el-avatar v-if="form.logoUrl" :src="form.logoUrl" :size="80" />
                <el-avatar v-else :size="80" icon="OfficeBuilding" />
                <div class="upload-action">
                  <el-button size="small" @click="handleUploadLogo">上传Logo</el-button>
                  <el-input v-model="form.logoUrl" placeholder="或输入Logo URL" style="margin-top: 8px;" />
                </div>
              </div>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 联系信息 -->
        <el-card v-show="activeTab === 1" class="settings-content">
          <template #header>
            <div class="card-header">
              <span>联系信息</span>
            </div>
          </template>
          <el-form :model="form" label-width="120px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="联系邮箱" prop="email">
                  <el-input v-model="form.email" placeholder="contact@example.com" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系电话" prop="phone">
                  <el-input v-model="form.phone" placeholder="+86 xxx xxxx xxxx" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="机构地址" prop="address">
              <el-input v-model="form.address" placeholder="详细地址" />
            </el-form-item>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="税号" prop="taxNo">
                  <el-input v-model="form.taxNo" placeholder="纳税人识别号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="官方网站" prop="website">
                  <el-input v-model="form.website" placeholder="https://example.com" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>

        <!-- 本地化设置 -->
        <el-card v-show="activeTab === 2" class="settings-content">
          <template #header>
            <div class="card-header">
              <span>本地化设置</span>
            </div>
          </template>
          <el-form :model="form" label-width="140px">
            <el-form-item label="时区">
              <el-select v-model="form.timezone" placeholder="选择时区" style="width: 100%;">
                <el-option label="中国标准时间 (UTC+8)" value="Asia/Shanghai" />
                <el-option label="东京时间 (UTC+9)" value="Asia/Tokyo" />
                <el-option label="美东时间 (UTC-5)" value="America/New_York" />
                <el-option label="美西时间 (UTC-8)" value="America/Los_Angeles" />
                <el-option label="伦敦时间 (UTC+0)" value="Europe/London" />
                <el-option label="巴黎时间 (UTC+1)" value="Europe/Paris" />
              </el-select>
            </el-form-item>
            <el-form-item label="语言">
              <el-select v-model="form.locale" placeholder="选择语言" style="width: 100%;">
                <el-option label="简体中文" value="zh-CN" />
                <el-option label="繁体中文" value="zh-TW" />
                <el-option label="English" value="en-US" />
                <el-option label="日本語" value="ja-JP" />
              </el-select>
            </el-form-item>
            <el-form-item label="默认货币">
              <el-select v-model="form.currency" placeholder="选择货币" style="width: 100%;">
                <el-option label="CNY - 人民币 (¥)" value="CNY" />
                <el-option label="USD - 美元 ($)" value="USD" />
                <el-option label="EUR - 欧元 (€)" value="EUR" />
                <el-option label="GBP - 英镑 (£)" value="GBP" />
                <el-option label="JPY - 日元 (¥)" value="JPY" />
                <el-option label="HKD - 港币 (HK$)" value="HKD" />
              </el-select>
            </el-form-item>
            <el-form-item label="日期格式">
              <el-select v-model="form.dateFormat" placeholder="选择日期格式" style="width: 100%;">
                <el-option label="YYYY-MM-DD (2024-05-21)" value="YYYY-MM-DD" />
                <el-option label="DD/MM/YYYY (21/05/2024)" value="DD/MM/YYYY" />
                <el-option label="MM/DD/YYYY (05/21/2024)" value="MM/DD/YYYY" />
              </el-select>
            </el-form-item>
            <el-form-item label="数字格式">
              <el-select v-model="form.numberFormat" placeholder="选择数字格式" style="width: 100%;">
                <el-option label="1,234.56 (美国)" value="en-US" />
                <el-option label="1.234,56 (欧洲)" value="de-DE" />
                <el-option label="1 234,56 (法国)" value="fr-FR" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 品牌设置 -->
        <el-card v-show="activeTab === 3" class="settings-content">
          <template #header>
            <div class="card-header">
              <span>品牌设置</span>
              <el-tag type="warning" size="small">高级功能</el-tag>
            </div>
          </template>
          <el-form :model="form" label-width="120px">
            <el-form-item label="登录页Logo">
              <div class="logo-preview">
                <el-avatar v-if="form.logoUrl" :src="form.logoUrl" :size="64" />
                <el-avatar v-else :size="64" icon="Picture" />
                <el-input v-model="form.logoUrl" placeholder="Logo URL" style="margin-left: 16px; flex: 1;" />
              </div>
            </el-form-item>
            <el-form-item label="网站图标">
              <el-input v-model="form.faviconUrl" placeholder="Favicon URL (16x16 或 32x32)" />
            </el-form-item>
            <el-form-item label="主题颜色">
              <div class="color-picker">
                <el-color-picker v-model="form.primaryColor" />
                <el-input v-model="form.primaryColor" style="width: 120px; margin-left: 12px;" />
              </div>
            </el-form-item>
            <el-form-item label="自定义CSS">
              <el-input
                v-model="form.customCss"
                type="textarea"
                :rows="8"
                placeholder="/* 自定义CSS样式 */&#10;.custom-class {&#10;  color: red;&#10;}"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 订阅信息 -->
        <el-card v-show="activeTab === 4" class="settings-content">
          <template #header>
            <div class="card-header">
              <span>当前订阅</span>
            </div>
          </template>
          <div class="subscription-overview">
            <div class="current-plan">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="当前计划">
                  <el-tag :type="getPlanType(form.plan)" size="large">
                    {{ getPlanName(form.plan) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag :type="getStatusType(form.status)" size="large">
                    {{ getStatusName(form.status) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="用户配额">
                  <span>{{ currentUsage.quotaUsers || 0 }} / {{ form.quotaUsers }}</span>
                  <el-progress
                    :percentage="getUsagePercent(currentUsage.quotaUsers, form.quotaUsers)"
                    :stroke-width="8"
                    style="width: 200px; margin-left: 12px;"
                  />
                </el-descriptions-item>
                <el-descriptions-item label="存储配额">
                  <span>{{ formatStorage(currentUsage.quotaStorage) }} / {{ formatStorage(form.quotaStorage) }}</span>
                  <el-progress
                    :percentage="getUsagePercent(currentUsage.quotaStorage, form.quotaStorage)"
                    :stroke-width="8"
                    style="width: 200px; margin-left: 12px;"
                  />
                </el-descriptions-item>
                <el-descriptions-item label="试用到期">
                  {{ form.trialEndsAt ? new Date(form.trialEndsAt).toLocaleDateString() : '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="账单周期结束">
                  {{ form.currentPeriodEndsAt ? new Date(form.currentPeriodEndsAt).toLocaleDateString() : '-' }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
            <div class="quick-actions">
              <el-button type="primary" @click="router.push('/subscription')">升级套餐</el-button>
              <el-button @click="handleViewInvoices">查看账单</el-button>
              <el-button @click="handleExportData">导出数据</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { OfficeBuilding, Picture } from '@element-plus/icons-vue'
import tenantSettingApi, { type Tenant } from '@/api/tenant-setting'

const router = useRouter()
const basicFormRef = ref<FormInstance>()
const loading = ref(false)
const activeTab = ref(0)

interface UsageStats {
  quotaUsers: number
  quotaStorage: number
  quotaApiCalls: number
}

const currentUsage = reactive<UsageStats>({
  quotaUsers: 0,
  quotaStorage: 0,
  quotaApiCalls: 0
})

const form = ref<Tenant & {
  dateFormat?: string
  numberFormat?: string
  primaryColor?: string
  customCss?: string
}>({
  id: '',
  name: '',
  slug: '',
  displayName: '',
  description: '',
  logoUrl: '',
  faviconUrl: '',
  email: '',
  phone: '',
  address: '',
  taxNo: '',
  website: '',
  timezone: 'Asia/Shanghai',
  locale: 'zh-CN',
  currency: 'CNY',
  dateFormat: 'YYYY-MM-DD',
  numberFormat: 'en-US',
  primaryColor: '#409EFF',
  customCss: '',
  plan: 'free',
  status: 'active',
  featureMultiWarehouse: true,
  featureMultiCurrency: false,
  featureCustomFields: false,
  featureApiAccess: false,
  featureWebhooks: false,
  featureAuditLogs: true,
  featureAnalytics: false,
  quotaUsers: 5,
  quotaStorage: 1000,
  quotaApiCalls: 1000
})

const settingTabs = [
  { title: '基本信息', icon: 'User', desc: '机构名称和Logo' },
  { title: '联系信息', icon: 'Message', desc: '联系方式' },
  { title: '本地化', icon: 'MapLocation', desc: '时区、语言、货币' },
  { title: '品牌设置', icon: 'Palette', desc: '自定义主题' },
  { title: '套餐信息', icon: 'Coin', desc: '当前订阅状态' }
]

const basicRules: FormRules = {
  displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }]
}

const fetchTenant = async () => {
  try {
    const res = await tenantSettingApi.getCurrentTenant()
    if (res.success) {
      const data = res.data
      form.value = {
        ...form.value,
        ...data,
        dateFormat: data.dateFormat || 'YYYY-MM-DD',
        numberFormat: data.numberFormat || 'en-US',
        primaryColor: data.primaryColor || '#409EFF',
        customCss: data.customCss || ''
      }
      // 模拟实际使用量
      currentUsage.quotaUsers = Math.floor(Math.random() * 3) + 1
      currentUsage.quotaStorage = Math.floor(Math.random() * 500) + 100
      currentUsage.quotaApiCalls = Math.floor(Math.random() * 500) + 100
    }
  } catch (error) {
    console.error('获取租户信息失败:', error)
    ElMessage.error('获取租户信息失败')
  }
}

const handleSave = async () => {
  if (!basicFormRef.value) return
  await basicFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        loading.value = true
        const updateData = {
          displayName: form.value.displayName,
          description: form.value.description,
          logoUrl: form.value.logoUrl,
          faviconUrl: form.value.faviconUrl,
          email: form.value.email,
          phone: form.value.phone,
          address: form.value.address,
          taxNo: form.value.taxNo,
          website: form.value.website,
          timezone: form.value.timezone,
          locale: form.value.locale,
          currency: form.value.currency,
          dateFormat: form.value.dateFormat,
          numberFormat: form.value.numberFormat,
          primaryColor: form.value.primaryColor,
          customCss: form.value.customCss
        }
        await tenantSettingApi.updateTenant(updateData)
        ElMessage.success('保存成功')
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error('保存失败')
      } finally {
        loading.value = false
      }
    }
  })
}

const handleUploadLogo = () => {
  ElMessage.info('Logo上传功能开发中，请输入URL')
}

const handleExport = () => {
  const data = JSON.stringify(form.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tenant-config-${form.value.slug || 'export'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const handleViewInvoices = () => {
  router.push('/subscription')
}

const handleExportData = () => {
  ElMessage.info('数据导出功能开发中')
}

const getPlanType = (plan: string) => {
  const map: Record<string, string> = {
    free: 'info',
    basic: '',
    pro: 'warning',
    enterprise: 'success'
  }
  return map[plan] || ''
}

const getPlanName = (plan: string) => {
  const map: Record<string, string> = {
    free: '免费版',
    basic: '基础版',
    pro: '专业版',
    enterprise: '企业版'
  }
  return map[plan] || plan
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    active: 'success',
    trial: '',
    suspended: 'danger',
    expired: 'info',
    cancelled: 'info'
  }
  return map[status] || ''
}

const getStatusName = (status: string) => {
  const map: Record<string, string> = {
    active: '活跃',
    trial: '试用期',
    suspended: '已暂停',
    expired: '已过期',
    cancelled: '已取消'
  }
  return map[status] || status
}

const getUsagePercent = (used: number, total: number) => {
  if (!total) return 0
  return Math.min(Math.round((used / total) * 100), 100)
}

const formatStorage = (mb: number) => {
  if (mb >= 1000) {
    return (mb / 1000).toFixed(1) + ' GB'
  }
  return mb + ' MB'
}

onMounted(() => {
  fetchTenant()
})
</script>

<style scoped>
.tenant-settings {
  max-width: 100%;
}
.tenant-settings .page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.tenant-settings .header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tenant-settings .page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.tenant-settings .settings-nav .nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #606266;
}
.tenant-settings .settings-nav .nav-item:hover {
  background: #f5f7fa;
}
.tenant-settings .settings-nav .nav-item.active {
  background: #ecf5ff;
  color: #409EFF;
}
.tenant-settings .settings-nav .nav-item .el-icon {
  font-size: 20px;
}
.tenant-settings .settings-nav .nav-text {
  display: flex;
  flex-direction: column;
}
.tenant-settings .settings-nav .nav-title {
  font-size: 14px;
  font-weight: 500;
}
.tenant-settings .settings-nav .nav-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}
.tenant-settings .settings-content .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.tenant-settings .logo-upload {
  display: flex;
  align-items: center;
  gap: 16px;
}
.tenant-settings .logo-upload .upload-action {
  flex: 1;
}
.tenant-settings .logo-preview {
  display: flex;
  align-items: center;
}
.tenant-settings .color-picker {
  display: flex;
  align-items: center;
}
.tenant-settings .subscription-overview .current-plan {
  margin-bottom: 24px;
}
.tenant-settings .subscription-overview .quick-actions {
  display: flex;
  gap: 12px;
}
</style>