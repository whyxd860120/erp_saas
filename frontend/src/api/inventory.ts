import { request } from './http'

// 库存查询参数
export interface InventoryParams {
  page?: number
  limit?: number
  warehouseId?: string
  categoryId?: string
  brandId?: string
  keyword?: string
  stockStatus?: string
  search?: string
  lowStock?: boolean
}

// 库存调整参数
export interface AdjustInventoryParams {
  quantity: number
  type?: 'increase' | 'decrease' | 'set'
  reason?: string
  remark?: string
}

// 库存调拨参数
export interface TransferInventoryParams {
  targetWarehouseId: string
  quantity: number
  remark?: string
}

// 获取库存列表
export const getInventory = (params?: InventoryParams) => {
  return request({
    url: '/api/v1/inventory',
    method: 'get',
    params
  })
}

// 获取库存详情
export const getInventoryById = (id: string) => {
  return request({
    url: `/api/v1/inventory/${id}`,
    method: 'get'
  })
}

// 获取库存变动日志
export const getInventoryLogs = (params?: any) => {
  return request({
    url: '/api/v1/inventory/logs',
    method: 'get',
    params
  })
}

// 库存调整
export const adjustInventory = (id: string, data: AdjustInventoryParams) => {
  return request({
    url: `/api/v1/inventory/${id}/adjust`,
    method: 'post',
    data
  })
}

// 获取库存汇总
export const getInventorySummary = (params?: any) => {
  return request({
    url: '/api/v1/inventory/summary',
    method: 'get',
    params
  })
}

// 库存调拨
export const transferInventory = (id: string, data: TransferInventoryParams) => {
  return request({
    url: `/api/v1/inventory/${id}/transfer`,
    method: 'post',
    data
  })
}
