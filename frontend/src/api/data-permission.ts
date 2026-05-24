import http from '@/api/http'

// 获取角色的数据权限规则
export const getDataPermissionRules = (roleId: string) => {
  return http({
    url: `/data-permissions/${roleId}`,
    method: 'get'
  })
}

// 创建数据权限规则
export const createDataPermissionRule = (data: any) => {
  return http({
    url: '/data-permissions',
    method: 'post',
    data
  })
}

// 更新数据权限规则
export const updateDataPermissionRule = (id: string, data: any) => {
  return http({
    url: `/data-permissions/${id}`,
    method: 'put',
    data
  })
}

// 删除数据权限规则
export const deleteDataPermissionRule = (id: string) => {
  return http({
    url: `/data-permissions/${id}`,
    method: 'delete'
  })
}

// 批量设置角色的数据权限规则
export const batchSetDataPermissionRules = (roleId: string, rules: any[]) => {
  return http({
    url: `/data-permissions/batch/${roleId}`,
    method: 'post',
    data: { rules }
  })
}