import { http } from '@/utils/http'
import type { ApiResponse } from '@/utils/http'
import type { PaginatedResult } from './inventory'

// ========== 类型定义 ==========

export interface Product {
  id: string
  code: string
  name: string
  categoryId?: string
  categoryName?: string
  spec?: string
  unit?: string
  barcode?: string
  purchasePrice?: number
  salePrice?: number
  imageUrl?: string
  remark?: string
  status: string
}

export interface ProductQueryParams {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: string
  status?: string
}

// ========== API 方法 ==========

/** 商品列表 */
export const getProductList = (params?: ProductQueryParams) => {
  return http.get<ApiResponse<PaginatedResult<Product>>>('/api/v1/products', params as Record<string, unknown>)
}

/** 商品详情 */
export const getProductDetail = (id: string) => {
  return http.get<ApiResponse<Product>>(`/api/v1/products/${id}`)
}

/** 扫码查询商品（根据条码） */
export const getProductByBarcode = (barcode: string) => {
  return http.get<ApiResponse<Product>>('/api/v1/products/by-barcode', { barcode })
}
