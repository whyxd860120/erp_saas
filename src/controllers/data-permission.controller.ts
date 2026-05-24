import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取角色的数据权限规则
 * GET /api/v1/data-permissions/:roleId
 */
export const getDataPermissionRules = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 验证角色是否存在且属于当前租户
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId: req.user.tenantId,
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    // 获取角色的数据权限规则
    const rules = await prisma.dataPermissionRule.findMany({
      where: {
        roleId,
        status: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error('获取数据权限规则错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取数据权限规则失败',
    });
  }
};

/**
 * 创建数据权限规则
 * POST /api/v1/data-permissions
 */
export const createDataPermissionRule = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { roleId, module, field, operator, valueType, value, description } = req.body;

    // 验证参数
    if (!roleId || !module || !field) {
      return res.status(400).json({
        success: false,
        message: '角色ID、模块和字段不能为空',
      });
    }

    // 验证角色是否存在且属于当前租户
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId: req.user.tenantId,
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    // 检查是否已存在相同角色的相同模块和字段的规则
    const existingRule = await prisma.dataPermissionRule.findFirst({
      where: {
        roleId,
        module,
        field,
      },
    });

    if (existingRule) {
      return res.status(400).json({
        success: false,
        message: '该角色已存在相同模块和字段的规则',
      });
    }

    // 创建数据权限规则
    const rule = await prisma.dataPermissionRule.create({
      data: {
        tenantId: req.user.tenantId,
        roleId,
        module,
        field,
        operator: operator || 'eq',
        valueType: valueType || 'current_user',
        value,
        description,
        status: 'active',
      },
    });

    return res.status(201).json({
      success: true,
      data: rule,
      message: '数据权限规则创建成功',
    });
  } catch (error) {
    console.error('创建数据权限规则错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建数据权限规则失败',
    });
  }
};

/**
 * 更新数据权限规则
 * PUT /api/v1/data-permissions/:id
 */
export const updateDataPermissionRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator, valueType, value, description, status } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查规则是否存在且属于当前租户
    const existingRule = await prisma.dataPermissionRule.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: '数据权限规则不存在',
      });
    }

    // 构建更新数据
    const updateData: any = {};
    if (operator !== undefined) updateData.operator = operator;
    if (valueType !== undefined) updateData.valueType = valueType;
    if (value !== undefined) updateData.value = value;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    // 更新规则
    const updatedRule = await prisma.dataPermissionRule.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      data: updatedRule,
      message: '数据权限规则更新成功',
    });
  } catch (error) {
    console.error('更新数据权限规则错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新数据权限规则失败',
    });
  }
};

/**
 * 删除数据权限规则
 * DELETE /api/v1/data-permissions/:id
 */
export const deleteDataPermissionRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查规则是否存在且属于当前租户
    const existingRule = await prisma.dataPermissionRule.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: '数据权限规则不存在',
      });
    }

    // 删除规则
    await prisma.dataPermissionRule.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: '数据权限规则删除成功',
    });
  } catch (error) {
    console.error('删除数据权限规则错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除数据权限规则失败',
    });
  }
};

/**
 * 批量设置角色的数据权限规则
 * POST /api/v1/data-permissions/batch/:roleId
 */
export const batchSetDataPermissionRules = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const { rules } = req.body; // [{ module, field, operator, valueType, value, description }, ...]

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    if (!Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        message: 'rules 必须是数组',
      });
    }

    // 验证角色是否存在且属于当前租户
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId: req.user.tenantId,
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 删除现有的所有规则
      await tx.dataPermissionRule.deleteMany({
        where: { roleId },
      });

      // 创建新规则
      if (rules.length > 0) {
        await tx.dataPermissionRule.createMany({
          data: rules.map(rule => ({
            tenantId: req.user.tenantId,
            roleId,
            module: rule.module,
            field: rule.field,
            operator: rule.operator || 'eq',
            valueType: rule.valueType || 'current_user',
            value: rule.value,
            description: rule.description,
            status: 'active',
          })),
        });
      }
    });

    // 获取更新后的规则列表
    const updatedRules = await prisma.dataPermissionRule.findMany({
      where: {
        roleId,
        status: 'active',
      },
    });

    return res.json({
      success: true,
      data: updatedRules,
      message: '数据权限规则批量设置成功',
    });
  } catch (error) {
    console.error('批量设置数据权限规则错误:', error);
    return res.status(500).json({
      success: false,
      message: '批量设置数据权限规则失败',
    });
  }
};

export default {
  getDataPermissionRules,
  createDataPermissionRule,
  updateDataPermissionRule,
  deleteDataPermissionRule,
  batchSetDataPermissionRules,
};