import { http } from '@/utils/http'
import type { ApiResponse } from '@/utils/http'
import type { PaginatedResult } from './inventory'

// ========== 类型定义 ==========

export interface PurchaseOrder {
  id: string
  orderNo: string
  supplierId: string
  supplierName: string
  orderDate: string
  totalAmount: number
  status: string
  remark?: string
  createdAt: string
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  productId: string
  productName: string
  productCode: string
  spec?: string
  unit?: string
  quantity: number
  unitPrice: number
  amount: number
  receivedQuantity?: number
}

export interface OrderQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  supplierId?: string
  startDate?: string
  endDate?: string
}

// ========== API 方法 ==========

/** 采购订单列表 */
export const getPurchaseOrders = (params?: OrderQueryParams) => {
  return http.get<ApiResponse<PaginatedResult<PurchaseOrder>>>('/api/v1/purchase-orders', params as Record<string, unknown>)
}

/** 采购订单详情 */
export const getPurchaseOrderDetail = (id: string) => {
  return http.get<ApiResponse<PurchaseOrder>>(`/api/v1/purchase-orders/${id}`)
}
