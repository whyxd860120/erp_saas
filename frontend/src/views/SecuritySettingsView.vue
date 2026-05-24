<template>
  <div class="security-settings">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">安全设置</h2>
      </div>
      <div class="header-right">
        <el-button @click="fetchData">刷新</el-button>
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
        <!-- 密码安全 -->
        <el-card v-show="activeTab === 0" class="settings-content">
          <template #header>
            <div class="card-header">
              <span>密码安全</span>
            </div>
          </template>
          <el-form label-width="140px">
            <el-form-item label="当前密码">
              <el-input type="password" v-model="passwordForm.current" placeholder="请输入当前密码" show-password />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input type="password" v-model="passwordForm.new" placeholder="请输入新密码" show-password />
            </el-form-item>
            <el-form-item label="确认新密码">
              <el-input type="password" v-model="passwordForm.confirm" placeholder="请再次输入新密码" show-password />
            </el-form-item>
            <el-form-item label="密码强度">
              <div class="password-strength">
                <el-progress :percentage="passwordStrength" :stroke-width="8" :color="strengthColor" />
                <span class="strength-text" :style="{ color: strengthColor }">{{ strengthText }}</span>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleChangePassword" :loading="loading">修改密码</el-button>
            </el-form-item>
          </el-form>

          <el-divider />

          <h4>密码规则</h4>
          <ul class="password-rules">
            <li :class="{ met: passwordForm.new.length >= 8 }">至少8个字符</li>
            <li :class="{ met: /[A-Z]/.test(passwordForm.new) }">包含大写字母</li>
            <li :class="{ met: /[a-z]/.test(passwordForm.new) }">包含小写字母</li>
            <li :class="{ met: /[0-9]/.test(passwordForm.new) }">包含数字</li>
            <li :class="{ met: /[^A-Za-z0-9]/.test(passwordForm.new) }">包含特殊字符</li>
          </ul>
        </el-card>

        <!-- 双因素认证 -->
        <el-card v-show="activeTab === 1" class="settings-content">
          <template #header>
            <div class="card-header">
              <span>双因素认证 (2FA)</span>
              <el-tag :type="securitySettings.twoFactorEnabled ? 'success' : 'info'">
                {{ securitySettings.twoFactorEnabled ? '已启用' : '未启用' }}
              </el-tag>
            </div>
          </template>

          <div v-if="!securitySettings.twoFactorEnabled" class="enable-2fa">
            <el-alert type="info" :closable="false" show-icon>
              双因素认证可为您的账户添加额外的安全保护。启用后，登录时除了密码外还需要输入手机验证码。
            </el-alert>
            <div class="enable-action">
              <el-button type="primary" @click="showSetup2FA = true">启用双因素认证</el-button>
            </div>
          </div>

          <div v-else class="manage-2fa">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="认证方式">
                {{ securitySettings.twoFactorMethod === 'totp' ? '身份验证器App' : '短信验证码' }}
              </el-descriptions-item>
              <el-descriptions-item label="绑定手机">
                {{ securitySettings.twoFactorPhone ? securitySettings.twoFactorPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="备用验证码">
                <span>已生成 {{ securitySettings.backupCodes?.length || 0 }} 个备用码</span>
                <el-button link type="primary" @click="showBackupCodes = true">查看</el-button>
              </el-descriptions-item>
            </el-descriptions>
            <div class="manage-actions">
              <el-button type="primary" @click="showSetup2FA = true">更换认证方式</el-button>
              <el-button type="danger" plain @click="handleDisable2FA">禁用2FA</el-button>
            </div>
          </div>

          <!-- 2FA设置对话框 -->
          <el-dialog v-model="showSetup2FA" title="设置双因素认证" width="500px">
            <div v-if="setupStep === 1" class="setup-step">
              <h4>步骤1：下载身份验证器</h4>
              <p>请在您的手机上下载并安装以下应用之一：</p>
              <ul class="app-list">
                <li>Google Authenticator (推荐)</li>
                <li>Microsoft Authenticator</li>
                <li>Authy</li>
              </ul>
              <el-button type="primary" @click="setupStep = 2">下一步</el-button>
            </div>
            <div v-if="setupStep === 2" class="setup-step">
              <h4>步骤2：扫描二维码</h4>
              <div class="qr-code">
                <div class="qr-placeholder">
                  <el-icon :size="100" color="#409EFF"><Picture /></el-icon>
                  <p>扫描下方二维码</p>
                </div>
                <el-input v-model="formData.secretKey" readonly placeholder="或者手动输入密钥" />
              </div>
              <div class="step-actions">
                <el-button @click="setupStep = 1">上一步</el-button>
                <el-button type="primary" @click="setupStep = 3">下一步</el-button>
              </div>
            </div>
            <div v-if="setupStep === 3" class="setup-step">
              <h4>步骤3：验证验证码</h4>
              <p>请输入身份验证器中显示的6位验证码：</p>
              <el-input v-model="formData.totpCode" placeholder="000000" maxlength="6" style="width: 150px;" />
              <div class="step-actions">
                <el-button @click="setupStep = 2">上一步</el-button>
                <el-button type="primary" @click="handleEnable2FA">验证并启用</el-button>
              </div>
            </div>
          </el-dialog>

          <!-- 备用码对话框 -->
          <el-dialog v-model="showBackupCodes" title="备用验证码" width="400px">
            <el-alert type="warning" :closable="false">
              请将这些备用验证码保存在安全的地方。如果您的手机丢失，可以使用这些验证码登录。
            </el-alert>
            <div class="backup-codes">
              <code v-for="(code, index) in securitySettings.backupCodes" :key="index">{{ code }}</code>
            </div>
            <template #footer>
              <el-button type="primary" @click="handleDownloadBackupCodes">下载</el-button>
              <el-button @click="handlePrintBackupCodes">打印</el-button>
            </template>
          </el-dialog>
        </el-card>

        <!-- 会话管理 -->
        <el-card v-show="activeTab === 2" class="settings-content">
          <template #header>
            <div class="card-header">
              <span>会话管理</span>
            </div>
          </template>

          <div class="session-info">
            <h4>当前活跃会话</h4>
            <el-table :data="sessions" stripe>
              <el-table-column label="设备" width="200">
                <template #default="{ row }">
                  <div class="device-info">
                    <el-icon><Monitor /></el-icon>
                    <span>{{ row.device || '未知设备' }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="ip" label="IP地址" width="150" />
              <el-table-column prop="location" label="位置" width="150" />
              <el-table-column prop="lastActive" label="最后活跃" width="180">
                <template #default="{ row }">
                  {{ formatTime(row.lastActive) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button
                    v-if="!row.isCurrent"
                    type="danger"
                    size="small"
                    @click="handleRevokeSession(row)"
                  >
                    撤销
                  </el-button>
                  <el-tag v-else type="success" size="small">当前</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-divider />

          <div class="session-settings">
            <h4>会话设置</h4>
            <el-form label-width="160px">
              <el-form-item label="会话超时时间">
                <el-select v-model="securitySettings.sessionTimeout" style="width: 100%;">
                  <el-option label="15分钟" :value="15" />
                  <el-option label="30分钟" :value="30" />
                  <el-option label="1小时" :value="60" />
                  <el-option label="4小时" :value="240" />
                  <el-option label="24小时" :value="1440" />
                </el-select>
              </el-form-item>
              <el-form-item label="单设备登录">
                <el-switch v-model="securitySettings.singleDeviceLogin" />
                <span class="form-tip">启用后，只能在一个设备上同时登录</span>
              </el-form-item>
              <el-form-item label="登录设备限制">
                <el-input-number v-model="securitySettings.maxDevices" :min="1" :max="10" />
                <span class="form-tip">允许同时在线的最大设备数</span>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleSaveSessionSettings">保存设置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>

        <!-- 登录历史 -->
        <el-card v-show="activeTab === 3" class="settings-content">
          <template #header>
            <div class="card-header">
              <span>登录历史</span>
            </div>
          </template>

          <div class="login-history-toolbar">
            <el-select v-model="historyFilter" placeholder="筛选" style="width: 120px;">
              <el-option label="全部" value="all" />
              <el-option label="成功" value="success" />
              <el-option label="失败" value="failed" />
            </el-select>
            <el-button @click="fetchLoginHistory">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>

          <el-table :data="loginHistory" stripe v-loading="historyLoading">
            <el-table-column prop="time" label="时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.time) }}
              </template>
            </el-table-column>
            <el-table-column prop="ip" label="IP地址" width="150" />
            <el-table-column prop="location" label="位置" width="150" />
            <el-table-column prop="device" label="设备" width="200" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="note" label="备注" />
          </el-table>

          <el-pagination
            v-model:current-page="historyPage"
            :page-size="historyPageSize"
            :total="historyTotal"
            @current-change="fetchLoginHistory"
            layout="prev, pager, next, total"
            style="margin-top: 20px; text-align: right;"
          />
        </el-card>

        <!-- IP白名单 -->
        <el-card v-show="activeTab === 4" class="settings-content">
          <template #header>
            <div class="card-header">
              <span>IP白名单</span>
              <el-switch v-model="securitySettings.ipWhitelistEnabled" @change="handleToggleIpWhitelist" />
            </div>
          </template>

          <el-alert type="info" :closable="false" v-if="securitySettings.ipWhitelistEnabled">
            启用后，只有在白名单中的IP地址才能访问系统。
          </el-alert>

          <div class="ip-whitelist">
            <div class="whitelist-toolbar">
              <el-button type="primary" @click="showAddIpDialog = true">
                <el-icon><Plus /></el-icon>
                添加IP
              </el-button>
            </div>

            <el-table :data="ipWhitelist" stripe>
              <el-table-column prop="ip" label="IP地址/网段" width="200" />
              <el-table-column prop="description" label="描述" />
              <el-table-column prop="createdAt" label="添加时间" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.createdAt) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button type="danger" size="small" @click="handleDeleteIp(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-dialog v-model="showAddIpDialog" title="添加IP白名单" width="400px">
            <el-form label-width="100px">
              <el-form-item label="IP地址">
                <el-input v-model="newIpRule.ip" placeholder="例如：192.168.1.1 或 192.168.1.0/24" />
              </el-form-item>
              <el-form-item label="描述">
                <el-input v-model="newIpRule.description" placeholder="可选描述" />
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="showAddIpDialog = false">取消</el-button>
              <el-button type="primary" @click="handleAddIp">添加</el-button>
            </template>
          </el-dialog>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Monitor, Picture, Refresh, Plus } from '@element-plus/icons-vue'

const loading = ref(false)
const historyLoading = ref(false)
const activeTab = ref(0)

interface Session {
  id: string
  device?: string
  ip: string
  location: string
  lastActive: string
  isCurrent: boolean
  platform?: string
}

interface LoginHistoryItem {
  time: string
  ip: string
  location: string
  device: string
  status: 'success' | 'failed'
  note?: string
}

interface IpRule {
  ip: string
  description: string
  createdAt: string
}

const sessions = ref<Session[]>([])
const loginHistory = ref<LoginHistoryItem[]>([])
const ipWhitelist = ref<IpRule[]>([])
const historyPage = ref(1)
const historyPageSize = ref(20)
const historyTotal = ref(0)
const historyFilter = ref('all')
const showSetup2FA = ref(false)
const showBackupCodes = ref(false)
const showAddIpDialog = ref(false)
const setupStep = ref(1)

const newIpRule = ref<IpRule>({ ip: '', description: '', createdAt: '' })

const formData = reactive({
  secretKey: 'JBSWY3DPEHPK3PXP',
  totpCode: ''
})

const settingTabs = [
  { title: '密码安全', icon: 'Key', desc: '修改密码规则' },
  { title: '双因素认证', icon: 'Lock', desc: '2FA设置' },
  { title: '会话管理', icon: 'Clock', desc: '登录设备' },
  { title: '登录历史', icon: 'History', desc: '登录记录' },
  { title: 'IP白名单', icon: 'Guide', desc: '访问控制' }
]

const passwordForm = reactive({
  current: '',
  new: '',
  confirm: ''
})

const securitySettings = reactive({
  twoFactorEnabled: false,
  twoFactorMethod: 'totp',
  twoFactorPhone: '+86 138****8888',
  backupCodes: ['A1B2C3D4', 'E5F6G7H8', 'I9J0K1L2', 'M3N4O5P6', 'Q7R8S9T0'],
  sessionTimeout: 60,
  singleDeviceLogin: false,
  maxDevices: 5,
  ipWhitelistEnabled: false
})

const passwordStrength = computed(() => {
  let score = 0
  const pwd = passwordForm.new
  if (pwd.length >= 8) score += 25
  if (/[A-Z]/.test(pwd)) score += 25
  if (/[a-z]/.test(pwd)) score += 20
  if (/[0-9]/.test(pwd)) score += 15
  if (/[^A-Za-z0-9]/.test(pwd)) score += 15
  return Math.min(score, 100)
})

const strengthColor = computed(() => {
  const s = passwordStrength.value
  if (s < 40) return '#F56C6C'
  if (s < 70) return '#E6A23C'
  return '#67C23A'
})

const strengthText = computed(() => {
  const s = passwordStrength.value
  if (s < 40) return '弱'
  if (s < 70) return '中等'
  return '强'
})

const fetchData = async () => {
  fetchSessions()
  fetchLoginHistory()
}

const fetchSessions = () => {
  sessions.value = [
    { id: '1', device: 'Chrome on Windows', ip: '192.168.1.100', location: '上海', lastActive: new Date().toISOString(), isCurrent: true },
    { id: '2', device: 'Safari on iPhone', ip: '192.168.1.101', location: '上海', lastActive: new Date(Date.now() - 3600000).toISOString(), isCurrent: false },
    { id: '3', device: 'Chrome on macOS', ip: '192.168.1.102', location: '北京', lastActive: new Date(Date.now() - 86400000).toISOString(), isCurrent: false }
  ]
}

const fetchLoginHistory = () => {
  historyLoading.value = true
  setTimeout(() => {
    loginHistory.value = [
      { time: new Date().toISOString(), ip: '192.168.1.100', location: '上海', device: 'Chrome on Windows', status: 'success', note: '登录成功' },
      { time: new Date(Date.now() - 3600000).toISOString(), ip: '192.168.1.101', location: '上海', device: 'Safari on iPhone', status: 'success', note: '登录成功' },
      { time: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.103', location: '北京', device: 'Firefox on Windows', status: 'failed', note: '密码错误' },
      { time: new Date(Date.now() - 172800000).toISOString(), ip: '192.168.1.100', location: '上海', device: 'Chrome on Windows', status: 'success', note: '登录成功' }
    ]
    historyTotal.value = 4
    historyLoading.value = false
  }, 500)
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString()
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString()
}

const handleChangePassword = async () => {
  if (!passwordForm.current) {
    ElMessage.warning('请输入当前密码')
    return
  }
  if (!passwordForm.new) {
    ElMessage.warning('请输入新密码')
    return
  }
  if (passwordForm.new !== passwordForm.confirm) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  if (passwordStrength.value < 50) {
    ElMessage.warning('密码强度太弱，请使用更复杂的密码')
    return
  }

  try {
    loading.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('密码修改成功')
    passwordForm.current = ''
    passwordForm.new = ''
    passwordForm.confirm = ''
  } catch (error) {
    ElMessage.error('密码修改失败')
  } finally {
    loading.value = false
  }
}

const handleEnable2FA = async () => {
  if (!formData.totpCode || formData.totpCode.length !== 6) {
    ElMessage.warning('请输入6位验证码')
    return
  }
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    securitySettings.twoFactorEnabled = true
    securitySettings.backupCodes = [
      'A1B2C3D4', 'E5F6G7H8', 'I9J0K1L2', 'M3N4O5P6', 'Q7R8S9T0',
      'U1V2W3X4', 'Y5Z6A7B8', 'C9D0E1F2', 'G3H4I5J6', 'K7L8M9N0'
    ]
    showSetup2FA.value = false
    setupStep.value = 1
    ElMessage.success('双因素认证已启用')
  } catch (error) {
    ElMessage.error('验证码验证失败')
  }
}

const handleDisable2FA = async () => {
  try {
    await ElMessageBox.confirm('确定要禁用双因素认证吗？禁用后账户安全性将降低。', '确认禁用', { type: 'warning' })
    securitySettings.twoFactorEnabled = false
    ElMessage.success('双因素认证已禁用')
  } catch (error) {
    // 用户取消
  }
}

const handleRevokeSession = async (session: Session) => {
  try {
    await ElMessageBox.confirm('确定要撤销此会话吗？', '确认操作', { type: 'warning' })
    sessions.value = sessions.value.filter(s => s.id !== session.id)
    ElMessage.success('会话已撤销')
  } catch (error) {
    // 用户取消
  }
}

const handleSaveSessionSettings = () => {
  ElMessage.success('会话设置已保存')
}

const handleToggleIpWhitelist = () => {
  ElMessage.info(`IP白名单${securitySettings.ipWhitelistEnabled ? '已启用' : '已禁用'}`)
}

const handleAddIp = async () => {
  if (!newIpRule.value.ip) {
    ElMessage.warning('请输入IP地址')
    return
  }
  ipWhitelist.value.push({
    ip: newIpRule.value.ip,
    description: newIpRule.value.description,
    createdAt: new Date().toISOString()
  })
  showAddIpDialog.value = false
  newIpRule.value = { ip: '', description: '', createdAt: '' }
  ElMessage.success('IP已添加到白名单')
}

const handleDeleteIp = async (rule: IpRule) => {
  try {
    await ElMessageBox.confirm('确定要删除此IP规则吗？', '确认操作', { type: 'warning' })
    ipWhitelist.value = ipWhitelist.value.filter(r => r.ip !== rule.ip)
    ElMessage.success('IP规则已删除')
  } catch (error) {
    // 用户取消
  }
}

const handleDownloadBackupCodes = () => {
  ElMessage.success('备用码已下载')
}

const handlePrintBackupCodes = () => {
  ElMessage.info('打印功能开发中')
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.security-settings .page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.security-settings .page-header .header-left .page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.security-settings .settings-nav .nav-item {
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
.security-settings .settings-nav .nav-item:hover {
  background: #f5f7fa;
}
.security-settings .settings-nav .nav-item.active {
  background: #ecf5ff;
  color: #409EFF;
}
.security-settings .settings-nav .nav-item .el-icon {
  font-size: 20px;
}
.security-settings .settings-nav .nav-text {
  display: flex;
  flex-direction: column;
}
.security-settings .settings-nav .nav-text .nav-title {
  font-size: 14px;
  font-weight: 500;
}
.security-settings .settings-nav .nav-text .nav-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}
.security-settings .settings-content .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.security-settings .settings-content .password-strength {
  display: flex;
  align-items: center;
  gap: 12px;
}
.security-settings .settings-content .password-strength .el-progress {
  flex: 1;
}
.security-settings .settings-content .password-strength .strength-text {
  font-size: 14px;
  font-weight: 500;
}
.security-settings .settings-content h4 {
  margin: 16px 0 12px;
}
.security-settings .settings-content .password-rules {
  list-style: none;
  padding: 0;
  margin: 0;
}
.security-settings .settings-content .password-rules li {
  padding: 6px 0;
  padding-left: 24px;
  position: relative;
  color: #909399;
}
.security-settings .settings-content .password-rules li::before {
  content: '✗';
  position: absolute;
  left: 0;
  color: #F56C6C;
}
.security-settings .settings-content .password-rules li.met {
  color: #67C23A;
}
.security-settings .settings-content .password-rules li.met::before {
  content: '✓';
  color: #67C23A;
}
.security-settings .settings-content .enable-2fa .enable-action {
  margin-top: 20px;
}
.security-settings .settings-content .manage-2fa .manage-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}
.security-settings .settings-content .setup-step h4 {
  margin-top: 0;
}
.security-settings .settings-content .setup-step .app-list {
  margin: 16px 0;
  padding-left: 20px;
}
.security-settings .settings-content .setup-step .app-list li {
  padding: 4px 0;
}
.security-settings .settings-content .setup-step .qr-code {
  margin: 20px 0;
  text-align: center;
}
.security-settings .settings-content .setup-step .qr-code .qr-placeholder {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
}
.security-settings .settings-content .setup-step .step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
.security-settings .settings-content .backup-codes {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.security-settings .settings-content .backup-codes code {
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 16px;
  text-align: center;
}
.security-settings .settings-content .device-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.security-settings .settings-content .form-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
.security-settings .settings-content .login-history-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.security-settings .settings-content .ip-whitelist .whitelist-toolbar {
  margin-bottom: 16px;
}
</style>