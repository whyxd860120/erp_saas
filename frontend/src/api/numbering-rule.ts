import { request } from './http'

// 编码规则参数
export interface NumberingRuleParams {
  businessType?: string
  status?: string
}

// 创建/更新编码规则参数
export interface CreateNumberingRuleParams {
  businessType: string
  name: string
  prefix: string
  dateFormat?: string
  sequenceLength?: number
  startNumber?: number
  resetType?: string
  separator?: string
  status?: string
}

// 获取编码规则列表
export const getNumberingRules = (params?: NumberingRuleParams) => {
  return request({
    url: '/api/v1/numbering-rules',
    method: 'get',
    params
  })
}

// 获取编码规则详情
export const getNumberingRuleById = (id: string) => {
  return request({
    url: `/api/v1/numbering-rules/${id}`,
    method: 'get'
  })
}

// 创建编码规则
export const createNumberingRule = (data: CreateNumberingRuleParams) => {
  return request({
    url: '/api/v1/numbering-rules',
    method: 'post',
    data
  })
}

// 更新编码规则
export const updateNumberingRule = (id: string, data: Partial<CreateNumberingRuleParams>) => {
  return request({
    url: `/api/v1/numbering-rules/${id}`,
    method: 'put',
    data
  })
}

// 删除编码规则
export const deleteNumberingRule = (id: string) => {
  return request({
    url: `/api/v1/numbering-rules/${id}`,
    method: 'delete'
  })
}

// 生成下一个编号
export const generateNextNumber = (businessType: string) => {
  return request({
    url: `/api/v1/numbering-rules/${businessType}/generate`,
    method: 'post',
    data: {}
  })
}
