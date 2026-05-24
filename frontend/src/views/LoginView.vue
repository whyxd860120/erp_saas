<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>数企管家</h2>
        </div>
      </template>
      
      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="登录" name="login">
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            label-width="0"
            size="large"
          >
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="用户名 / 姓名 / 邮箱"
                prefix-icon="User"
              />
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                prefix-icon="Lock"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            
            <el-form-item prop="tenantSlug">
              <!-- 系统管理员显示 -->
              <el-input
                v-if="isSystemUser"
                :model-value="'系统管理'"
                placeholder="系统管理"
                readonly
                prefix-icon="Monitor"
                class="system-admin-input"
              />
              <!-- 多租户选择 -->
              <div v-else-if="showTenantDropdown && tenantOptions.length > 1" class="tenant-select-wrapper">
                <el-select
                  v-model="loginForm.tenantSlug"
                  placeholder="选择公司名称"
                  filterable
                  clearable
                  @change="handleTenantChange"
                  class="tenant-select"
                >
                  <template #prefix>
                    <el-icon><OfficeBuilding /></el-icon>
                  </template>
                  <el-option
                    v-for="tenant in tenantOptions"
                    :key="tenant.id"
                    :label="tenant.name"
                    :value="tenant.slug"
                  />
                </el-select>
              </div>
              <!-- 单个租户已选择 -->
              <div v-else-if="loginForm.tenantName" class="tenant-display">
                <el-input
                  :model-value="loginForm.tenantName"
                  placeholder="公司名称"
                  readonly
                  prefix-icon="OfficeBuilding"
                >
                  <template #append>
                    <el-button @click="clearTenantSelection" :icon="Close" />
                  </template>
                </el-input>
              </div>
              <!-- 默认输入框 -->
              <el-input
                v-else
                v-model="loginForm.tenantSlug"
                placeholder="公司名称"
                prefix-icon="OfficeBuilding"
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                class="login-btn"
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="注册" name="register">
          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            label-width="0"
            size="large"
          >
            <el-form-item prop="tenantName">
              <el-input
                v-model="registerForm.tenantName"
                placeholder="公司名称"
                prefix-icon="OfficeBuilding"
              />
            </el-form-item>
            
            <el-form-item prop="tenantSlug">
              <el-input
                v-model="registerForm.tenantSlug"
                placeholder="公司标识"
                prefix-icon="Link"
              />
            </el-form-item>
            
            <el-form-item prop="username">
              <el-input
                v-model="registerForm.username"
                placeholder="用户名"
                prefix-icon="User"
              />
            </el-form-item>

            <el-form-item prop="name">
              <el-input
                v-model="registerForm.name"
                placeholder="管理员姓名"
                prefix-icon="UserFilled"
              />
            </el-form-item>
            
            <el-form-item prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="密码（至少6位）"
                prefix-icon="Lock"
                show-password
              />
            </el-form-item>
            
            <el-form-item prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="确认密码"
                prefix-icon="Lock"
                show-password
                @keyup.enter="handleRegister"
              />
            </el-form-item>
            
            <el-form-item>
              <el-checkbox v-model="registerForm.agreeTerms">
                我已阅读并同意
                <el-link type="primary" underline="hover" @click="handleShowTerms">《服务条款》</el-link>
                和
                <el-link type="primary" underline="hover" @click="handleShowPrivacy">《隐私政策》</el-link>
              </el-checkbox>
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                :loading="registerLoading"
                class="login-btn"
                @click="handleRegister"
              >
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { QuestionFilled, Close, OfficeBuilding, Monitor } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { register as registerApi, searchTenantsByUsername } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeTab = ref('login')
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()
const loading = ref(false)
const registerLoading = ref(false)
const tenantOptions = ref<{ id: string; name: string; slug: string }[]>([])
const showTenantDropdown = ref(false)
const tenantDropdownLoading = ref(false)

interface TenantOption {
  id: string
  name: string
  slug: string
}

const loginForm = reactive({
  username: '',
  password: '',
  tenantSlug: '',
  tenantName: '' // 显示的公司名称
})

const registerForm = reactive({
  tenantName: '',
  tenantSlug: '',
  username: '',
  name: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false
})

const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名/姓名/邮箱', trigger: 'blur' },
    { min: 2, message: '登录账号至少2个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

// 监听用户名输入，搜索租户
let searchTimeout: number | null = null
const isSystemUser = ref(false) // 是否为系统管理员

watch(() => loginForm.username, (newUsername) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  // 重置状态
  loginForm.tenantSlug = ''
  loginForm.tenantName = ''
  tenantOptions.value = []
  showTenantDropdown.value = false
  isSystemUser.value = false
  
  if (!newUsername || newUsername.length < 2) {
    return
  }

  // 防抖搜索
  searchTimeout = window.setTimeout(async () => {
    try {
      tenantDropdownLoading.value = true
      const res = await searchTenantsByUsername(newUsername) as any

      if (res.success && res.data.tenants && res.data.tenants.length > 0) {
        // 过滤出系统租户
        const systemTenants = res.data.tenants.filter((t: any) => t.isSystem)
        const normalTenants = res.data.tenants.filter((t: any) => !t.isSystem)

        // 检查是否有系统用户关联的租户
        if (systemTenants.length > 0) {
          // 是系统管理员
          tenantOptions.value = systemTenants
          showTenantDropdown.value = true
          isSystemUser.value = true
          if (systemTenants.length === 1) {
            selectTenant(systemTenants[0])
          }
        } else if (normalTenants.length > 0) {
          // 是租户用户
          tenantOptions.value = normalTenants
          showTenantDropdown.value = true
          isSystemUser.value = false
          if (normalTenants.length === 1) {
            selectTenant(normalTenants[0])
          }
        } else {
          // 理论上不会走到这里，但以防万一
          tenantOptions.value = []
          showTenantDropdown.value = false
          isSystemUser.value = false
        }
      } else {
        // 没有找到任何租户，说明用户名可能不存在或输入错误
        // 不显示系统管理，只显示空的公司名称输入框
        tenantOptions.value = []
        showTenantDropdown.value = false
        isSystemUser.value = false
      }
    } catch (error) {
      // 搜索失败时清空，不显示系统管理
      tenantOptions.value = []
      showTenantDropdown.value = false
      isSystemUser.value = false
    } finally {
      tenantDropdownLoading.value = false
    }
  }, 500)
})

const selectTenant = (tenant: TenantOption) => {
  loginForm.tenantSlug = tenant.slug
  loginForm.tenantName = tenant.name
  showTenantDropdown.value = false
  tenantOptions.value = []
}

const clearTenantSelection = () => {
  loginForm.tenantSlug = ''
  loginForm.tenantName = ''
  tenantOptions.value = []
  showTenantDropdown.value = false
}

const handleTenantChange = (slug: string) => {
  const tenant = tenantOptions.value.find(t => t.slug === slug)
  if (tenant) {
    loginForm.tenantName = tenant.name
  }
  showTenantDropdown.value = false
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    await loginFormRef.value.validate()
    
    loading.value = true
    
    await authStore.login({
      username: loginForm.username,
      password: loginForm.password,
      tenantSlug: loginForm.tenantSlug || undefined
    })
    
    ElMessage.success('登录成功')

    const redirect = (route.query.redirect as string) || '/'
    await router.push(redirect)
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || '登录失败'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

const registerRules: FormRules = {
  tenantName: [
    { required: true, message: '请输入公司名称', trigger: 'blur' },
    { min: 2, max: 100, message: '公司名称长度为2-100个字符', trigger: 'blur' }
  ],
  tenantSlug: [
    { required: true, message: '请输入公司标识', trigger: 'blur' },
    { min: 2, max: 50, message: '公司标识长度为2-50个字符', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 50, message: '用户名长度为2-50个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入管理员姓名', trigger: 'blur' },
    { min: 2, max: 50, message: '姓名长度为2-50个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为6-20个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const handleShowTenantHelp = () => {
  ElMessageBox.alert(
    '租户标识用于唯一标识您的公司或组织，在登录时需要输入。\n\n' +
    '示例：\n' +
    '- 公司名称：ABC科技有限公司\n' +
    '- 租户标识：abc-tech\n\n' +
    '如果您忘记租户标识，请联系系统管理员。',
    '什么是租户标识？',
    {
      confirmButtonText: '我知道了',
      type: 'info'
    }
  )
}

const handleShowTerms = () => {
  ElMessageBox.alert(
    '1. 接受本协议即表示您同意使用我们的服务。\n' +
    '2. 您应确保提供的信息真实、准确、完整。\n' +
    '3. 您不得利用本服务从事违法违规活动。\n' +
    '4. 我们有权根据需要修改本协议条款。\n' +
    '5. 使用本服务产生的数据归您所有。',
    '服务条款',
    {
      confirmButtonText: '我知道了',
      type: 'info'
    }
  )
}

const handleShowPrivacy = () => {
  ElMessageBox.alert(
    '1. 我们重视您的隐私保护。\n' +
    '2. 我们只收集必要的服务信息。\n' +
    '3. 您的数据将进行加密存储。\n' +
    '4. 我们不会向第三方泄露您的信息。\n' +
    '5. 您有权访问、修改、删除您的个人信息。',
    '隐私政策',
    {
      confirmButtonText: '我知道了',
      type: 'info'
    }
  )
}

const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  try {
    await registerFormRef.value.validate()
    
    if (!registerForm.agreeTerms) {
      ElMessage.warning('请阅读并同意服务条款和隐私政策')
      return
    }
    
    registerLoading.value = true
    const res = await registerApi({
      username: registerForm.username,
      name: registerForm.name,
      password: registerForm.password,
      tenantName: registerForm.tenantName,
      tenantSlug: registerForm.tenantSlug
    })

    if (res.success) {
      ElMessage.success('注册成功！正在为您创建租户和账号...')

      // 保存注册信息到 localStorage
      localStorage.setItem('pendingRegistration', JSON.stringify({
        username: registerForm.username,
        password: registerForm.password,
        tenantSlug: registerForm.tenantSlug
      }))

      setTimeout(() => {
        ElMessage.success('账号创建完成！请登录使用系统')
        activeTab.value = 'login'
        loginForm.username = registerForm.username
        loginForm.tenantSlug = registerForm.tenantSlug
        loginForm.password = registerForm.password
      }, 1000)
    }
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || '注册失败'
    ElMessage.error(message)
  } finally {
    registerLoading.value = false
  }
}

// 组件挂载时加载上次登录的租户信息
onMounted(() => {
  try {
    const lastTenant = localStorage.getItem('lastTenant')
    if (lastTenant) {
      const tenantInfo = JSON.parse(lastTenant)
      loginForm.tenantSlug = tenantInfo.slug
      loginForm.tenantName = tenantInfo.name
    }
  } catch (error) {
    console.error('加载上次登录租户信息失败:', error)
  }
})
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 500px;
  border-radius: 12px;
  box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.15);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 28px;
  font-weight: 600;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.login-tabs {
  margin-top: 10px;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

.tenant-select-wrapper {
  width: 100%;
}

.tenant-select {
  width: 100%;
}

.tenant-display {
  width: 100%;
}

.tenant-display :deep(.el-input__wrapper) {
  background-color: #f5f7fa;
}

.system-admin-input :deep(.el-input__wrapper) {
  background-color: #ecf5ff;
  color: #409eff;
}

.login-tips {
  margin-top: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 8px;
  font-size: 12px;
  color: #606266;
  border-left: 4px solid #667eea;
}

.login-tips p {
  margin: 6px 0;
  font-weight: 500;
}

.login-tips p:last-child {
  margin-bottom: 0;
}
</style>
