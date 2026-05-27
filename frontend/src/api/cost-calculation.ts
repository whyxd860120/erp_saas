import { request } from './http'

// 入库成本核算
export const calculateInboundCost = (data: {
  startDate?: string
  endDate?: string
  warehouseId?: string
}) => {
  return request({
    url: '/api/v1/cost-calculation/inbound',
    method: 'post',
    data
  })
}

// 存货出库核算（加权平均法）
export const calculateOutboundCost = (data: {
  startDate?: string
  endDate?: string
  warehouseId?: string
  productId?: string
}) => {
  return request({
    url: '/api/v1/cost-calculation/outbound',
    method: 'post',
    data
  })
}

// 异常成本核算
export const calculateAbnormalCost = (data: {
  warehouseId?: string
  productId?: string
}) => {
  return request({
    url: '/api/v1/cost-calculation/abnormal',
    method: 'post',
    data
  })
}

// 修复异常成本
export const fixAbnormalCost = (items: { inventoryItemId: string; newCostPrice: number }[]) => {
  return request({
    url: '/api/v1/cost-calculation/fix-abnormal',
    method: 'post',
    data: { items }
  })
}
