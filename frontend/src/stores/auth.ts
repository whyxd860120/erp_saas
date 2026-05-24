import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, tenantLogin as tenantLoginApi, logout as logoutApi, getUserInfo, type LoginParams } from '../api/auth'
import { getTenants } from '../api/tenant'
import { getMyPermissions } from '../api/permission'

export interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  permissions: string[] // 用户权限列表
  tenant?: TenantInfo
}

export interface TenantInfo {
  id: string
  name: string
  slug: string
  plan?: string
  trialEndsAt?: string
  trialWarning?: TrialWarning | null
  initializationStatus?: string
}

export interface TrialWarning {
  type: string
  title: string
  message: string
  daysRemaining: number
  expiresAt: string
}

interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data: T
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<UserInfo | null>(null)
  const tenant = ref<TenantInfo | null>(null)
  const tenants = ref<TenantInfo[]>([])
  const permissions = ref<string[]>([])
  const authReady = ref(false)
  const trialWarning = ref<TrialWarning | null>(null)

  const isAuthenticated = computed(() => authReady.value && !!token.value && !!user.value)

  /**
   * 获取用户权限
   */
  const fetchPermissions = async () => {
    try {
      const response = await getMyPermissions() as any
      if (response.success) {
        permissions.value = response.data.permissions || []
        if (user.value) {
          user.value.permissions = response.data.permissions || []
        }
      }
    } catch (error) {
      console.error('获取用户权限失败:', error)
    }
  }

  const clearAuth = () => {
    token.value = ''
    user.value = null
    tenant.value = null
    tenants.value = []
    permissions.value = []
    localStorage.removeItem('token')
  }

  const login = async (params: LoginParams) => {
    let response: ApiResponse<{ token: string; user: UserInfo }>
    
    // 如果提供了租户标识且不是系统租户，使用租户登录
    if (params.tenantSlug && params.tenantSlug !== 'system') {
      response = await tenantLoginApi(params) as ApiResponse<{ token: string; user: UserInfo }>
    } else {
      // 系统管理员或无租户标识时使用系统登录
      response = await loginApi({
        username: params.username,
        password: params.password
      }) as ApiResponse<{ token: string; user: UserInfo }>
    }

    if (!response?.success || !response.data?.token) {
      throw new Error(response?.message || '登录失败')
    }

    token.value = response.data.token
    localStorage.setItem('token', response.data.token)
    user.value = response.data.user

    if (response.data.user.tenant) {
      tenant.value = response.data.user.tenant
      // 保存租户信息到 localStorage，方便下次登录自动填充
      localStorage.setItem('lastTenant', JSON.stringify({
        slug: response.data.user.tenant.slug,
        name: response.data.user.tenant.name
      }))
      // 捕获试用期警告
      if (response.data.user.tenant.trialWarning) {
        trialWarning.value = response.data.user.tenant.trialWarning
      }
    }

    authReady.value = true
    
    // 登录成功后获取用户权限
    await fetchPermissions()
    
    return response
  }

  const logout = async () => {
    try {
      if (token.value) {
        await logoutApi()
      }
    } finally {
      clearAuth()
    }
  }

  const fetchUserInfo = async (): Promise<boolean> => {
    try {
      const response = await getUserInfo() as ApiResponse<{ user: UserInfo }>
      if (response.success) {
        user.value = response.data.user
        if (response.data.user.tenant) {
          tenant.value = response.data.user.tenant
        }
        // 获取用户权限
        await fetchPermissions()
        return true
      }
      await fetchTenants()
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
    return false
  }

  const fetchTenants = async () => {
    try {
      const response = await getTenants() as ApiResponse<{ items: TenantInfo[] }>
      if (response.success) {
        tenants.value = response.data.items

        if (tenants.value.length === 1) {
          tenant.value = tenants.value[0]
        }
      }
    } catch (error) {
      console.error('获取租户列表失败:', error)
    }
  }

  const init = async () => {
    if (authReady.value) return

    if (!token.value) {
      authReady.value = true
      return
    }

    try {
      // 添加 5 秒超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('初始化超时')), 5000)
      })
      
      const initPromise = (async () => {
        const ok = await fetchUserInfo()
        if (!ok) {
          clearAuth()
          return
        }
        if (!tenant.value) {
          await fetchTenants()
        }
      })()
      
      await Promise.race([initPromise, timeoutPromise])
    } catch (error) {
      console.error('初始化失败:', error)
      clearAuth()
    } finally {
      authReady.value = true
    }
  }

  // 选择租户
  const selectTenant = (selectedTenant: TenantInfo) => {
    tenant.value = selectedTenant
  }

  // 清除试用期警告
  const clearTrialWarning = () => {
    trialWarning.value = null
  }

  // 刷新租户信息（用于更新 initializationStatus 等状态）
  const refreshTenantInfo = async () => {
    try {
      const response = await getUserInfo() as ApiResponse<{ user: UserInfo }>
      if (response.success && response.data.user.tenant) {
        tenant.value = response.data.user.tenant
      }
    } catch (error) {
      console.error('刷新租户信息失败:', error)
    }
  }

  return {
    token,
    user,
    tenant,
    tenants,
    permissions,
    authReady,
    trialWarning,
    isAuthenticated,
    init,
    login,
    logout,
    clearAuth,
    fetchUserInfo,
    fetchPermissions,
    fetchTenants,
    selectTenant,
    clearTrialWarning,
    refreshTenantInfo
  }
})
