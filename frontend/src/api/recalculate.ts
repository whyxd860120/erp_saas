import { api } from './http'

export interface RecalculateInventoryResult {
  updatedCount: number
  createdCount: number
  zeroCount: number
  totalKeys: number
  changedCount: number
  changes: Array<{
    productId: string
    warehouseId: string
    batchNo: string | null
    oldQty: number
    newQty: number
    diff: number
  }>
}

export interface RecalculateAccountBalanceResult {
  updatedCount: number
  unchangedCount: number
  totalAccounts: number
  details: Array<{
    accountId: string
    accountName: string
    oldBalance: number
    newBalance: number
    diff: number
  }>
}

export interface RecalculateOrderPaymentsResult {
  sales: {
    updated: number
    unchanged: number
    details: Array<{ orderId: string; orderNo: string; oldPaidAmount: number; newPaidAmount: number }>
  }
  purchase: {
    updated: number
    unchanged: number
    details: Array<{ orderId: string; orderNo: string; oldPaidAmount: number; newPaidAmount: number }>
  }
}

/** 重算库存 */
export const recalculateInventory = (warehouseId?: string) =>
  api.post<{ success: boolean; message: string; data: RecalculateInventoryResult }>(
    '/api/v1/recalculate/inventory',
    { warehouseId }
  ).then(r => r.data)

/** 重算账户余额 */
export const recalculateAccountBalance = () =>
  api.post<{ success: boolean; message: string; data: RecalculateAccountBalanceResult }>(
    '/api/v1/recalculate/account-balance'
  ).then(r => r.data)

/** 重算应收应付 */
export const recalculateOrderPayments = () =>
  api.post<{ success: boolean; message: string; data: RecalculateOrderPaymentsResult }>(
    '/api/v1/recalculate/order-payments'
  ).then(r => r.data)
