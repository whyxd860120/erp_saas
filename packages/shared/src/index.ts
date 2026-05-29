/**
 * ERP系统共享类型定义
 * Web端和移动端共用的接口类型
 */

// ========== 通用响应 ==========

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data: T
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ========== 认证相关 ==========

export interface LoginParams {
  username: string
  password: string
  tenantSlug?: string
}

export interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
  tenant?: TenantInfo
}

export interface TenantInfo {
  id: string
  name: string
  slug: string
  plan?: string
  trialEndsAt?: string
  initializationStatus?: string
  isSystem?: boolean
}

export interface LoginResult {
  token: string
  user: UserInfo
  tenant: TenantInfo
}

// ========== 基础资料 ==========

export interface Product {
  id: string
  code: string
  name: string
  categoryId?: string
  categoryName?: string
  spec?: string
  unit?: string
  barcode?: string
  purchasePrice?: number
  salePrice?: number
  imageUrl?: string
  status: string
}

export interface Warehouse {
  id: string
  code: string
  name: string
  address?: string
  status: string
}

export interface Supplier {
  id: string
  code: string
  name: string
  contact?: string
  phone?: string
}

export interface Customer {
  id: string
  code: string
  name: string
  contact?: string
  phone?: string
}

// ========== 库存相关 ==========

export interface InventoryItem {
  id: string
  productId: string
  productName: string
  productCode: string
  productSpec?: string
  productUnit?: string
  warehouseId: string
  warehouseName: string
  quantity: number
  lockedQuantity: number
  availableQuantity: number
  costPrice?: number
  totalCost?: number
  batchNo?: string
  serialNo?: string
  productionDate?: string
  expiryDate?: string
}

// ========== 采购订单 ==========

export interface PurchaseOrder {
  id: string
  orderNo: string
  supplierId: string
  supplierName: string
  orderDate: string
  totalAmount: number
  status: string
  remark?: string
  createdAt: string
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  productId: string
  productName: string
  productCode: string
  spec?: string
  unit?: string
  quantity: number
  unitPrice: number
  amount: number
  receivedQuantity?: number
}

// ========== 销售订单 ==========

export interface SalesOrder {
  id: string
  orderNo: string
  customerId: string
  customerName: string
  orderDate: string
  totalAmount: number
  status: string
  remark?: string
  createdAt: string
  items?: SalesOrderItem[]
}

export interface SalesOrderItem {
  id: string
  productId: string
  productName: string
  productCode: string
  spec?: string
  unit?: string
  quantity: number
  unitPrice: number
  amount: number
  shippedQuantity?: number
}

// ========== 入库单 ==========

export interface PurchaseInbound {
  id: string
  inboundNo: string
  orderId?: string
  orderNo?: string
  supplierId: string
  supplierName: string
  warehouseId: string
  warehouseName: string
  inboundDate: string
  totalAmount: number
  status: string
  remark?: string
  createdAt: string
  details?: PurchaseInboundDetail[]
}

export interface PurchaseInboundDetail {
  id: string
  productId: string
  productName: string
  productCode: string
  spec?: string
  unit?: string
  quantity: number
  unitPrice: number
  amount: number
}

// ========== 出库单 ==========

export interface SalesOutbound {
  id: string
  outboundNo: string
  orderId?: string
  orderNo?: string
  customerId: string
  customerName: string
  warehouseId: string
  warehouseName: string
  outboundDate: string
  totalAmount: number
  status: string
  remark?: string
  createdAt: string
  details?: SalesOutboundDetail[]
}

export interface SalesOutboundDetail {
  id: string
  productId: string
  productName: string
  productCode: string
  spec?: string
  unit?: string
  quantity: number
  unitPrice: number
  amount: number
}
