import { request } from './http'

// 角色参数
export interface RoleParams {
  page?: number
  limit?: number
  search?: string
}

export interface CreateRoleParams {
  name: string
  code: string
  description?: string
}

export interface UpdateRoleParams {
  name?: string
  description?: string
  status?: string
}

// 获取角色列表
export const getRoles = (params?: RoleParams) => {
  return request({
    url: '/api/v1/roles',
    method: 'get',
    params
  })
}

// 获取角色详情
export const getRoleDetail = (id: string) => {
  return request({
    url: `/api/v1/roles/${id}`,
    method: 'get'
  })
}

// 创建角色
export const createRole = (data: CreateRoleParams) => {
  return request({
    url: '/api/v1/roles',
    method: 'post',
    data
  })
}

// 更新角色
export const updateRole = (id: string, data: UpdateRoleParams) => {
  return request({
    url: `/api/v1/roles/${id}`,
    method: 'put',
    data
  })
}

// 删除角色
export const deleteRole = (id: string) => {
  return request({
    url: `/api/v1/roles/${id}`,
    method: 'delete'
  })
}

// 获取角色权限
export const getRolePermissions = (id: string) => {
  return request({
    url: `/api/v1/roles/${id}/permissions`,
    method: 'get'
  })
}

// 更新角色权限
export const updateRolePermissions = (id: string, data: { permissionIds: string[] }) => {
  return request({
    url: `/api/v1/roles/${id}/permissions`,
    method: 'put',
    data
  })
}
