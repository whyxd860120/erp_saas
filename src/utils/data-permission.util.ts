import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DataPermissionFilter {
  field: string;
  operator: string;
  value: any;
}

export interface DataPermissionContext {
  tenantId: string;
  userId: string;
  userRoles: Array<{ id: string; code: string }>;
  userDept?: string; // 用户的部门ID
}

/**
 * 获取用户的数据权限过滤条件
 * 根据用户的角色，获取该角色的数据权限规则，并构建过滤条件
 */
export const getDataPermissionFilters = async (
  module: string,
  context: DataPermissionContext
): Promise<DataPermissionFilter[]> => {
  const filters: DataPermissionFilter[] = [];

  try {
    // 获取用户所有角色的ID
    const roleIds = context.userRoles.map(role => role.id);

    if (roleIds.length === 0) {
      return filters;
    }

    // 查询所有角色的数据权限规则
    const rules = await prisma.dataPermissionRule.findMany({
      where: {
        roleId: { in: roleIds },
        module,
        status: 'active',
      },
    });

    // 获取用户的部门ID
    let userDepartmentId: string | undefined = context.userDept;
    if (!userDepartmentId) {
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { departmentId: true }
      });
      userDepartmentId = user?.departmentId;
    }

    // 构建过滤条件
    for (const rule of rules) {
      let filterValue: any;

      // 根据值类型确定实际值
      switch (rule.valueType) {
        case 'current_user':
          filterValue = context.userId;
          break;
        case 'current_dept':
          filterValue = userDepartmentId;
          break;
        case 'current_dept_staff':
          // 当前部门所有人员
          if (userDepartmentId) {
            const usersInDept = await prisma.user.findMany({
              where: {
                departmentId: userDepartmentId,
                tenantId: context.tenantId,
                status: 'active'
              },
              select: { id: true }
            });
            filterValue = usersInDept.map(u => u.id);
          } else {
            continue;
          }
          break;
        case 'current_dept_and_sub_dept_staff':
          // 当前用户部门及子部门所有人员
          if (userDepartmentId) {
            const deptIds = await getDepartmentAndSubDepartmentIds(userDepartmentId);
            const usersInDepts = await prisma.user.findMany({
              where: {
                departmentId: { in: deptIds },
                tenantId: context.tenantId,
                status: 'active'
              },
              select: { id: true }
            });
            filterValue = usersInDepts.map(u => u.id);
          } else {
            continue;
          }
          break;
        case 'custom':
          filterValue = rule.value;
          break;
        default:
          continue;
      }

      if (!filterValue) {
        continue;
      }

      // 根据操作符构建过滤条件
      switch (rule.operator) {
        case 'eq':
          filters.push({
            field: rule.field,
            operator: 'eq',
            value: filterValue,
          });
          break;
        case 'in':
          filters.push({
            field: rule.field,
            operator: 'in',
            value: Array.isArray(filterValue) ? filterValue : [filterValue],
          });
          break;
        case 'like':
          filters.push({
            field: rule.field,
            operator: 'like',
            value: `%${filterValue}%`,
          });
          break;
        default:
          continue;
      }
    }
  } catch (error) {
    console.error('获取数据权限过滤条件错误:', error);
  }

  return filters;
};

/**
 * 获取部门及其所有子部门的ID列表
 */
const getDepartmentAndSubDepartmentIds = async (departmentId: string) => {
  const departments = await prisma.department.findMany({
    where: {
      OR: [
        { id: departmentId },
        { parentId: departmentId }
      ]
    }
  });

  const deptIds = new Set([departmentId]);
  departments.forEach(dept => deptIds.add(dept.id));

  return Array.from(deptIds);
};

/**
 * 将数据权限过滤条件转换为 Prisma 查询的 where 条件
 */
export const buildPrismaWhereCondition = (
  filters: DataPermissionFilter[],
  fieldMap?: { [key: string]: string } // 字段映射：数据库字段名 -> Prisma查询字段名
): any => {
  if (filters.length === 0) {
    return {};
  }

  const conditions: any[] = [];

  for (const filter of filters) {
    const fieldName = fieldMap?.[filter.field] || filter.field;

    switch (filter.operator) {
      case 'eq':
        conditions.push({ [fieldName]: filter.value });
        break;
      case 'in':
        conditions.push({ [fieldName]: { in: filter.value } });
        break;
      case 'like':
        conditions.push({ [fieldName]: { contains: filter.value } });
        break;
    }
  }

  // 多个条件用 OR 连接（符合数据权限的预期：满足任一规则即可）
  return conditions.length > 0 ? { OR: conditions } : {};
};

/**
 * 应用数据权限过滤到查询
 */
export const applyDataPermissions = async (
  module: string,
  context: DataPermissionContext,
  fieldMap?: { [key: string]: string }
): Promise<any> => {
  const filters = await getDataPermissionFilters(module, context);
  return buildPrismaWhereCondition(filters, fieldMap);
};

/**
 * 检查用户是否有查看数据的权限
 * 返回 true 表示有权限，false 表示无权限
 */
export const checkDataPermission = async (
  module: string,
  context: DataPermissionContext
): Promise<boolean> => {
  try {
    const filters = await getDataPermissionFilters(module, context);
    // 如果没有数据权限规则，则默认有权限
    if (filters.length === 0) {
      return true;
    }
    // 有规则时，需要检查具体的数据权限（实际业务中可能需要检查特定资源）
    // 此处返回 true，后续可扩展为检查用户是否有权访问特定数据记录
    return true;
  } catch (error) {
    console.error('检查数据权限错误:', error);
    return false; // 出错时拒绝访问
  }
};

export default {
  getDataPermissionFilters,
  buildPrismaWhereCondition,
  applyDataPermissions,
  checkDataPermission,
};