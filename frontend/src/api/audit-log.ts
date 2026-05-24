import { request } from './http'

// 审计日志参数
export interface AuditLogParams {
  page?: number
  limit?: number
  userId?: string
  action?: string
  module?: string
  startDate?: string
  endDate?: string
}

// 获取审计日志列表
export const getAuditLogs = (params?: AuditLogParams) => {
  return request({
    url: '/api/v1/audit-logs',
    method: 'get',
    params
  })
}

// 获取审计日志详情
export const getAuditLogDetail = (id: string) => {
  return request({
    url: `/api/v1/audit-logs/${id}`,
    method: 'get'
  })
}

// 导出审计日志
export const exportAuditLogs = (params?: AuditLogParams) => {
  return request({
    url: '/api/v1/audit-logs/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}
