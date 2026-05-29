import { request } from './http'

// 销售出库单查询参数
export interface SalesOutboundParams {
  page?: number
  limit?: number
  status?: string
  orderId?: string
  warehouseId?: string
  startDate?: string
  endDate?: string
  search?: string
}

// 销售出库单明细
export interface SalesOutboundDetail {
  productId: string
  quantity: number
  unitPrice: number
  amount?: number
  batchNo?: string
}

// 创建销售出库单参数
export interface CreateSalesOutboundParams {
  outboundNo?: string
  orderId?: string
  warehouseId: string
  outboundDate?: string
  remark?: string
  details: SalesOutboundDetail[]
}

// 获取销售出库单列表
export const getSalesOutbounds = (params?: SalesOutboundParams) => {
  return request({
    url: '/api/v1/sales-outbounds',
    method: 'get',
    params
  })
}

// 获取销售出库单详情
export const getSalesOutboundById = (id: string) => {
  return request({
    url: `/api/v1/sales-outbounds/${id}`,
    method: 'get'
  })
}

// 创建销售出库单
export const createSalesOutbound = (data: CreateSalesOutboundParams) => {
  return request({
    url: '/api/v1/sales-outbounds',
    method: 'post',
    data
  })
}

// 确认销售出库单
export const confirmSalesOutbound = (id: string) => {
  return request({
    url: `/api/v1/sales-outbounds/${id}/confirm`,
    method: 'post'
  })
}

// 反确认销售出库单
export const unconfirmSalesOutbound = (id: string) => {
  return request({
    url: `/api/v1/sales-outbounds/${id}/unconfirm`,
    method: 'post'
  })
}

// 删除销售出库单
export const deleteSalesOutbound = (id: string) => {
  return request({
    url: `/api/v1/sales-outbounds/${id}`,
    method: 'delete'
  })
}

// 更新销售出库单
export const updateSalesOutbound = (id: string, data: Partial<CreateSalesOutboundParams>) => {
  return request({
    url: `/api/v1/sales-outbounds/${id}`,
    method: 'put',
    data
  })
}
