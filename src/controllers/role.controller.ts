import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 获取角色列表
 * GET /api/v1/roles
 */
export const getRoles = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', search } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 检查租户
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { code: { contains: search as string } },
      ];
    }

    // 查询角色列表
    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        include: {
          _count: {
            select: {
              userRoles: true,
              rolePermissions: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.role.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: roles,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取角色列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取角色列表失败',
    });
  }
};

/**
 * 获取角色详情
 * GET /api/v1/roles/:id
 */
export const getRoleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const role = await prisma.role.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    return res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('获取角色详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取角色详情失败',
    });
  }
};

/**
 * 创建角色
 * POST /api/v1/roles
 */
export const createRole = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { name, code, description } = req.body;

    // 验证参数
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: '角色名称和编码不能为空',
      });
    }

    // 检查编码是否已存在
    const existingRole = await prisma.role.findFirst({
      where: {
        tenantId: req.user.tenantId,
        code,
      },
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: '角色编码已存在',
      });
    }

    // 检查名称是否已存在
    const existingName = await prisma.role.findFirst({
      where: {
        tenantId: req.user.tenantId,
        name,
      },
    });

    if (existingName) {
      return res.status(400).json({
        success: false,
        message: '角色名称已存在',
      });
    }

    // 创建角色
    const role = await prisma.role.create({
      data: {
        tenantId: req.user.tenantId,
        name,
        code,
        description,
        status: 'active',
      },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'role',
      resource: role.id,
      detail: JSON.stringify({ name, code, description }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      success: true,
      data: role,
      message: '角色创建成功',
    });
  } catch (error) {
    console.error('创建角色错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建角色失败',
    });
  }
};

/**
 * 更新角色
 * PUT /api/v1/roles/:id
 */
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { name, description, status } = req.body;

    // 检查角色是否存在
    const existingRole = await prisma.role.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    // 检查名称是否与其他角色冲突
    if (name && name !== existingRole.name) {
      const duplicateName = await prisma.role.findFirst({
        where: {
          tenantId: req.user.tenantId,
          name,
          NOT: { id },
        },
      });

      if (duplicateName) {
        return res.status(400).json({
          success: false,
          message: '角色名称已存在',
        });
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    // 更新角色
    const updatedRole = await prisma.role.update({
      where: { id },
      data: updateData,
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'role',
      resource: id,
      detail: JSON.stringify({ ...updateData }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedRole,
      message: '角色更新成功',
    });
  } catch (error) {
    console.error('更新角色错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新角色失败',
    });
  }
};

/**
 * 删除角色
 * DELETE /api/v1/roles/:id
 */
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查角色是否存在
    const existingRole = await prisma.role.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    // 检查是否有用户关联
    if (existingRole._count.userRoles > 0) {
      return res.status(400).json({
        success: false,
        message: '该角色下有关联用户，无法删除',
      });
    }

    // 删除角色（级联删除角色权限关联）
    await prisma.role.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'role',
      resource: id,
      detail: JSON.stringify({ name: existingRole.name, code: existingRole.code }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '角色删除成功',
    });
  } catch (error) {
    console.error('删除角色错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除角色失败',
    });
  }
};

/**
 * 获取角色权限
 * GET /api/v1/roles/:id/permissions
 */
export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查角色是否存在
    const role = await prisma.role.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    // 获取角色的权限
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: id },
      include: {
        permission: true,
      },
    });

    const permissions = rolePermissions.map(rp => rp.permission);

    return res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('获取角色权限错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取角色权限失败',
    });
  }
};

/**
 * 更新角色权限
 * PUT /api/v1/roles/:id/permissions
 */
export const updateRolePermissions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查角色是否存在
    const role = await prisma.role.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    // 使用事务更新权限
    await prisma.$transaction(async (tx) => {
      // 删除现有权限关联
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // 创建新的权限关联
      if (permissionIds && permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId: string) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'role_permission',
      resource: id,
      detail: JSON.stringify({ permissionIds }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '权限配置成功',
    });
  } catch (error) {
    console.error('更新角色权限错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新角色权限失败',
    });
  }
};

export default {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
};
