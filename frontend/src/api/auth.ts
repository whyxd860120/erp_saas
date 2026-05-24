import { request } from './http'

// 登录参数
export interface LoginParams {
  username: string
  password: string
  tenantSlug?: string
}

// 注册参数
export interface RegisterParams {
  name: string
  email: string
  password: string
  tenantName: string
  tenantSlug: string
}

// 登录响应
export interface LoginResult {
  success: boolean
  message: string
  data: {
    token: string
    user: any
    tenant: any
  }
}

// 租户登录 API
export const tenantLogin = (data: LoginParams) => {
  return request({
    url: '/api/v1/auth/tenant/login',
    method: 'post',
    data
  })
}

// 统一登录 API（系统用户或租户用户）
export const login = (data: LoginParams) => {
  return request({
    url: '/api/v1/auth/login',
    method: 'post',
    data
  })
}

// 注册 API
export const register = (data: RegisterParams) => {
  return request({
    url: '/api/v1/auth/register',
    method: 'post',
    data
  })
}

// 登出 API
export const logout = () => {
  return request({
    url: '/api/v1/auth/logout',
    method: 'post'
  })
}

// 获取用户信息
export const getUserInfo = () => {
  return request({
    url: '/api/v1/auth/me',
    method: 'get'
  })
}

// 修改密码
export const changePassword = (data: { oldPassword: string; newPassword: string }) => {
  return request({
    url: '/api/v1/auth/change-password',
    method: 'post',
    data
  })
}

// 刷新 Token
export const refreshToken = () => {
  return request({
    url: '/api/v1/auth/refresh',
    method: 'post'
  })
}

// 搜索租户（根据用户名）
export const searchTenantsByUsername = (username: string) => {
  return request({
    url: '/api/v1/auth/search-tenants',
    method: 'get',
    params: { username }
  })
}

