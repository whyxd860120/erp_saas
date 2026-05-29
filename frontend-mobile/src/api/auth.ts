import { request, http } from '@/utils/http'
import type { ApiResponse } from '@/utils/http'

// ========== 类型定义 ==========

export interface LoginParams {
  username: string
  password: string
  tenantSlug?: string
}

export interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
  tenant?: TenantInfo
}

export interface TenantInfo {
  id: string
  name: string
  slug: string
  plan?: string
  trialEndsAt?: string
  initializationStatus?: string
  isSystem?: boolean
}

export interface LoginResult {
  token: string
  user: UserInfo
  tenant: TenantInfo
}

// ========== API 方法 ==========

/** 统一登录 */
export const login = (data: LoginParams): Promise<ApiResponse<LoginResult>> => {
  return request({ url: '/api/v1/auth/login', method: 'POST', data })
}

/** 租户登录 */
export const tenantLogin = (data: LoginParams): Promise<ApiResponse<LoginResult>> => {
  return request({ url: '/api/v1/auth/tenant/login', method: 'POST', data })
}

/** 获取当前用户信息 */
export const getUserInfo = (): Promise<ApiResponse<{ user: UserInfo }>> => {
  return http.get('/api/v1/auth/me')
}

/** 修改密码 */
export const changePassword = (data: { oldPassword: string; newPassword: string }) => {
  return http.post('/api/v1/auth/change-password', data)
}

/** 刷新 Token */
export const refreshToken = () => {
  return http.post('/api/v1/auth/refresh')
}

/** 根据用户名搜索租户 */
export const searchTenantsByUsername = (username: string) => {
  return http.get('/api/v1/auth/search-tenants', { username })
}
