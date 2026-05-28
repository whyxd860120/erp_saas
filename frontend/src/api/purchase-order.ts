import { request } from './http'

// 采购订单参数
export interface PurchaseOrderParams {
  page?: number
  limit?: number
  status?: string
  supplierId?: string
  startDate?: string
  endDate?: string
}

// 创建/更新采购订单参数
export interface CreatePurchaseOrderParams {
  supplierId: string
  items: Array<{
    productId: string
    quantity: number
    unitPrice?: number
    price?: number
  }>
  remark?: string
}

// 获取采购订单列表
export const getPurchaseOrders = (params?: PurchaseOrderParams) => {
  return request({
    url: '/api/v1/purchase-orders',
    method: 'get',
    params
  })
}

// 获取采购订单详情
export const getPurchaseOrderById = (id: string) => {
  return request({
    url: `/api/v1/purchase-orders/${id}`,
    method: 'get'
  })
}

// 创建采购订单
export const createPurchaseOrder = (data: CreatePurchaseOrderParams) => {
  return request({
    url: '/api/v1/purchase-orders',
    method: 'post',
    data
  })
}

// 更新采购订单
export const updatePurchaseOrder = (id: string, data: Partial<CreatePurchaseOrderParams>) => {
  return request({
    url: `/api/v1/purchase-orders/${id}`,
    method: 'put',
    data
  })
}

// 确认采购订单
export const confirmPurchaseOrder = (id: string) => {
  return request({
    url: `/api/v1/purchase-orders/${id}/confirm`,
    method: 'post'
  })
}

// 删除采购订单
export const deletePurchaseOrder = (id: string) => {
  return request({
    url: `/api/v1/purchase-orders/${id}`,
    method: 'delete'
  })
}

// 导入采购订单
export const importPurchaseOrders = (data: any[]) => {
  return request({
    url: '/api/v1/purchase-orders/import',
    method: 'post',
    data
  })
}