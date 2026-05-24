import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

function getApiBaseURL(): string {
  // 开发环境统一走 Vite 代理，避免跨域
  if (import.meta.env.DEV) {
    return ''
  }
  return import.meta.env.VITE_API_BASE_URL || ''
}

const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 5000, // 5秒超时
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const isLoginRequest = Boolean(error.config?.url?.includes('/auth/login'))

    if (error.response) {
      const { status, data } = error.response

      if (status === 401) {
        if (!isLoginRequest) {
          localStorage.removeItem('token')
          try {
            const { useAuthStore } = await import('../stores/auth')
            useAuthStore().clearAuth()
          } catch {
            // Pinia 未就绪时仅清理 localStorage
          }
          if (!window.location.pathname.startsWith('/login')) {
            ElMessage.error(data?.message || '登录已过期，请重新登录')
            window.location.href = '/login'
          }
        }
      } else if (!isLoginRequest) {
        ElMessage.error(data?.message || '请求失败')
      }
    } else if (!isLoginRequest) {
      ElMessage.error('网络错误，请检查后端服务是否已启动')
    }

    return Promise.reject(error)
  }
)

/** 统一请求：返回后端 JSON 主体 { success, data, message } */
export const request = async <T = unknown>(config: AxiosRequestConfig): Promise<T> => {
  const response = await api(config)
  return response.data as T
}

export { api }
export default request
