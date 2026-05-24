import { request } from './http'

// 获取其他出库单列表
export const getOtherOutbounds = (params: any) => {
  return request({
    url: '/other-outbound',
    method: 'get',
    params
  })
}

// 获取其他出库单详情
export const getOtherOutboundDetail = (id: string) => {
  return request({
    url: `/other-outbound/${id}`,
    method: 'get'
  })
}

// 创建其他出库单
export const createOtherOutbound = (data: any) => {
  return request({
    url: '/other-outbound',
    method: 'post',
    data
  })
}

// 更新其他出库单
export const updateOtherOutbound = (id: string, data: any) => {
  return request({
    url: `/other-outbound/${id}`,
    method: 'put',
    data
  })
}

// 确认其他出库单
export const confirmOtherOutbound = (id: string) => {
  return request({
    url: `/other-outbound/${id}/confirm`,
    method: 'post'
  })
}

// 取消其他出库单
export const cancelOtherOutbound = (id: string) => {
  return request({
    url: `/other-outbound/${id}/cancel`,
    method: 'post'
  })
}

// 删除其他出库单
export const deleteOtherOutbound = (id: string) => {
  return request({
    url: `/other-outbound/${id}`,
    method: 'delete'
  })
}