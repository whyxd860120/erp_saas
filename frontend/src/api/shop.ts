import request from './http'

// 商城管理端 API（使用后端 /api/v1/shop/manage 路径，需要 ERP 认证）
const BASE = '/api/v1/shop/manage'

// ---- 商品上架管理 ----
export const getShopProducts = (params?: any) =>
  request({ url: `${BASE}/products`, method: 'GET', params })
export const publishProduct = (data: any) =>
  request({ url: `${BASE}/products`, method: 'POST', data })
export const updateShopProduct = (id: string, data: any) =>
  request({ url: `${BASE}/products/${id}`, method: 'PUT', data })
export const unpublishProduct = (id: string) =>
  request({ url: `${BASE}/products/${id}`, method: 'DELETE' })

// ---- 商城订单管理 ----
export const getShopOrders = (params?: any) =>
  request({ url: `${BASE}/orders`, method: 'GET', params })
export const getShopOrderById = (id: string) =>
  request({ url: `${BASE}/orders/${id}`, method: 'GET' })
export const updateShopOrder = (id: string, data: any) =>
  request({ url: `${BASE}/orders/${id}`, method: 'PUT', data })

// ---- 商城用户管理 ----
export const getShopUsers = (params?: any) =>
  request({ url: `${BASE}/users`, method: 'GET', params })
export const updateShopUserStatus = (id: string, status: string) =>
  request({ url: `${BASE}/users/${id}/status`, method: 'PUT', data: { status } })
