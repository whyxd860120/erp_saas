const TOKEN_KEY = 'shop_token'
const BASE_URL = ''

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data: T
}

function getToken(): string {
  try { return uni.getStorageSync(TOKEN_KEY) || '' } catch { return '' }
}

export function setToken(token: string): void { uni.setStorageSync(TOKEN_KEY, token) }
export function clearToken(): void { uni.removeStorageSync(TOKEN_KEY) }

function buildURL(url: string, params?: Record<string, unknown>): string {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
  if (!params) return fullUrl
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return query ? `${fullUrl}?${query}` : fullUrl
}

export function request<T = unknown>(config: {
  url: string; method?: string; data?: Record<string, unknown>; params?: Record<string, unknown>;
  header?: Record<string, string>; timeout?: number; auth?: boolean;
}): Promise<T> {
  const { url, method = 'GET', data, params, header = {}, timeout = 15000, auth = true } = config
  const token = getToken()

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: buildURL(url, params),
      method: method as any,
      data,
      timeout,
      header: {
        'Content-Type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...header,
      },
      success(res) {
        if (res.statusCode === 401) {
          clearToken()
          uni.reLaunch({ url: '/pages/index/index' })
          reject(new Error('登录已过期'))
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
          return
        }
        const body = res.data as ApiResponse
        uni.showToast({ title: body?.message || `请求失败(${res.statusCode})`, icon: 'none' })
        reject(new Error(body?.message))
      },
      fail(err) {
        uni.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
    })
  })
}

export const http = {
  get<T = unknown>(url: string, params?: Record<string, unknown>, auth = true): Promise<T> {
    return request<T>({ url, method: 'GET', params, auth })
  },
  post<T = unknown>(url: string, data?: Record<string, unknown>, auth = true): Promise<T> {
    return request<T>({ url, method: 'POST', data, auth })
  },
  put<T = unknown>(url: string, data?: Record<string, unknown>, auth = true): Promise<T> {
    return request<T>({ url, method: 'PUT', data, auth })
  },
  delete<T = unknown>(url: string, params?: Record<string, unknown>, auth = true): Promise<T> {
    return request<T>({ url, method: 'DELETE', params, auth })
  },
}

export default request
