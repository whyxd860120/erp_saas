import { http } from '@/utils/http'
import type { ApiResponse } from '@/utils/http'
import type { PaginatedResult } from './inventory'

// ========== 类型定义 ==========

export interface SalesOrder {
  id: string
  orderNo: string
  customerId: string
  customerName: string
  orderDate: string
  totalAmount: number
  status: string
  remark?: string
  createdAt: string
  items?: SalesOrderItem[]
}

export interface SalesOrderItem {
  id: string
  productId: string
  productName: string
  productCode: string
  spec?: string
  unit?: string
  quantity: number
  unitPrice: number
  amount: number
  shippedQuantity?: number
}

// ========== API 方法 ==========

/** 销售订单列表 */
export const getSalesOrders = (params?: Record<string, unknown>) => {
  return http.get<ApiResponse<PaginatedResult<SalesOrder>>>('/api/v1/sales-orders', params)
}

/** 销售订单详情 */
export const getSalesOrderDetail = (id: string) => {
  return http.get<ApiResponse<SalesOrder>>(`/api/v1/sales-orders/${id}`)
}
