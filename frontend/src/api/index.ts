import request, { api } from './http'

export { request, api }
export default request

// 导出 API 模块
export const authApi = {
  login: (data: { username: string; password: string }) => 
    request({ url: '/api/v1/auth/login', method: 'POST', data }),
  logout: () => 
    request({ url: '/api/v1/auth/logout', method: 'POST' }),
  getUserInfo: () => 
    request({ url: '/api/v1/auth/me', method: 'GET' }),
  changePassword: (data: { oldPassword: string; newPassword: string }) => 
    request({ url: '/api/v1/auth/change-password', method: 'POST', data })
}

export const tenantApi = {
  getTenants: (params?: any) => 
    request({ url: '/api/v1/tenants', method: 'GET', params }),
  getTenantById: (id: string) => 
    request({ url: `/api/v1/tenants/${id}`, method: 'GET' }),
  createTenant: (data: any) => 
    request({ url: '/api/v1/tenants', method: 'POST', data }),
  updateTenant: (id: string, data: any) => 
    request({ url: `/api/v1/tenants/${id}`, method: 'PUT', data }),
  deleteTenant: (id: string) => 
    request({ url: `/api/v1/tenants/${id}`, method: 'DELETE' })
}

export const userApi = {
  getUsers: (params?: any) => 
    request({ url: '/api/v1/users', method: 'GET', params }),
  getUserById: (id: string) => 
    request({ url: `/api/v1/users/${id}`, method: 'GET' }),
  createUser: (data: any) => 
    request({ url: '/api/v1/users', method: 'POST', data }),
  updateUser: (id: string, data: any) => 
    request({ url: `/api/v1/users/${id}`, method: 'PUT', data }),
  deleteUser: (id: string) => 
    request({ url: `/api/v1/users/${id}`, method: 'DELETE' })
}

export const supplierApi = {
  getSuppliers: (params?: any) => 
    request({ url: '/api/v1/suppliers', method: 'GET', params }),
  getSupplierById: (id: string) => 
    request({ url: `/api/v1/suppliers/${id}`, method: 'GET' }),
  createSupplier: (data: any) => 
    request({ url: '/api/v1/suppliers', method: 'POST', data }),
  updateSupplier: (id: string, data: any) => 
    request({ url: `/api/v1/suppliers/${id}`, method: 'PUT', data }),
  deleteSupplier: (id: string) => 
    request({ url: `/api/v1/suppliers/${id}`, method: 'DELETE' })
}

export const customerApi = {
  getCustomers: (params?: any) => 
    request({ url: '/api/v1/customers', method: 'GET', params }),
  getCustomerById: (id: string) => 
    request({ url: `/api/v1/customers/${id}`, method: 'GET' }),
  createCustomer: (data: any) => 
    request({ url: '/api/v1/customers', method: 'POST', data }),
  updateCustomer: (id: string, data: any) => 
    request({ url: `/api/v1/customers/${id}`, method: 'PUT', data }),
  deleteCustomer: (id: string) => 
    request({ url: `/api/v1/customers/${id}`, method: 'DELETE' })
}

export const productApi = {
  getCategories: () => 
    request({ url: '/api/v1/products/categories', method: 'GET' }),
  createCategory: (data: any) => 
    request({ url: '/api/v1/products/categories', method: 'POST', data }),
  getProducts: (params?: any) => 
    request({ url: '/api/v1/products', method: 'GET', params }),
  getProductById: (id: string) => 
    request({ url: `/api/v1/products/${id}`, method: 'GET' }),
  createProduct: (data: any) => 
    request({ url: '/api/v1/products', method: 'POST', data }),
  updateProduct: (id: string, data: any) => 
    request({ url: `/api/v1/products/${id}`, method: 'PUT', data }),
  deleteProduct: (id: string) => 
    request({ url: `/api/v1/products/${id}`, method: 'DELETE' })
}

export const warehouseApi = {
  getWarehouses: (params?: any) => 
    request({ url: '/api/v1/warehouses', method: 'GET', params }),
  getWarehouseById: (id: string) => 
    request({ url: `/api/v1/warehouses/${id}`, method: 'GET' }),
  createWarehouse: (data: any) => 
    request({ url: '/api/v1/warehouses', method: 'POST', data }),
  updateWarehouse: (id: string, data: any) => 
    request({ url: `/api/v1/warehouses/${id}`, method: 'PUT', data }),
  deleteWarehouse: (id: string) => 
    request({ url: `/api/v1/warehouses/${id}`, method: 'DELETE' })
}

export const accountApi = {
  getAccounts: (params?: any) => 
    request({ url: '/api/v1/accounts', method: 'GET', params }),
  getAccountById: (id: string) => 
    request({ url: `/api/v1/accounts/${id}`, method: 'GET' }),
  createAccount: (data: any) => 
    request({ url: '/api/v1/accounts', method: 'POST', data }),
  updateAccount: (id: string, data: any) => 
    request({ url: `/api/v1/accounts/${id}`, method: 'PUT', data }),
  deleteAccount: (id: string) => 
    request({ url: `/api/v1/accounts/${id}`, method: 'DELETE' }),
  adjustBalance: (id: string, data: any) => 
    request({ url: `/api/v1/accounts/${id}/adjust-balance`, method: 'POST', data })
}

export const purchaseOrderApi = {
  getPurchaseOrders: (params?: any) => 
    request({ url: '/api/v1/purchase-orders', method: 'GET', params }),
  getPurchaseOrderById: (id: string) => 
    request({ url: `/api/v1/purchase-orders/${id}`, method: 'GET' }),
  createPurchaseOrder: (data: any) => 
    request({ url: '/api/v1/purchase-orders', method: 'POST', data }),
  updatePurchaseOrder: (id: string, data: any) => 
    request({ url: `/api/v1/purchase-orders/${id}`, method: 'PUT', data }),
  confirmPurchaseOrder: (id: string) => 
    request({ url: `/api/v1/purchase-orders/${id}/confirm`, method: 'POST' }),
  deletePurchaseOrder: (id: string) => 
    request({ url: `/api/v1/purchase-orders/${id}`, method: 'DELETE' })
}

export const salesOrderApi = {
  getSalesOrders: (params?: any) => 
    request({ url: '/api/v1/sales-orders', method: 'GET', params }),
  getSalesOrderById: (id: string) => 
    request({ url: `/api/v1/sales-orders/${id}`, method: 'GET' }),
  createSalesOrder: (data: any) => 
    request({ url: '/api/v1/sales-orders', method: 'POST', data }),
  updateSalesOrder: (id: string, data: any) => 
    request({ url: `/api/v1/sales-orders/${id}`, method: 'PUT', data }),
  confirmSalesOrder: (id: string) => 
    request({ url: `/api/v1/sales-orders/${id}/confirm`, method: 'POST' }),
  deleteSalesOrder: (id: string) => 
    request({ url: `/api/v1/sales-orders/${id}`, method: 'DELETE' })
}

export const purchaseInboundApi = {
  getPurchaseInbounds: (params?: any) => 
    request({ url: '/api/v1/purchase-inbounds', method: 'GET', params }),
  getPurchaseInboundById: (id: string) => 
    request({ url: `/api/v1/purchase-inbounds/${id}`, method: 'GET' }),
  createPurchaseInbound: (data: any) => 
    request({ url: '/api/v1/purchase-inbounds', method: 'POST', data }),
  confirmPurchaseInbound: (id: string) => 
    request({ url: `/api/v1/purchase-inbounds/${id}/confirm`, method: 'POST' }),
  deletePurchaseInbound: (id: string) => 
    request({ url: `/api/v1/purchase-inbounds/${id}`, method: 'DELETE' })
}

export const salesOutboundApi = {
  getSalesOutbounds: (params?: any) => 
    request({ url: '/api/v1/sales-outbounds', method: 'GET', params }),
  getSalesOutboundById: (id: string) => 
    request({ url: `/api/v1/sales-outbounds/${id}`, method: 'GET' }),
  createSalesOutbound: (data: any) => 
    request({ url: '/api/v1/sales-outbounds', method: 'POST', data }),
  confirmSalesOutbound: (id: string) => 
    request({ url: `/api/v1/sales-outbounds/${id}/confirm`, method: 'POST' }),
  deleteSalesOutbound: (id: string) => 
    request({ url: `/api/v1/sales-outbounds/${id}`, method: 'DELETE' })
}

export const paymentReceiptApi = {
  getPaymentReceipts: (params?: any) => 
    request({ url: '/api/v1/payment-receipts', method: 'GET', params }),
  getPaymentReceiptById: (id: string) => 
    request({ url: `/api/v1/payment-receipts/${id}`, method: 'GET' }),
  createPaymentReceipt: (data: any) => 
    request({ url: '/api/v1/payment-receipts', method: 'POST', data }),
  updatePaymentReceipt: (id: string, data: any) => 
    request({ url: `/api/v1/payment-receipts/${id}`, method: 'PUT', data }),
  confirmPaymentReceipt: (id: string) => 
    request({ url: `/api/v1/payment-receipts/${id}/confirm`, method: 'POST' }),
  deletePaymentReceipt: (id: string) => 
    request({ url: `/api/v1/payment-receipts/${id}`, method: 'DELETE' })
}

export const paymentPaymentApi = {
  getPaymentPayments: (params?: any) => 
    request({ url: '/api/v1/payment-payments', method: 'GET', params }),
  getPaymentPaymentById: (id: string) => 
    request({ url: `/api/v1/payment-payments/${id}`, method: 'GET' }),
  createPaymentPayment: (data: any) => 
    request({ url: '/api/v1/payment-payments', method: 'POST', data }),
  confirmPaymentPayment: (id: string) => 
    request({ url: `/api/v1/payment-payments/${id}/confirm`, method: 'POST' }),
  deletePaymentPayment: (id: string) => 
    request({ url: `/api/v1/payment-payments/${id}`, method: 'DELETE' })
}

export const inventoryApi = {
  getInventory: (params?: any) => 
    request({ url: '/api/v1/inventory', method: 'GET', params }),
  getInventoryById: (id: string) => 
    request({ url: `/api/v1/inventory/${id}`, method: 'GET' }),
  getInventoryLogs: (params?: any) => 
    request({ url: '/api/v1/inventory/logs', method: 'GET', params }),
  adjustInventory: (id: string, data: any) => 
    request({ url: `/api/v1/inventory/${id}/adjust`, method: 'POST', data }),
  getInventorySummary: (params?: any) => 
    request({ url: '/api/v1/inventory/summary', method: 'GET', params })
}

export const auditLogApi = {
  getAuditLogs: (params?: any) => 
    request({ url: '/api/v1/audit-logs', method: 'GET', params }),
  getAuditLogDetail: (id: string) => 
    request({ url: `/api/v1/audit-logs/${id}`, method: 'GET' }),
  getAuditLogStats: (params?: any) => 
    request({ url: '/api/v1/audit-logs/stats', method: 'GET', params }),
  exportAuditLogs: (params?: any) => 
    request({ url: '/api/v1/audit-logs/export', method: 'GET', params, responseType: 'blob' })
}