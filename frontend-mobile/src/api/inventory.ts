import { http } from '@/utils/http'
import type { ApiResponse } from '@/utils/http'

// ========== 类型定义 ==========

export interface InventoryItem {
  id: string
  productId: string
  productName: string
  productCode: string
  productSpec?: string
  productUnit?: string
  warehouseId: string
  warehouseName: string
  quantity: number
  lockedQuantity: number
  availableQuantity: number
  costPrice?: number
  totalCost?: number
  batchNo?: string
  serialNo?: string
  productionDate?: string
  expiryDate?: string
}

export interface InventoryQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  warehouseId?: string
  productCategoryId?: string
  minQuantity?: number
  maxQuantity?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ========== API 方法 ==========

/** 库存列表查询 */
export const getInventoryList = (params?: InventoryQueryParams) => {
  return http.get<ApiResponse<PaginatedResult<InventoryItem>>>('/api/v1/inventory', params as Record<string, unknown>)
}

/** 库存详情 */
export const getInventoryDetail = (id: string) => {
  return http.get<ApiResponse<InventoryItem>>(`/api/v1/inventory/${id}`)
}

/** 库存变动日志 */
export const getInventoryLogs = (productId: string, params?: { page?: number; pageSize?: number }) => {
  return http.get(`/api/v1/inventory/${productId}/logs`, params as Record<string, unknown>)
}
