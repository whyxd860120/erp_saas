import { request } from './http'

// 销售订单参数
export interface SalesOrderParams {
  page?: number
  limit?: number
  status?: string
  customerId?: string
  startDate?: string
  endDate?: string
}

// 创建/更新销售订单参数
export interface CreateSalesOrderParams {
  customerId: string
  items: Array<{
    productId: string
    quantity: number
    unitPrice?: number
    price?: number
  }>
  remark?: string
}

// 获取销售订单列表
export const getSalesOrders = (params?: SalesOrderParams) => {
  return request({
    url: '/api/v1/sales-orders',
    method: 'get',
    params
  })
}

// 获取销售订单详情
export const getSalesOrderById = (id: string) => {
  return request({
    url: `/api/v1/sales-orders/${id}`,
    method: 'get'
  })
}

// 创建销售订单
export const createSalesOrder = (data: CreateSalesOrderParams) => {
  return request({
    url: '/api/v1/sales-orders',
    method: 'post',
    data
  })
}

// 更新销售订单
export const updateSalesOrder = (id: string, data: Partial<CreateSalesOrderParams>) => {
  return request({
    url: `/api/v1/sales-orders/${id}`,
    method: 'put',
    data
  })
}

// 确认销售订单
export const confirmSalesOrder = (id: string) => {
  return request({
    url: `/api/v1/sales-orders/${id}/confirm`,
    method: 'post'
  })
}

// 删除销售订单
export const deleteSalesOrder = (id: string) => {
  return request({
    url: `/api/v1/sales-orders/${id}`,
    method: 'delete'
  })
}

// 获取销售统计（可选）
export const getSalesStats = (params?: { startDate?: string; endDate?: string }) => {
  return request({
    url: '/api/v1/sales-orders/stats',
    method: 'get',
    params
  })
}
