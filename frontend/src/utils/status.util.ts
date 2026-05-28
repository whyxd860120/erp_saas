/**
 * 状态颜色和文本映射工具
 * 统一所有单据和资料的状态显示，确保同一状态在不同模块中颜色一致
 */

/**
 * 状态类型定义
 */
export type StatusType = 'draft' | 'confirmed' | 'partial' | 'completed' | 'cancelled' | 'active' | 'inactive' | 'locked' | 'pending'

/**
 * 状态颜色映射
 * Element Plus tag type: 'success' | 'warning' | 'info' | 'danger' | '' (默认)
 */
export const STATUS_COLOR_MAP: Record<StatusType, string> = {
  draft: 'info',           // 草稿 - 灰色
  confirmed: '',           // 已确认 - 默认蓝色
  partial: 'warning',      // 部分 - 橙色
  completed: 'success',    // 已完成 - 绿色
  cancelled: 'danger',     // 已取消 - 红色
  active: 'success',       // 启用 - 绿色
  inactive: 'info',        // 禁用 - 灰色
  locked: 'warning',       // 锁定 - 橙色
  pending: 'warning'       // 待处理 - 橙色
}

/**
 * 销售订单状态文本映射
 */
export const SALES_ORDER_STATUS_TEXT: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  partial: '部分出库',
  completed: '已完成',
  cancelled: '已取消'
}

/**
 * 采购订单状态文本映射
 */
export const PURCHASE_ORDER_STATUS_TEXT: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  partial: '部分入库',
  completed: '已完成',
  cancelled: '已取消'
}

/**
 * 销售出库单状态文本映射
 */
export const SALES_OUTBOUND_STATUS_TEXT: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  cancelled: '已取消'
}

/**
 * 采购入库单状态文本映射
 */
export const PURCHASE_INBOUND_STATUS_TEXT: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  cancelled: '已取消'
}

/**
 * 资料状态文本映射（供应商、客户、物料等）
 */
export const RESOURCE_STATUS_TEXT: Record<string, string> = {
  active: '启用',
  inactive: '禁用',
  locked: '锁定'
}

/**
 * 获取状态颜色
 * @param status 状态值
 * @returns Element Plus tag type
 */
export const getStatusColor = (status: string): string => {
  return STATUS_COLOR_MAP[status as StatusType] || 'info'
}

/**
 * 获取销售订单状态文本
 * @param status 状态值
 * @returns 状态文本
 */
export const getSalesOrderStatusText = (status: string): string => {
  return SALES_ORDER_STATUS_TEXT[status] || status
}

/**
 * 获取采购订单状态文本
 * @param status 状态值
 * @returns 状态文本
 */
export const getPurchaseOrderStatusText = (status: string): string => {
  return PURCHASE_ORDER_STATUS_TEXT[status] || status
}

/**
 * 获取销售出库单状态文本
 * @param status 状态值
 * @returns 状态文本
 */
export const getSalesOutboundStatusText = (status: string): string => {
  return SALES_OUTBOUND_STATUS_TEXT[status] || status
}

/**
 * 获取采购入库单状态文本
 * @param status 状态值
 * @returns 状态文本
 */
export const getPurchaseInboundStatusText = (status: string): string => {
  return PURCHASE_INBOUND_STATUS_TEXT[status] || status
}

/**
 * 获取资料状态文本
 * @param status 状态值
 * @returns 状态文本
 */
export const getResourceStatusText = (status: string): string => {
  return RESOURCE_STATUS_TEXT[status] || status
}

/**
 * 通用状态文本获取函数
 * @param status 状态值
 * @param statusMap 状态文本映射
 * @returns 状态文本
 */
export const getStatusText = (status: string, statusMap: Record<string, string>): string => {
  return statusMap[status] || status
}