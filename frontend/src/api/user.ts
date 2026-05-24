import { request } from './http'

// 用户参数
export interface UserParams {
  page?: number
  limit?: number
  keyword?: string
  role?: string
  status?: string
  departmentId?: string
  isSystemUser?: boolean
}

// 创建/更新用户参数
export interface CreateUserParams {
  code: string
  name: string
  username?: string
  password?: string
  phone?: string
  isSystemUser?: boolean
  departmentId?: string
  positionId?: string
  gender?: string
  birthDate?: string
  hireDate?: string
  address?: string
  idCard?: string
  role?: string
  status?: string
  remark?: string
}

// 获取用户列表
export const getUsers = (params?: UserParams) => {
  return request({
    url: '/api/v1/users',
    method: 'get',
    params
  })
}

// 获取用户详情
export const getUserDetail = (id: string) => {
  return request({
    url: `/api/v1/users/${id}`,
    method: 'get'
  })
}

// 创建用户/人员
export const createUser = (data: CreateUserParams) => {
  return request({
    url: '/api/v1/users',
    method: 'post',
    data
  })
}

// 更新用户/人员
export const updateUser = (id: string, data: Partial<CreateUserParams>) => {
  return request({
    url: `/api/v1/users/${id}`,
    method: 'put',
    data
  })
}

// 删除用户/人员
export const deleteUser = (id: string) => {
  return request({
    url: `/api/v1/users/${id}`,
    method: 'delete'
  })
}

// 更新用户状态
export const updateUserStatus = (id: string, status: string) => {
  return request({
    url: `/api/v1/users/${id}/status`,
    method: 'patch',
    data: { status }
  })
}

// 重置密码
export const resetPassword = (id: string, data: { password: string }) => {
  return request({
    url: `/api/v1/users/${id}/reset-password`,
    method: 'post',
    data
  })
}
