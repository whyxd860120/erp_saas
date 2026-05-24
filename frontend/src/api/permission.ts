import { request } from './http'

// 获取权限树
export const getPermissions = () => {
  return request({
    url: '/api/v1/permissions',
    method: 'get'
  })
}

// 获取当前用户权限
export const getMyPermissions = () => {
  return request({
    url: '/api/v1/permissions/me',
    method: 'get'
  })
}

// 获取当前用户菜单
export const getMyMenu = () => {
  return request({
    url: '/api/v1/permissions/menu',
    method: 'get'
  })
}
