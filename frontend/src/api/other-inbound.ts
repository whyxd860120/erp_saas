import { request } from './http'

// 获取其他入库单列表
export const getOtherInbounds = (params: any) => {
  return request({
    url: '/other-inbound',
    method: 'get',
    params
  })
}

// 获取其他入库单详情
export const getOtherInboundDetail = (id: string) => {
  return request({
    url: `/other-inbound/${id}`,
    method: 'get'
  })
}

// 创建其他入库单
export const createOtherInbound = (data: any) => {
  return request({
    url: '/other-inbound',
    method: 'post',
    data
  })
}

// 更新其他入库单
export const updateOtherInbound = (id: string, data: any) => {
  return request({
    url: `/other-inbound/${id}`,
    method: 'put',
    data
  })
}

// 确认其他入库单
export const confirmOtherInbound = (id: string) => {
  return request({
    url: `/other-inbound/${id}/confirm`,
    method: 'post'
  })
}

// 取消其他入库单
export const cancelOtherInbound = (id: string) => {
  return request({
    url: `/other-inbound/${id}/cancel`,
    method: 'post'
  })
}

// 删除其他入库单
export const deleteOtherInbound = (id: string) => {
  return request({
    url: `/other-inbound/${id}`,
    method: 'delete'
  })
}