import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http, setToken, clearToken, type ApiResponse } from '@/utils/http'

interface ShopUser { id: string; nickname: string; avatarUrl: string; mobile: string }
interface CartInfo { totalCount: number; totalAmount: number }

const API = '/api/v1/shop'

export const useShopStore = defineStore('shop', () => {
  const token = ref<string>(uni.getStorageSync('shop_token') || '')
  const user = ref<ShopUser | null>(null)
  const cartInfo = ref<CartInfo>({ totalCount: 0, totalAmount: 0 })
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  async function login(code: string, nickname?: string, avatarUrl?: string) {
    const res = await http.post<ApiResponse<{ token: string; user: ShopUser }>>(
      `${API}/auth/login`, { code, nickname, avatarUrl }, false
    )
    if (!res.success || !res.data.token) throw new Error(res.message || '登录失败')
    token.value = res.data.token
    setToken(res.data.token)
    user.value = res.data.user
    return res.data
  }

  async function fetchProfile() {
    if (!token.value) return
    try {
      const res = await http.get<ApiResponse<ShopUser>>(`${API}/auth/me`)
      if (res.success) user.value = res.data
    } catch { clearAuth() }
  }

  async function fetchCartInfo() {
    if (!token.value) return
    try {
      const res = await http.get<ApiResponse<{ items: any[]; totalCount: number; totalAmount: number }>>(`${API}/cart`)
      if (res.success) cartInfo.value = { totalCount: res.data.totalCount, totalAmount: res.data.totalAmount }
    } catch { /* ignore */ }
  }

  function clearAuth() {
    token.value = ''
    user.value = null
    cartInfo.value = { totalCount: 0, totalAmount: 0 }
    clearToken()
  }

  function logout() {
    clearAuth()
    uni.reLaunch({ url: '/pages/index/index' })
  }

  return { token, user, cartInfo, isLoggedIn, login, fetchProfile, fetchCartInfo, logout, clearAuth }
})
