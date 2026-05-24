<template>
  <div class="integrations-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">集成与文档</h2>
      </div>
      <div class="header-right">
        <el-button @click="fetchData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧内容 -->
      <el-col :xs="24" :lg="16">
        <!-- API概览 -->
        <el-card class="api-overview" shadow="never">
          <template #header>
            <div class="card-header">
              <span>API概览</span>
              <el-tag type="success">v1</el-tag>
            </div>
          </template>
          <div class="api-stats">
            <div class="stat-item">
              <div class="stat-value">{{ apiStats.totalCalls }}</div>
              <div class="stat-label">API调用总数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ apiStats.todayCalls }}</div>
              <div class="stat-label">今日调用</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ apiStats.quotaLimit }}</div>
              <div class="stat-label">配额上限/月</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ apiStats.successRate }}%</div>
              <div class="stat-label">成功率</div>
            </div>
          </div>
          <el-progress :percentage="apiStats.quotaUsed" :stroke-width="12" style="margin-top: 20px;" />
          <div class="quota-info">本月配额使用：{{ apiStats.quotaUsed }}%</div>
        </el-card>

        <!-- API文档 -->
        <el-card class="api-docs" shadow="never">
          <template #header>
            <div class="card-header">
              <span>API文档</span>
            </div>
          </template>

          <el-tabs v-model="docsTab">
            <el-tab-pane label="快速开始" name="quickstart">
              <div class="quickstart-content">
                <el-alert type="info" :closable="false" show-icon>
                  以下示例展示如何使用API密钥访问系统API。
                </el-alert>

                <div class="code-section">
                  <div class="code-header">
                    <span>获取访问令牌</span>
                    <el-button link size="small" @click="copyCode('token-code')">
                      <el-icon><DocumentCopy /></el-icon> 复制
                    </el-button>
                  </div>
                  <pre id="token-code"><code>curl -X POST https://api.example.com/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your_api_key",
    "apiSecret": "your_api_secret"
  }'</code></pre>
                </div>

                <div class="code-section">
                  <div class="code-header">
                    <span>获取物料列表</span>
                    <el-button link size="small" @click="copyCode('list-code')">
                      <el-icon><DocumentCopy /></el-icon> 复制
                    </el-button>
                  </div>
                  <pre id="list-code"><code>curl -X GET https://api.example.com/v1/products \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json"</code></pre>
                </div>

                <div class="code-section">
                  <div class="code-header">
                    <span>创建采购订单</span>
                    <el-button link size="small" @click="copyCode('order-code')">
                      <el-icon><DocumentCopy /></el-icon> 复制
                    </el-button>
                  </div>
                  <pre id="order-code"><code>curl -X POST https://api.example.com/v1/purchase-orders \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "sup_xxx",
    "items": [{
      "productId": "prod_xxx",
      "quantity": 100,
      "price": 25.50
    }],
    "expectedDate": "2024-06-01"
  }'</code></pre>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="认证方式" name="auth">
              <div class="auth-content">
                <h4>API密钥认证</h4>
                <p>每个API密钥包含Key和Secret两部分，请在API请求中使用以下Header：</p>
                <div class="code-block">
                  <code>X-API-Key: your_api_key</code>
                  <code>X-API-Secret: your_api_secret</code>
                </div>

                <h4>JWT令牌认证</h4>
                <p>获取JWT令牌后，在请求Header中使用：</p>
                <div class="code-block">
                  <code>Authorization: Bearer {jwt_token}</code>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="端点列表" name="endpoints">
              <el-table :data="apiEndpoints" stripe size="small">
                <el-table-column prop="method" label="方法" width="80">
                  <template #default="{ row }">
                    <el-tag :type="getMethodType(row.method)" size="small">{{ row.method }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="path" label="端点" min-width="200">
                  <template #default="{ row }">
                    <code>{{ row.path }}</code>
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="描述" min-width="200" />
                <el-table-column prop="version" label="版本" width="80" />
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-card>

        <!-- SDK与库 -->
        <el-card class="sdk-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>SDK与库</span>
            </div>
          </template>
          <div class="sdk-list">
            <div class="sdk-item">
              <div class="sdk-icon node">
                <el-icon :size="32"><ElementPlus /></el-icon>
              </div>
              <div class="sdk-info">
                <h5>Node.js SDK</h5>
                <p>官方Node.js/TypeScript SDK</p>
                <div class="sdk-tags">
                  <el-tag size="small">推荐</el-tag>
                  <el-tag size="small" type="success">v2.0.0</el-tag>
                </div>
              </div>
              <div class="sdk-action">
                <el-button type="primary" size="small" @click="handleInstallSDK('node')">安装</el-button>
              </div>
            </div>

            <div class="sdk-item">
              <div class="sdk-icon python">
                <el-icon :size="32"><Connection /></el-icon>
              </div>
              <div class="sdk-info">
                <h5>Python SDK</h5>
                <p>官方Python SDK，支持异步操作</p>
                <div class="sdk-tags">
                  <el-tag size="small" type="success">v1.5.0</el-tag>
                </div>
              </div>
              <div class="sdk-action">
                <el-button type="primary" size="small" @click="handleInstallSDK('python')">安装</el-button>
              </div>
            </div>

            <div class="sdk-item">
              <div class="sdk-icon java">
                <el-icon :size="32"><Coin /></el-icon>
              </div>
              <div class="sdk-info">
                <h5>Java SDK</h5>
                <p>官方Java/Kotlin SDK</p>
                <div class="sdk-tags">
                  <el-tag size="small" type="success">v1.2.0</el-tag>
                </div>
              </div>
              <div class="sdk-action">
                <el-button type="primary" size="small" @click="handleInstallSDK('java')">安装</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧侧边栏 -->
      <el-col :xs="24" :lg="8">
        <!-- Webhook状态 -->
        <el-card class="status-card" shadow="never">
          <template #header>
            <span>Webhook状态</span>
          </template>
          <div class="webhook-status">
            <div class="status-row">
              <span>活跃Webhook</span>
              <span class="value">{{ webhookStats.activeCount }}</span>
            </div>
            <div class="status-row">
              <span>今日触发</span>
              <span class="value">{{ webhookStats.todayTriggers }}</span>
            </div>
            <div class="status-row">
              <span>成功率</span>
              <span class="value">{{ webhookStats.successRate }}%</span>
            </div>
          </div>
          <el-button type="primary" @click="router.push('/webhooks')" style="width: 100%; margin-top: 16px;">
            管理Webhook
          </el-button>
        </el-card>

        <!-- 第三方集成 -->
        <el-card class="integrations-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>第三方集成</span>
            </div>
          </template>
          <div class="integration-list">
            <div
              v-for="integration in integrations"
              :key="integration.id"
              :class="['integration-item', { connected: integration.connected }]"
            >
              <div class="integration-icon">
                <el-icon :size="24"><Message /></el-icon>
              </div>
              <div class="integration-info">
                <span class="name">{{ integration.name }}</span>
                <span class="status">{{ integration.connected ? '已连接' : '未连接' }}</span>
              </div>
              <el-button
                :type="integration.connected ? 'default' : 'primary'"
                size="small"
                @click="handleIntegrationAction(integration)"
              >
                {{ integration.connected ? '管理' : '连接' }}
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- 开发者资源 -->
        <el-card class="resources-card" shadow="never">
          <template #header>
            <span>开发者资源</span>
          </template>
          <div class="resources-list">
            <el-link type="primary" underline="never">
              <el-icon><Document /></el-icon>
              API参考文档
            </el-link>
            <el-link type="primary" underline="never">
              <el-icon><VideoCamera /></el-icon>
              视频教程
            </el-link>
            <el-link type="primary" underline="never">
              <el-icon><ChatDotRound /></el-icon>
              开发者社区
            </el-link>
            <el-link type="primary" underline="never">
              <el-icon><QuestionFilled /></el-icon>
              问题反馈
            </el-link>
            <el-link type="primary" underline="never">
              <el-icon><Message /></el-icon>
              技术支持
            </el-link>
          </div>
        </el-card>

        <!-- API密钥快捷操作 -->
        <el-card class="quick-api-card" shadow="never">
          <template #header>
            <span>API密钥</span>
          </template>
          <p style="color: #909399; font-size: 13px; margin-bottom: 16px;">
            管理您的API密钥，用于应用程序集成。
          </p>
          <el-button type="primary" @click="router.push('/api-keys')" style="width: 100%;">
            管理API密钥
          </el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  DocumentCopy,
  Document,
  VideoCamera,
  ChatDotRound,
  QuestionFilled,
  Message,
  Connection,
  Coin,
  ElementPlus
} from '@element-plus/icons-vue'

const router = useRouter()
const docsTab = ref('quickstart')

interface ApiEndpoint {
  method: string
  path: string
  description: string
  version: string
}

interface Integration {
  id: string
  name: string
  icon: string
  connected: boolean
}

const apiStats = reactive({
  totalCalls: 125680,
  todayCalls: 1256,
  quotaLimit: 10000,
  quotaUsed: 42,
  successRate: 99.8
})

const webhookStats = reactive({
  activeCount: 5,
  todayTriggers: 128,
  successRate: 97.5
})

const apiEndpoints = ref<ApiEndpoint[]>([
  { method: 'POST', path: '/v1/auth/token', description: '获取访问令牌', version: 'v1' },
  { method: 'GET', path: '/v1/products', description: '获取物料列表', version: 'v1' },
  { method: 'GET', path: '/v1/products/:id', description: '获取物料详情', version: 'v1' },
  { method: 'POST', path: '/v1/products', description: '创建物料', version: 'v1' },
  { method: 'PUT', path: '/v1/products/:id', description: '更新物料', version: 'v1' },
  { method: 'DELETE', path: '/v1/products/:id', description: '删除物料', version: 'v1' },
  { method: 'GET', path: '/v1/suppliers', description: '获取供应商列表', version: 'v1' },
  { method: 'GET', path: '/v1/customers', description: '获取客户列表', version: 'v1' },
  { method: 'POST', path: '/v1/purchase-orders', description: '创建采购订单', version: 'v1' },
  { method: 'GET', path: '/v1/purchase-orders', description: '获取采购订单列表', version: 'v1' },
  { method: 'POST', path: '/v1/sales-orders', description: '创建销售订单', version: 'v1' },
  { method: 'GET', path: '/v1/inventory', description: '获取库存数据', version: 'v1' },
  { method: 'GET', path: '/v1/reports/sales', description: '销售报表', version: 'v1' },
  { method: 'GET', path: '/v1/reports/inventory', description: '库存报表', version: 'v1' }
])

const integrations = ref<Integration[]>([
  { id: 'dingtalk', name: '钉钉', icon: 'Message', connected: true },
  { id: 'wecom', name: '企业微信', icon: 'ChatDotRound', connected: false },
  { id: 'feishu', name: '飞书', icon: 'Message', connected: false },
  { id: 'taobao', name: '淘宝', icon: 'Goods', connected: false },
  { id: 'jd', name: '京东', icon: 'ShoppingCart', connected: false }
])

const fetchData = () => {
  ElMessage.success('数据已刷新')
}

const copyCode = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    const code = element.textContent || ''
    navigator.clipboard.writeText(code).then(() => {
      ElMessage.success('代码已复制到剪贴板')
    })
  }
}

const getMethodType = (method: string) => {
  const map: Record<string, string> = {
    GET: 'success',
    POST: 'primary',
    PUT: 'warning',
    DELETE: 'danger'
  }
  return map[method] || 'info'
}

const handleInstallSDK = (type: string) => {
  const commands: Record<string, string> = {
    node: 'npm install @erp/sdk',
    python: 'pip install erp-sdk',
    java: 'mvn install com.erp:sdk'
  }
  navigator.clipboard.writeText(commands[type]).then(() => {
    ElMessage.success(`${commands[type]} 已复制到剪贴板`)
  })
}

const handleIntegrationAction = (integration: Integration) => {
  if (integration.connected) {
    ElMessage.info(`管理 ${integration.name} 连接`)
  } else {
    ElMessage.info(`连接 ${integration.name}`)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.integrations-page .page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.integrations-page .page-header .header-left .page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.integrations-page .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.integrations-page .api-overview .api-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.integrations-page .api-overview .api-stats .stat-item {
  text-align: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}
.integrations-page .api-overview .api-stats .stat-item .stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}
.integrations-page .api-overview .api-stats .stat-item .stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.integrations-page .api-overview .quota-info {
  text-align: right;
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}
.integrations-page .api-docs {
  margin-top: 20px;
}
.integrations-page .api-docs .quickstart-content .code-section {
  margin-top: 20px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}
.integrations-page .api-docs .quickstart-content .code-section .code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e8e8e8;
  font-size: 14px;
  font-weight: 500;
}
.integrations-page .api-docs .quickstart-content .code-section pre {
  margin: 0;
  padding: 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  overflow-x: auto;
}
.integrations-page .api-docs .quickstart-content .code-section pre code {
  display: block;
  white-space: pre;
}
.integrations-page .api-docs .auth-content h4 {
  margin: 16px 0 8px;
}
.integrations-page .api-docs .auth-content p {
  color: #606266;
  margin-bottom: 12px;
}
.integrations-page .api-docs .auth-content .code-block {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}
.integrations-page .api-docs .auth-content .code-block code {
  display: block;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}
.integrations-page .sdk-card {
  margin-top: 20px;
}
.integrations-page .sdk-card .sdk-list .sdk-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}
.integrations-page .sdk-card .sdk-list .sdk-item:last-child {
  border-bottom: none;
}
.integrations-page .sdk-card .sdk-list .sdk-item .sdk-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f9eb;
  color: #67C23A;
}
.integrations-page .sdk-card .sdk-list .sdk-item .sdk-icon.node {
  background: #e8f5e9;
  color: #4caf50;
}
.integrations-page .sdk-card .sdk-list .sdk-item .sdk-icon.python {
  background: #fff8e1;
  color: #ff9800;
}
.integrations-page .sdk-card .sdk-list .sdk-item .sdk-icon.java {
  background: #fff3e0;
  color: #e65100;
}
.integrations-page .sdk-card .sdk-list .sdk-item .sdk-info {
  flex: 1;
}
.integrations-page .sdk-card .sdk-list .sdk-item .sdk-info h5 {
  margin: 0 0 4px;
  font-size: 15px;
}
.integrations-page .sdk-card .sdk-list .sdk-item .sdk-info p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
.integrations-page .sdk-card .sdk-list .sdk-item .sdk-info .sdk-tags {
  margin-top: 8px;
}
.integrations-page .status-card .webhook-status .status-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}
.integrations-page .status-card .webhook-status .status-row:last-child {
  border-bottom: none;
}
.integrations-page .status-card .webhook-status .status-row .value {
  font-weight: 600;
  color: #303133;
}
.integrations-page .integrations-card {
  margin-top: 20px;
}
.integrations-page .integrations-card .integration-list .integration-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.integrations-page .integrations-card .integration-list .integration-item:last-child {
  border-bottom: none;
}
.integrations-page .integrations-card .integration-list .integration-item .integration-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}
.integrations-page .integrations-card .integration-list .integration-item.connected .integration-icon {
  background: #e8f5e9;
  color: #4caf50;
}
.integrations-page .integrations-card .integration-list .integration-item .integration-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.integrations-page .integrations-card .integration-list .integration-item .integration-info .name {
  font-size: 14px;
  font-weight: 500;
}
.integrations-page .integrations-card .integration-list .integration-item .integration-info .status {
  font-size: 12px;
  color: #909399;
}
.integrations-page .resources-card {
  margin-top: 20px;
}
.integrations-page .resources-card .resources-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.integrations-page .resources-card .resources-list .el-link {
  display: flex;
  align-items: center;
  gap: 8px;
}
.integrations-page .quick-api-card {
  margin-top: 20px;
}
</style>