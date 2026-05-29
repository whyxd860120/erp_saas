/**
 * UniApp 环境下的 HTTP 请求封装
 * 适配 uni.request，保持与 Web 端 request 一致的调用风格
 */

// API 基础地址配置
// 开发环境：H5 走 Vite 代理，App/小程序走完整地址
// 生产环境：通过环境变量配置
function getApiBaseURL(): string {
  // #ifdef H5
  if (process.env.NODE_ENV === 'development') {
    return '' // H5 开发环境走 Vite 代理
  }
  // #endif
  return process.env.VITE_API_BASE_URL || 'http://localhost:3000'
}

const BASE_URL = getApiBaseURL()

// 统一响应结构
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data: T
}

// 请求配置
export interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: Record<string, unknown>
  params?: Record<string, unknown>
  header?: Record<string, string>
  timeout?: number
}

// Token 存储 key
const TOKEN_KEY = 'erp_token'
const TENANT_KEY = 'erp_tenant'

/**
 * 获取存储的 Token
 */
function getToken(): string {
  try {
    return uni.getStorageSync(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

/**
 * 设置 Token
 */
export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token)
}

/**
 * 清除 Token
 */
export function clearToken(): void {
  uni.removeStorageSync(TOKEN_KEY)
}

/**
 * 获取存储的租户信息
 */
export function getStoredTenant(): { slug: string; name: string } | null {
  try {
    const raw = uni.getStorageSync(TENANT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * 设置租户信息
 */
export function setStoredTenant(tenant: { slug: string; name: string }): void {
  uni.setStorageSync(TENANT_KEY, JSON.stringify(tenant))
}

/**
 * 构建完整 URL（拼接 baseURL 和 query 参数）
 */
function buildURL(url: string, params?: Record<string, unknown>): string {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  if (!params) return fullUrl

  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')

  return query ? `${fullUrl}?${query}` : fullUrl
}

/**
 * 核心请求函数
 */
export function request<T = unknown>(config: RequestConfig): Promise<T> {
  const { url, method = 'GET', data, params, header = {}, timeout = 15000 } = config

  const token = getToken()

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: buildURL(url, params),
      method,
      data,
      timeout,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...header,
      },
      success(res) {
        const statusCode = res.statusCode

        // 401 未授权
        if (statusCode === 401) {
          clearToken()
          // 跳转到登录页
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期，请重新登录'))
          return
        }

        // 2xx 成功
        if (statusCode >= 200 && statusCode < 300) {
          resolve(res.data as T)
          return
        }

        // 其他错误
        const body = res.data as ApiResponse
        const msg = body?.message || `请求失败(${statusCode})`

        uni.showToast({ title: msg, icon: 'none', duration: 2000 })
        reject(new Error(msg))
      },
      fail(err) {
        uni.showToast({ title: '网络错误，请检查网络连接', icon: 'none', duration: 2000 })
        reject(err)
      },
    })
  })
}

/**
 * 便捷方法
 */
export const http = {
  get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>({ url, method: 'GET', params })
  },
  post<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
    return request<T>({ url, method: 'POST', data })
  },
  put<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
    return request<T>({ url, method: 'PUT', data })
  },
  delete<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>({ url, method: 'DELETE', params })
  },
}

export default request
