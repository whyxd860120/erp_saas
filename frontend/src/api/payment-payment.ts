import { request } from './http'

// 付款单参数
export interface PaymentPaymentParams {
  page?: number
  limit?: number
  status?: string
  supplierId?: string
  startDate?: string
  endDate?: string
  keyword?: string
}

// 创建/更新付款单参数
export interface CreatePaymentPaymentParams {
  supplierId: string
  accountId: string
  paymentDate: string
  amount: number
  orderId?: string
  paymentMethod?: string
  remark?: string
}

// 获取付款单列表
export const getPaymentPayments = (params?: PaymentPaymentParams) => {
  return request({
    url: '/api/v1/payment-payments',
    method: 'get',
    params
  })
}

// 获取付款单详情
export const getPaymentPaymentById = (id: string) => {
  return request({
    url: `/api/v1/payment-payments/${id}`,
    method: 'get'
  })
}

// 创建付款单
export const createPaymentPayment = (data: CreatePaymentPaymentParams) => {
  return request({
    url: '/api/v1/payment-payments',
    method: 'post',
    data
  })
}

// 更新付款单
export const updatePaymentPayment = (id: string, data: Partial<CreatePaymentPaymentParams>) => {
  return request({
    url: `/api/v1/payment-payments/${id}`,
    method: 'put',
    data
  })
}

// 确认付款单
export const confirmPaymentPayment = (id: string) => {
  return request({
    url: `/api/v1/payment-payments/${id}/confirm`,
    method: 'post'
  })
}

// 删除付款单
export const deletePaymentPayment = (id: string) => {
  return request({
    url: `/api/v1/payment-payments/${id}`,
    method: 'delete'
  })
}