import { request } from './http'

// 调拨单查询参数
export interface StockTransferParams {
  page?: number
  limit?: number
  status?: string
  fromWarehouseId?: string
  toWarehouseId?: string
  transferNo?: string
  startDate?: string
  endDate?: string
}

// 调拨单明细
export interface StockTransferDetail {
  productId: string
  quantity: number
  unitCost?: number
  amount?: number
  batchNo?: string
}

// 创建调拨单参数
export interface CreateStockTransferParams {
  transferNo?: string
  fromWarehouseId: string
  toWarehouseId: string
  transferDate?: string
  remark?: string
  details: StockTransferDetail[]
}

// 获取调拨单列表
export const getStockTransfers = (params?: StockTransferParams) => {
  return request({
    url: '/api/v1/stock-transfers',
    method: 'get',
    params
  })
}

// 获取调拨单详情
export const getStockTransferById = (id: string) => {
  return request({
    url: `/api/v1/stock-transfers/${id}`,
    method: 'get'
  })
}

// 创建调拨单
export const createStockTransfer = (data: CreateStockTransferParams) => {
  return request({
    url: '/api/v1/stock-transfers',
    method: 'post',
    data
  })
}

// 确认调拨单
export const confirmStockTransfer = (id: string) => {
  return request({
    url: `/api/v1/stock-transfers/${id}/confirm`,
    method: 'post'
  })
}

// 取消调拨单
export const cancelStockTransfer = (id: string) => {
  return request({
    url: `/api/v1/stock-transfers/${id}/cancel`,
    method: 'post'
  })
}

// 删除调拨单
export const deleteStockTransfer = (id: string) => {
  return request({
    url: `/api/v1/stock-transfers/${id}`,
    method: 'delete'
  })
}