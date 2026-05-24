import { request } from './http'

// 获取用户角色
export const getUserRoles = (userId: string) => {
  return request({
    url: `/api/v1/users/${userId}/roles`,
    method: 'get'
  })
}

// 更新用户角色
export const updateUserRoles = (userId: string, data: { roleIds: string[] }) => {
  return request({
    url: `/api/v1/users/${userId}/roles`,
    method: 'put',
    data
  })
}
