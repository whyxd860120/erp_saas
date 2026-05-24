import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * 权限检查的 Composable
 * 提供权限检查功能，用于控制按钮和功能的显示
 */
export const usePermission = () => {
  const authStore = useAuthStore()

  /**
   * 检查是否有某个权限
   * @param permission 权限标识，如 'user:create'
   * @returns 是否有权限
   */
  const hasPermission = (permission: string): boolean => {
    const user = authStore.user
    if (!user) return false

    // 超级管理员拥有所有权限
    if (user.role === 'super_admin') return true

    // 从用户角色中获取权限
    const permissions = user.permissions || []
    return permissions.includes(permission)
  }

  /**
   * 检查是否有某个权限（别名函数）
   */
  const can = (permission: string): boolean => hasPermission(permission)

  /**
   * 批量检查权限
   * @param permissions 权限数组
   * @returns 是否有所有权限
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(p => hasPermission(p))
  }

  /**
   * 检查是否有任意一个权限
   * @param permissions 权限数组
   * @returns 是否有任意一个权限
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(p => hasPermission(p))
  }

  /**
   * 根据权限返回布尔值（用于 v-if）
   * @param permission 权限标识
   * @returns 是否有权限
   */
  const checkPermission = (permission: string): boolean => {
    return hasPermission(permission)
  }

  return {
    hasPermission,
    can,
    hasAllPermissions,
    hasAnyPermission,
    checkPermission,
  }
}