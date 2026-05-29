import { request } from './http'

export interface WarehouseParams {
  page?: number
  limit?: number
  status?: string
  search?: string
}

export interface CreateWarehouseParams {
  code: string
  name: string
  address?: string
  manager?: string
  status?: string
  isDefault?: boolean
}

export const getWarehouses = (params?: WarehouseParams) =>
  request({ url: '/api/v1/warehouses', method: 'get', params })

export const getWarehouseById = (id: string) =>
  request({ url: `/api/v1/warehouses/${id}`, method: 'get' })

export const getDefaultWarehouse = () =>
  request({ url: '/api/v1/warehouses/default', method: 'get' })

export const createWarehouse = (data: CreateWarehouseParams) =>
  request({ url: '/api/v1/warehouses', method: 'post', data })

export const updateWarehouse = (id: string, data: Partial<CreateWarehouseParams>) =>
  request({ url: `/api/v1/warehouses/${id}`, method: 'put', data })

export const deleteWarehouse = (id: string) =>
  request({ url: `/api/v1/warehouses/${id}`, method: 'delete' })
