import { request } from './http'

// 产品参数
export interface ProductParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  status?: string
}

// 创建/更新产品参数
export interface CreateProductParams {
  name: string
  sku: string
  barcode?: string
  categoryId?: string
  unit?: string
  costPrice?: number
  sellPrice?: number
  stock?: number
  minStock?: number
  maxStock?: number
  description?: string
  image?: string
}

// 获取物料分类列表
export const getCategories = () => {
  return request({
    url: '/api/v1/products/categories',
    method: 'get'
  })
}

// 获取物料品牌列表
export const getBrands = () => {
  return request({
    url: '/api/v1/products/brands',
    method: 'get'
  })
}

// 创建物料分类
export const createCategory = (data: { name: string; parentId?: string; sortOrder?: number }) => {
  return request({
    url: '/api/v1/products/categories',
    method: 'post',
    data
  })
}

// 更新物料分类
export const updateCategory = (id: string, data: { name?: string; parentId?: string | null; sortOrder?: number; status?: string }) => {
  return request({
    url: `/api/v1/products/categories/${id}`,
    method: 'put',
    data
  })
}

// 删除物料分类
export const deleteCategory = (id: string) => {
  return request({
    url: `/api/v1/products/categories/${id}`,
    method: 'delete'
  })
}

// 导入物料分类
export const importCategories = (data: any[]) => {
  return request({
    url: '/api/v1/products/categories/import',
    method: 'post',
    data
  })
}

// 获取产品列表
export const getProducts = (params?: ProductParams) => {
  return request({
    url: '/api/v1/products',
    method: 'get',
    params
  })
}

// 获取产品详情
export const getProductById = (id: string) => {
  return request({
    url: `/api/v1/products/${id}`,
    method: 'get'
  })
}

// 创建产品
export const createProduct = (data: CreateProductParams) => {
  return request({
    url: '/api/v1/products',
    method: 'post',
    data
  })
}

// 更新产品
export const updateProduct = (id: string, data: Partial<CreateProductParams>) => {
  return request({
    url: `/api/v1/products/${id}`,
    method: 'put',
    data
  })
}

// 删除产品
export const deleteProduct = (id: string) => {
  return request({
    url: `/api/v1/products/${id}`,
    method: 'delete'
  })
}

// 更新产品库存
export const updateProductStock = (id: string, quantity: number, type: 'in' | 'out') => {
  return request({
    url: `/api/v1/products/${id}/stock`,
    method: 'patch',
    data: { quantity, type }
  })
}

// 获取库存预警物料
export const getLowStockProducts = () => {
  return request({
    url: '/api/v1/products/low-stock',
    method: 'get'
  })
}
