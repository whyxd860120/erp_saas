import { request } from './http'

export interface AccountParams {
  page?: number
  limit?: number
  status?: string
  search?: string
}

export interface CreateAccountParams {
  code: string
  name: string
  type: string
  status?: string
}

export const getAccounts = (params?: AccountParams) =>
  request({ url: '/api/v1/accounts', method: 'get', params })

export const getAccountById = (id: string) =>
  request({ url: `/api/v1/accounts/${id}`, method: 'get' })

export const createAccount = (data: CreateAccountParams) =>
  request({ url: '/api/v1/accounts', method: 'post', data })

export const updateAccount = (id: string, data: Partial<CreateAccountParams>) =>
  request({ url: `/api/v1/accounts/${id}`, method: 'put', data })

export const deleteAccount = (id: string) =>
  request({ url: `/api/v1/accounts/${id}`, method: 'delete' })

export const adjustBalance = (id: string, data: { amount: number; remark?: string }) =>
  request({ url: `/api/v1/accounts/${id}/adjust-balance`, method: 'post', data })
