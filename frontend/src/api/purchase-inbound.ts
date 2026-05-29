import { request } from './http'

// 采购入库单查询参数
export interface PurchaseInboundParams {
  page?: number
  limit?: number
  status?: string
  orderId?: string
  warehouseId?: string
  startDate?: string
  endDate?: string
  search?: string
}

// 采购入库单明细
export interface PurchaseInboundDetail {
  productId: string
  quantity: number
  unitPrice: number
  amount?: number
  batchNo?: string
  productionDate?: string
  expiryDate?: string
}

// 创建采购入库单参数
export interface CreatePurchaseInboundParams {
  inboundNo?: string
  orderId?: string
  warehouseId: string
  inboundDate?: string
  remark?: string
  details: PurchaseInboundDetail[]
}

// 获取采购入库单列表
export const getPurchaseInbounds = (params?: PurchaseInboundParams) => {
  return request({
    url: '/api/v1/purchase-inbounds',
    method: 'get',
    params
  })
}

// 获取采购入库单详情
export const getPurchaseInboundById = (id: string) => {
  return request({
    url: `/api/v1/purchase-inbounds/${id}`,
    method: 'get'
  })
}

// 创建采购入库单
export const createPurchaseInbound = (data: CreatePurchaseInboundParams) => {
  return request({
    url: '/api/v1/purchase-inbounds',
    method: 'post',
    data
  })
}

// 确认采购入库单
export const confirmPurchaseInbound = (id: string) => {
  return request({
    url: `/api/v1/purchase-inbounds/${id}/confirm`,
    method: 'post'
  })
}

// 反确认采购入库单
export const unconfirmPurchaseInbound = (id: string) => {
  return request({
    url: `/api/v1/purchase-inbounds/${id}/unconfirm`,
    method: 'post'
  })
}

// 删除采购入库单
export const deletePurchaseInbound = (id: string) => {
  return request({
    url: `/api/v1/purchase-inbounds/${id}`,
    method: 'delete'
  })
}

// 更新采购入库单
export const updatePurchaseInbound = (id: string, data: Partial<CreatePurchaseInboundParams>) => {
  return request({
    url: `/api/v1/purchase-inbounds/${id}`,
    method: 'put',
    data
  })
}
