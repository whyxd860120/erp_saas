import { request } from './http'

export interface MenuItem {
  id: string
  name: string
  code: string
  type: string
  path?: string
  icon?: string
  parentId?: string
  sortOrder: number
  description?: string
  isSystem: boolean
  children?: MenuItem[]
  hasChildren?: boolean
}

export const getMenus = () => {
  return request({
    url: '/api/v1/menus',
    method: 'get'
  })
}

export const getMenusFlat = () => {
  return request({
    url: '/api/v1/menus/flat',
    method: 'get'
  })
}

export const getMenuById = (id: string) => {
  return request({
    url: `/api/v1/menus/${id}`,
    method: 'get'
  })
}

export const createMenu = (data: Partial<MenuItem>) => {
  return request({
    url: '/api/v1/menus',
    method: 'post',
    data
  })
}

export const updateMenu = (id: string, data: Partial<MenuItem>) => {
  return request({
    url: `/api/v1/menus/${id}`,
    method: 'put',
    data
  })
}

export const deleteMenu = (id: string) => {
  return request({
    url: `/api/v1/menus/${id}`,
    method: 'delete'
  })
}

export const batchUpdateMenus = (menus: any[]) => {
  return request({
    url: '/api/v1/menus/batch-update',
    method: 'post',
    data: { menus }
  })
}
