import { request } from './http'

export interface SupplierCategory {
  id: string
  name: string
  parentId?: string | null
  sortOrder?: number
  status?: string
  children?: SupplierCategory[]
}

export interface SupplierParams {
  page?: number
  limit?: number
  status?: string
  search?: string
  categoryId?: string
}

export interface CreateSupplierParams {
  code: string
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  taxNo?: string
  bankAccount?: string
  categoryId?: string
  status?: string
  remark?: string
}

// 供应商分类管理
export const getSupplierCategoryTree = () =>
  request({ url: '/api/v1/suppliers/categories/tree', method: 'get' })

export const getSupplierCategories = (params?: { status?: string }) =>
  request({ url: '/api/v1/suppliers/categories', method: 'get', params })

export const createSupplierCategory = (data: { name: string; parentId?: string | null; sortOrder?: number }) =>
  request({ url: '/api/v1/suppliers/categories', method: 'post', data })

export const updateSupplierCategory = (id: string, data: Partial<{ name: string; parentId?: string | null; sortOrder?: number; status?: string }>) =>
  request({ url: `/api/v1/suppliers/categories/${id}`, method: 'put', data })

export const deleteSupplierCategory = (id: string) =>
  request({ url: `/api/v1/suppliers/categories/${id}`, method: 'delete' })

export const importSupplierCategories = (data: any[]) =>
  request({ url: '/api/v1/suppliers/categories/import', method: 'post', data })

// 供应商管理
export const getSupplierTree = (params?: Omit<SupplierParams, 'page' | 'limit'>) =>
  request({ url: '/api/v1/suppliers/tree', method: 'get', params })

export const getSuppliers = (params?: SupplierParams) =>
  request({ url: '/api/v1/suppliers', method: 'get', params })

export const getSupplierById = (id: string) =>
  request({ url: `/api/v1/suppliers/${id}`, method: 'get' })

export const createSupplier = (data: CreateSupplierParams) =>
  request({ url: '/api/v1/suppliers', method: 'post', data })

export const updateSupplier = (id: string, data: Partial<CreateSupplierParams>) =>
  request({ url: `/api/v1/suppliers/${id}`, method: 'put', data })

export const deleteSupplier = (id: string) =>
  request({ url: `/api/v1/suppliers/${id}`, method: 'delete' })

export const importSuppliers = (data: any[]) =>
  request({ url: '/api/v1/suppliers/import', method: 'post', data })

// 状态切换
export const toggleSupplierStatus = (id: string, status: string) =>
  request({ url: `/api/v1/suppliers/${id}/status`, method: 'patch', data: { status } })
