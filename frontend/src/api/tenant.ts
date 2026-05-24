import { request } from './http'

// 租户信息接口
export interface TenantInfo {
  id: string
  name: string
  domain?: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

// 创建租户参数
export interface CreateTenantParams {
  name: string
  domain?: string
}

// 更新租户参数
export interface UpdateTenantParams {
  name?: string
  domain?: string
  status?: 'active' | 'inactive'
}

// 获取租户列表
export const getTenants = (params?: {
  page?: number
  limit?: number
  status?: string
  keyword?: string
}) => {
  return request({
    url: '/api/v1/tenants',
    method: 'get',
    params
  })
}

// 获取租户详情
export const getTenantById = (id: string) => {
  return request({
    url: `/api/v1/tenants/${id}`,
    method: 'get'
  })
}

// 创建租户
export const createTenant = (data: CreateTenantParams) => {
  return request({
    url: '/api/v1/tenants',
    method: 'post',
    data
  })
}

// 更新租户
export const updateTenant = (id: string, data: UpdateTenantParams) => {
  return request({
    url: `/api/v1/tenants/${id}`,
    method: 'put',
    data
  })
}

// 删除租户
export const deleteTenant = (id: string) => {
  return request({
    url: `/api/v1/tenants/${id}`,
    method: 'delete'
  })
}

// 切换当前租户（用于多租户切换）
export const switchTenant = (tenantId: string) => {
  return request({
    url: `/api/v1/tenants/${tenantId}/switch`,
    method: 'post'
  })
}
