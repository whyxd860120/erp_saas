<template>
  <div class="subscription-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">套餐与账单</h2>
      </div>
      <div class="header-right">
        <el-button @click="handleViewInvoices">
          <el-icon><List /></el-icon>
          账单记录
        </el-button>
        <el-button @click="fetchData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 当前订阅 -->
      <el-col :xs="24" :lg="16">
        <el-card class="current-subscription" shadow="never">
          <template #header>
            <div class="card-header">
              <span>当前订阅</span>
              <el-tag v-if="currentSubscription" :type="getSubscriptionStatusType(currentSubscription.status)">
                {{ getSubscriptionStatusName(currentSubscription.status) }}
              </el-tag>
            </div>
          </template>
          <div v-if="currentSubscription" class="subscription-detail">
            <div class="plan-info">
              <div class="plan-badge" :class="currentSubscription.plan?.name">
                {{ currentSubscription.plan?.displayName || '免费版' }}
              </div>
              <div class="plan-desc">{{ currentSubscription.plan?.description }}</div>
            </div>
            <el-descriptions :column="2" border class="subscription-stats">
              <el-descriptions-item label="账单周期">
                {{ currentSubscription.billingCycle === 'monthly' ? '月付' : '年付' }}
                <span class="price-info">/ ¥{{ currentSubscription.price }}/{{ currentSubscription.billingCycle === 'monthly' ? '月' : '年' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="下次扣款">
                {{ currentSubscription.currentPeriodEndsAt ? formatDate(currentSubscription.currentPeriodEndsAt) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="当前周期">
                {{ currentSubscription.currentPeriodStartsAt ? formatDate(currentSubscription.currentPeriodStartsAt) : '-' }} 至
                {{ currentSubscription.currentPeriodEndsAt ? formatDate(currentSubscription.currentPeriodEndsAt) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="账户余额">
                ¥0.00 <el-button link type="primary" size="small">充值</el-button>
              </el-descriptions-item>
            </el-descriptions>
            <div class="subscription-actions">
              <el-button type="primary" @click="handleChangePlan">变更套餐</el-button>
              <el-button @click="handleChangeBilling">变更账单</el-button>
              <el-button type="danger" plain @click="handleCancelSubscription" v-if="currentSubscription.status === 'active'">
                取消订阅
              </el-button>
            </div>
          </div>
          <div v-else class="no-subscription">
            <el-empty description="您还没有订阅任何付费计划">
              <el-button type="primary" @click="activeTab = 1">选择套餐</el-button>
            </el-empty>
          </div>
        </el-card>

        <!-- 配额使用情况 -->
        <el-card class="quota-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>配额使用情况</span>
            </div>
          </template>
          <div class="quota-list">
            <div class="quota-item">
              <div class="quota-header">
                <span class="quota-label">用户数</span>
                <span class="quota-value">{{ quotaUsage.users }} / {{ currentPlan?.quotaUsers || 5 }}</span>
              </div>
              <el-progress
                :percentage="getQuotaPercent(quotaUsage.users, currentPlan?.quotaUsers || 5)"
                :stroke-width="10"
                :color="getQuotaColor(getQuotaPercent(quotaUsage.users, currentPlan?.quotaUsers || 5))"
              />
            </div>
            <div class="quota-item">
              <div class="quota-header">
                <span class="quota-label">存储空间</span>
                <span class="quota-value">{{ formatStorage(quotaUsage.storage) }} / {{ formatStorage(currentPlan?.quotaStorage || 1000) }}</span>
              </div>
              <el-progress
                :percentage="getQuotaPercent(quotaUsage.storage, currentPlan?.quotaStorage || 1000)"
                :stroke-width="10"
                :color="getQuotaColor(getQuotaPercent(quotaUsage.storage, currentPlan?.quotaStorage || 1000))"
              />
            </div>
            <div class="quota-item">
              <div class="quota-header">
                <span class="quota-label">API调用</span>
                <span class="quota-value">{{ quotaUsage.apiCalls }} / {{ currentPlan?.quotaApiCalls || 1000 }}/月</span>
              </div>
              <el-progress
                :percentage="getQuotaPercent(quotaUsage.apiCalls, currentPlan?.quotaApiCalls || 1000)"
                :stroke-width="10"
                :color="getQuotaColor(getQuotaPercent(quotaUsage.apiCalls, currentPlan?.quotaApiCalls || 1000))"
              />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 侧边栏 -->
      <el-col :xs="24" :lg="8">
        <!-- 升级提示 -->
        <el-card v-if="currentSubscription?.plan?.name === 'free'" class="upgrade-card" shadow="never">
          <div class="upgrade-banner">
            <div class="banner-icon">
              <el-icon :size="40" color="#fff"><Star /></el-icon>
            </div>
            <div class="banner-content">
              <h4>升级到专业版</h4>
              <p>解锁更多功能，提升业务效率</p>
              <el-button type="primary" @click="scrollToPlans">立即升级</el-button>
            </div>
          </div>
        </el-card>

        <!-- 常用操作 -->
        <el-card class="actions-card" shadow="never">
          <template #header>
            <span>常用操作</span>
          </template>
          <div class="quick-actions">
            <div class="action-item" @click="handleAddPaymentMethod">
              <el-icon><Plus /></el-icon>
              <span>添加支付方式</span>
            </div>
            <div class="action-item" @click="handleViewInvoices">
              <el-icon><Document /></el-icon>
              <span>下载发票</span>
            </div>
            <div class="action-item" @click="handleExportData">
              <el-icon><Download /></el-icon>
              <span>导出账单</span>
            </div>
            <div class="action-item" @click="handleContactSupport">
              <el-icon><ChatDotRound /></el-icon>
              <span>联系客服</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 可用套餐 -->
    <el-card ref="plansRef" class="plans-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>可用套餐</span>
          <el-radio-group v-model="billingCycle" size="small">
            <el-radio-button value="monthly">月付</el-radio-button>
            <el-radio-button value="yearly">年付 (省20%)</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-row :gutter="20" class="plans-grid">
        <el-col :xs="24" :sm="12" :md="8" v-for="plan in plans" :key="plan.id">
          <div :class="['plan-card', { popular: plan.isPopular, current: isCurrentPlan(plan.id) }]">
            <div v-if="plan.isPopular" class="popular-tag">推荐</div>
            <div class="plan-header">
              <h4>{{ plan.displayName }}</h4>
              <div class="plan-price">
                <span class="currency">¥</span>
                <span class="amount">{{ billingCycle === 'monthly' ? plan.price : Math.round(plan.price * 12 * 0.8) }}</span>
                <span class="period">/{{ billingCycle === 'monthly' ? '月' : '年' }}</span>
              </div>
              <p class="plan-desc">{{ plan.description }}</p>
            </div>
            <el-divider />
            <div class="plan-features">
              <div class="feature-item" v-for="(enabled, key) in getFeatures(plan)" :key="key">
                <el-icon v-if="enabled" color="#67C23A"><SuccessFilled /></el-icon>
                <el-icon v-else color="#E0E0E0"><CircleClose /></el-icon>
                <span>{{ getFeatureName(key) }}</span>
              </div>
            </div>
            <el-divider />
            <div class="plan-quota">
              <div class="quota-row">
                <span>用户数</span>
                <strong>{{ plan.quotaUsers === -1 ? '无限制' : plan.quotaUsers }}</strong>
              </div>
              <div class="quota-row">
                <span>存储空间</span>
                <strong>{{ formatStorage(plan.quotaStorage) }}</strong>
              </div>
              <div class="quota-row">
                <span>API调用</span>
                <strong>{{ plan.quotaApiCalls === -1 ? '无限制' : plan.quotaApiCalls + '/月' }}</strong>
              </div>
            </div>
            <el-button
              type="primary"
              :class="['plan-action', { 'is-current': isCurrentPlan(plan.id) }]"
              :disabled="isCurrentPlan(plan.id)"
              @click="handleSelectPlan(plan)"
            >
              {{ isCurrentPlan(plan.id) ? '当前套餐' : (getPlanOrder(plan.name) > getPlanOrder(currentPlan?.name || '') ? '立即升级' : '选择') }}
            </el-button>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 变更套餐对话框 -->
    <el-dialog v-model="changePlanDialogVisible" title="变更套餐" width="500px">
      <div v-if="selectedPlan" class="change-plan-content">
        <el-alert type="info" :closable="false">
          您将把套餐从 <strong>{{ currentPlan?.displayName }}</strong> 变更为 <strong>{{ selectedPlan.displayName }}</strong>
        </el-alert>
        <div class="change-summary">
          <div class="summary-row">
            <span>新套餐价格</span>
            <span>¥{{ billingCycle === 'monthly' ? selectedPlan.price : Math.round(selectedPlan.price * 12 * 0.8) }}/{{ billingCycle === 'monthly' ? '月' : '年' }}</span>
          </div>
          <div class="summary-row">
            <span>剩余天数折算</span>
            <span>-¥0.00</span>
          </div>
          <el-divider />
          <div class="summary-row total">
            <span>本次应付</span>
            <span>¥{{ billingCycle === 'monthly' ? selectedPlan.price : Math.round(selectedPlan.price * 12 * 0.8) }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="changePlanDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmChangePlan">确认变更</el-button>
      </template>
    </el-dialog>

    <!-- 账单记录对话框 -->
    <el-dialog v-model="invoicesDialogVisible" title="账单记录" width="800px">
      <el-table :data="invoices" stripe v-loading="invoicesLoading">
        <el-table-column prop="invoiceNo" label="账单编号" width="150" />
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            ¥{{ row.amount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getInvoiceStatusType(row.status)" size="small">
              {{ getInvoiceStatusName(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dueDate" label="到期日" width="120">
          <template #default="{ row }">
            {{ row.dueDate ? formatDate(row.dueDate) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="paidAt" label="支付日" width="120">
          <template #default="{ row }">
            {{ row.paidAt ? formatDate(row.paidAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleDownloadInvoice(row)">
              下载
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  List,
  Star,
  Plus,
  Document,
  Download,
  ChatDotRound,
  SuccessFilled,
  CircleClose
} from '@element-plus/icons-vue'
import subscriptionApi, { type Plan, type Subscription, type Invoice } from '@/api/subscription'

const plans = ref<Plan[]>([])
const currentSubscription = ref<Subscription | null>(null)
const invoices = ref<Invoice[]>([])
const invoicesLoading = ref(false)
const loading = ref(false)
const billingCycle = ref('monthly')
const changePlanDialogVisible = ref(false)
const invoicesDialogVisible = ref(false)
const selectedPlan = ref<Plan | null>(null)
const plansRef = ref<HTMLElement | null>(null)
const activeTab = ref(0)

const quotaUsage = reactive({
  users: 3,
  storage: 520,
  apiCalls: 856
})

const currentPlan = computed(() => currentSubscription.value?.plan)

const fetchData = async () => {
  try {
    loading.value = true
    await Promise.all([fetchPlans(), fetchCurrentSubscription()])
  } finally {
    loading.value = false
  }
}

const fetchPlans = async () => {
  try {
    const res = await subscriptionApi.getPlans()
    if (res.success) {
      plans.value = res.data.filter(p => p.isActive)
    }
  } catch (error) {
    console.error('获取计划列表失败:', error)
    ElMessage.error('获取计划列表失败')
  }
}

const fetchCurrentSubscription = async () => {
  try {
    const res = await subscriptionApi.getCurrentSubscription()
    if (res.success) {
      currentSubscription.value = res.data || null
    }
  } catch (error) {
    console.error('获取订阅失败:', error)
  }
}

const fetchInvoices = async () => {
  try {
    invoicesLoading.value = true
    const res = await subscriptionApi.getInvoices()
    if (res.success) {
      invoices.value = res.data
    }
  } catch (error) {
    console.error('获取账单失败:', error)
  } finally {
    invoicesLoading.value = false
  }
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString()
}

const getSubscriptionStatusType = (status: string) => {
  const map: Record<string, string> = {
    active: 'success',
    paused: 'warning',
    past_due: 'danger',
    cancelled: 'info'
  }
  return map[status] || ''
}

const getSubscriptionStatusName = (status: string) => {
  const map: Record<string, string> = {
    active: '活跃',
    paused: '已暂停',
    past_due: '欠费',
    cancelled: '已取消'
  }
  return map[status] || status
}

const getInvoiceStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'warning',
    paid: 'success',
    overdue: 'danger'
  }
  return map[status] || ''
}

const getInvoiceStatusName = (status: string) => {
  const map: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    overdue: '已逾期'
  }
  return map[status] || status
}

const getFeatures = (plan: Plan) => ({
  featureMultiWarehouse: plan.featureMultiWarehouse,
  featureMultiCurrency: plan.featureMultiCurrency,
  featureCustomFields: plan.featureCustomFields,
  featureApiAccess: plan.featureApiAccess,
  featureWebhooks: plan.featureWebhooks,
  featureAuditLogs: plan.featureAuditLogs,
  featureAnalytics: plan.featureAnalytics
})

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

const isCurrentPlan = (planId: string) => currentSubscription.value?.planId === planId

const getPlanOrder = (planName: string) => {
  const order: Record<string, number> = { free: 0, basic: 1, pro: 2, enterprise: 3 }
  return order[planName] ?? 0
}

const getQuotaPercent = (used: number, total: number) => {
  if (!total || total === -1) return 0
  return Math.min(Math.round((used / total) * 100), 100)
}

const getQuotaColor = (percent: number) => {
  if (percent >= 90) return '#F56C6C'
  if (percent >= 70) return '#E6A23C'
  return '#67C23A'
}

const formatStorage = (mb: number) => {
  if (mb === -1) return '无限制'
  if (mb >= 1000) return (mb / 1000).toFixed(1) + ' GB'
  return mb + ' MB'
}

const scrollToPlans = () => {
  plansRef.value?.scrollIntoView({ behavior: 'smooth' })
}

const handleSelectPlan = (plan: Plan) => {
  selectedPlan.value = plan
  changePlanDialogVisible.value = true
}

const handleConfirmChangePlan = async () => {
  if (!selectedPlan.value) return
  try {
    await subscriptionApi.createSubscription({
      planId: selectedPlan.value.id,
      billingCycle: billingCycle.value
    })
    ElMessage.success('套餐变更成功')
    changePlanDialogVisible.value = false
    fetchCurrentSubscription()
  } catch (error) {
    console.error('变更套餐失败:', error)
    ElMessage.error('变更套餐失败')
  }
}

const handleCancelSubscription = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要取消订阅吗？取消后您将在当前账单周期结束后失去付费功能。',
      '确认取消',
      { type: 'warning' }
    )
    await subscriptionApi.cancelSubscription()
    ElMessage.success('已取消订阅')
    fetchCurrentSubscription()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消订阅失败:', error)
      ElMessage.error('取消订阅失败')
    }
  }
}

const handleChangePlan = () => {
  scrollToPlans()
}

const handleChangeBilling = () => {
  ElMessage.info('变更账单周期功能开发中')
}

const handleViewInvoices = () => {
  fetchInvoices()
  invoicesDialogVisible.value = true
}

const handleDownloadInvoice = (invoice: Invoice) => {
  ElMessage.success(`正在生成发票 ${invoice.invoiceNo}`)
}

const handleAddPaymentMethod = () => {
  ElMessage.info('添加支付方式功能开发中')
}

const handleExportData = () => {
  ElMessage.info('导出账单功能开发中')
}

const handleContactSupport = () => {
  ElMessage.info('请联系客服：support@example.com')
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.subscription-page .page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.subscription-page .page-header .header-left .page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.subscription-page .page-header .header-right {
  display: flex;
  gap: 8px;
}
.subscription-page .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.subscription-page .current-subscription .subscription-detail .plan-info {
  margin-bottom: 20px;
}
.subscription-page .current-subscription .subscription-detail .plan-badge {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 4px;
  font-size: 18px;
  font-weight: 600;
  background: #409EFF;
  color: #fff;
}
.subscription-page .current-subscription .subscription-detail .plan-badge.basic {
  background: #909399;
}
.subscription-page .current-subscription .subscription-detail .plan-badge.pro {
  background: #E6A23C;
}
.subscription-page .current-subscription .subscription-detail .plan-badge.enterprise {
  background: #67C23A;
}
.subscription-page .current-subscription .subscription-detail .plan-desc {
  margin-top: 8px;
  color: #909399;
}
.subscription-page .current-subscription .subscription-detail .subscription-stats .price-info {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}
.subscription-page .current-subscription .subscription-detail .subscription-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}
.subscription-page .current-subscription .no-subscription {
  text-align: center;
  padding: 40px 0;
}
.subscription-page .quota-card {
  margin-top: 20px;
}
.subscription-page .quota-card .quota-list .quota-item {
  margin-bottom: 20px;
}
.subscription-page .quota-card .quota-list .quota-item .quota-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.subscription-page .quota-card .quota-list .quota-item .quota-header .quota-label {
  font-size: 14px;
  color: #606266;
}
.subscription-page .quota-card .quota-list .quota-item .quota-header .quota-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}
.subscription-page .upgrade-card .upgrade-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #409EFF 0%, #337ecc 100%);
  border-radius: 8px;
  color: #fff;
}
.subscription-page .upgrade-card .upgrade-banner .banner-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.subscription-page .upgrade-card .upgrade-banner .banner-content {
  flex: 1;
}
.subscription-page .upgrade-card .upgrade-banner .banner-content h4 {
  margin: 0 0 4px;
  font-size: 16px;
}
.subscription-page .upgrade-card .upgrade-banner .banner-content p {
  margin: 0 0 12px;
  font-size: 13px;
  opacity: 0.9;
}
.subscription-page .actions-card {
  margin-top: 20px;
}
.subscription-page .actions-card .quick-actions .action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: color 0.2s;
}
.subscription-page .actions-card .quick-actions .action-item:last-child {
  border-bottom: none;
}
.subscription-page .actions-card .quick-actions .action-item:hover {
  color: #409EFF;
}
.subscription-page .plans-card {
  margin-top: 20px;
}
.subscription-page .plans-card .plans-grid .plan-card {
  position: relative;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s;
  background: #fff;
}
.subscription-page .plans-card .plans-grid .plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}
.subscription-page .plans-card .plans-grid .plan-card.popular {
  border-color: #409EFF;
  box-shadow: 0 0 0 1px #409EFF;
}
.subscription-page .plans-card .plans-grid .plan-card.current {
  border-color: #67C23A;
  background: #f0f9eb;
}
.subscription-page .plans-card .plans-grid .plan-card .popular-tag {
  position: absolute;
  top: 0;
  right: 0;
  background: #409EFF;
  color: #fff;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 0 12px 0 8px;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-header {
  text-align: center;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-header h4 {
  font-size: 20px;
  margin: 0 0 16px;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-header .plan-price {
  margin: 16px 0;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-header .plan-price .currency {
  font-size: 18px;
  color: #606266;
  vertical-align: top;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-header .plan-price .amount {
  font-size: 48px;
  font-weight: 700;
  color: #303133;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-header .plan-price .period {
  font-size: 14px;
  color: #909399;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-header .plan-desc {
  color: #909399;
  font-size: 14px;
  min-height: 40px;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-features .feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-quota .quota-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: #606266;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-quota .quota-row strong {
  color: #303133;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-action {
  width: 100%;
  margin-top: 16px;
}
.subscription-page .plans-card .plans-grid .plan-card .plan-action.is-current {
  background: #67C23A;
  border-color: #67C23A;
  color: #fff;
}
.subscription-page .change-plan-content .change-summary {
  margin-top: 20px;
}
.subscription-page .change-plan-content .change-summary .summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}
.subscription-page .change-plan-content .change-summary .summary-row.total {
  font-size: 16px;
  font-weight: 600;
  color: #409EFF;
}
</style>