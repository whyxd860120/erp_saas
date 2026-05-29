import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  login as loginApi,
  tenantLogin as tenantLoginApi,
  getUserInfo,
  type LoginParams,
  type UserInfo,
  type TenantInfo,
} from '@/api/auth'
import { setToken, clearToken, setStoredTenant, getStoredTenant } from '@/utils/http'
import type { ApiResponse } from '@/utils/http'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(uni.getStorageSync('erp_token') || '')
  const user = ref<UserInfo | null>(null)
  const tenant = ref<TenantInfo | null>(null)
  const permissions = ref<string[]>([])
  const authReady = ref(false)
  const isAuthenticated = computed(() => authReady.value && !!token.value && !!user.value)

  /** 清除认证状态 */
  function clearAuth() {
    token.value = ''
    user.value = null
    tenant.value = null
    permissions.value = []
    clearToken()
  }

  /** 登录 */
  async function login(params: LoginParams) {
    let response: ApiResponse<{ token: string; user: UserInfo; tenant?: TenantInfo }>

    if (params.tenantSlug && params.tenantSlug !== 'system') {
      response = await tenantLoginApi(params) as ApiResponse<{ token: string; user: UserInfo; tenant?: TenantInfo }>
    } else {
      response = await loginApi({ username: params.username, password: params.password }) as ApiResponse<{ token: string; user: UserInfo; tenant?: TenantInfo }>
    }

    if (!response?.success || !response.data?.token) {
      throw new Error(response?.message || '登录失败')
    }

    token.value = response.data.token
    setToken(response.data.token)
    user.value = response.data.user
    permissions.value = response.data.user.permissions || []

    if (response.data.tenant || response.data.user.tenant) {
      const t = response.data.tenant || response.data.user.tenant!
      tenant.value = t
      setStoredTenant({ slug: t.slug, name: t.name })
    }

    authReady.value = true
    return response
  }

  /** 登出 */
  async function logout() {
    clearAuth()
    uni.reLaunch({ url: '/pages/login/index' })
  }

  /** 初始化认证状态 */
  async function init() {
    if (authReady.value) return

    if (!token.value) {
      authReady.value = true
      return
    }

    try {
      const res = await getUserInfo() as ApiResponse<{ user: UserInfo }>
      if (res.success) {
        user.value = res.data.user
        permissions.value = res.data.user.permissions || []
        if (res.data.user.tenant) {
          tenant.value = res.data.user.tenant
        }
      } else {
        clearAuth()
      }
    } catch {
      clearAuth()
    } finally {
      authReady.value = true
    }
  }

  return {
    token,
    user,
    tenant,
    permissions,
    authReady,
    isAuthenticated,
    init,
    login,
    logout,
    clearAuth,
  }
})
