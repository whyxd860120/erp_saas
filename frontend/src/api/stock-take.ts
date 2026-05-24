import { request } from './http'

// 获取盘点单列表
export const getStockTakes = (params: any) => {
  return request({
    url: '/stock-take',
    method: 'get',
    params
  })
}

// 获取盘点单详情
export const getStockTakeDetail = (id: string) => {
  return request({
    url: `/stock-take/${id}`,
    method: 'get'
  })
}

// 创建盘点单
export const createStockTake = (data: any) => {
  return request({
    url: '/stock-take',
    method: 'post',
    data
  })
}

// 更新盘点单
export const updateStockTake = (id: string, data: any) => {
  return request({
    url: `/stock-take/${id}`,
    method: 'put',
    data
  })
}

// 确认盘点单
export const confirmStockTake = (id: string) => {
  return request({
    url: `/stock-take/${id}/confirm`,
    method: 'post'
  })
}

// 取消盘点单
export const cancelStockTake = (id: string) => {
  return request({
    url: `/stock-take/${id}/cancel`,
    method: 'post'
  })
}

// 删除盘点单
export const deleteStockTake = (id: string) => {
  return request({
    url: `/stock-take/${id}`,
    method: 'delete'
  })
}

// 导入盘点明细
export const importStockTakeDetails = (takeId: string, data: any) => {
  return request({
    url: `/stock-take/${takeId}/import`,
    method: 'post',
    data
  })
}

// 下载盘点单模板
export const downloadStockTakeTemplate = (takeId: string) => {
  return request({
    url: `/stock-take/${takeId}/template`,
    method: 'get',
    responseType: 'blob'
  })
}

// 获取仓库当前库存（用于盘点参考）
export const getWarehouseInventory = (warehouseId: string, params?: any) => {
  return request({
    url: `/inventory/warehouse/${warehouseId}`,
    method: 'get',
    params
  })
}