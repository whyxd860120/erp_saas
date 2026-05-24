import { request } from './http'

export interface CustomerCategory {
  id: string
  name: string
  parentId?: string | null
  sortOrder?: number
  status?: string
  children?: CustomerCategory[]
}

export interface CustomerParams {
  page?: number
  limit?: number
  status?: string
  search?: string
  categoryId?: string
}

export interface CreateCustomerParams {
  code: string
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  taxNo?: string
  bankAccount?: string
  employeeId?: string
  categoryId?: string
  status?: string
  remark?: string
}

// 客户分类管理
export const getCustomerCategoryTree = () =>
  request({ url: '/api/v1/customers/categories/tree', method: 'get' })

export const getCustomerCategories = (params?: { status?: string }) =>
  request({ url: '/api/v1/customers/categories', method: 'get', params })

export const createCustomerCategory = (data: { name: string; parentId?: string | null; sortOrder?: number }) =>
  request({ url: '/api/v1/customers/categories', method: 'post', data })

export const updateCustomerCategory = (id: string, data: Partial<{ name: string; parentId?: string | null; sortOrder?: number; status?: string }>) =>
  request({ url: `/api/v1/customers/categories/${id}`, method: 'put', data })

export const deleteCustomerCategory = (id: string) =>
  request({ url: `/api/v1/customers/categories/${id}`, method: 'delete' })

export const importCustomerCategories = (data: any[]) =>
  request({ url: '/api/v1/customers/categories/import', method: 'post', data })

// 客户管理
export const getCustomerTree = (params?: Omit<CustomerParams, 'page' | 'limit'>) =>
  request({ url: '/api/v1/customers/tree', method: 'get', params })

export const getCustomers = (params?: CustomerParams) =>
  request({ url: '/api/v1/customers', method: 'get', params })

export const getCustomerById = (id: string) =>
  request({ url: `/api/v1/customers/${id}`, method: 'get' })

export const createCustomer = (data: CreateCustomerParams) =>
  request({ url: '/api/v1/customers', method: 'post', data })

export const updateCustomer = (id: string, data: Partial<CreateCustomerParams>) =>
  request({ url: `/api/v1/customers/${id}`, method: 'put', data })

export const deleteCustomer = (id: string) =>
  request({ url: `/api/v1/customers/${id}`, method: 'delete' })

export const importCustomers = (data: any[]) =>
  request({ url: '/api/v1/customers/import', method: 'post', data })

// 状态切换
export const toggleCustomerStatus = (id: string, status: string) =>
  request({ url: `/api/v1/customers/${id}/status`, method: 'patch', data: { status } })
