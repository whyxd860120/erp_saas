import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 获取用户列表（租户内）
 * GET /api/v1/users
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      role,
      status,
      search,
      tenantId,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {};

    // super_admin 可以查看所有租户的用户，或指定租户
    // 其他用户只能查看自己租户的用户
    if (req.user?.role === 'super_admin') {
      // super_admin 可以通过参数指定租户，否则查看所有
      if (tenantId) {
        where.tenantId = tenantId as string;
      }
      // 如果没有指定 tenantId，则不限制租户，查看所有用户
    } else {
      // 普通用户必须关联租户
      if (!req.user?.tenantId) {
        return res.status(400).json({
          success: false,
          message: '未关联租户',
        });
      }
      where.tenantId = req.user.tenantId;
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { code: { contains: search as string } },
        { email: { contains: search as string } },
        { phone: { contains: search as string } },
      ];
    }

    // 查询用户列表（人员列表）
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          position: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              customers: true,
              salesOrders: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    // 格式化用户数据，添加roles字段
    const formattedUsers = users.map(user => ({
      ...user,
      roles: user.userRoles.map(ur => ur.role),
    }));

    return res.json({
      success: true,
      data: {
        items: formattedUsers,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户列表失败',
    });
  }
};

/**
 * 获取用户详情
 * GET /api/v1/users/:id
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 构建查询条件
    const where: any = { id };

    // super_admin 可以查看任何用户，其他用户只能查看自己租户的用户
    if (req.user?.role !== 'super_admin') {
      if (!req.user?.tenantId) {
        return res.status(400).json({
          success: false,
          message: '未关联租户',
        });
      }
      where.tenantId = req.user.tenantId;
    }

    const user = await prisma.user.findFirst({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('获取用户详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户详情失败',
    });
  }
};

/**
 * 创建用户/人员（租户管理员）
 * POST /api/v1/users
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      code,
      name,
      username,
      password,
      phone,
      isSystemUser = true,
      departmentId,
      positionId,
      gender,
      birthDate,
      hireDate,
      address,
      idCard,
      role = 'staff',
      status = 'active',
      remark,
    } = req.body;

    // 基础验证
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: '人员编码和姓名不能为空',
      });
    }

    // 系统用户需要用户名和密码
    if (isSystemUser && (!username || !password)) {
      return res.status(400).json({
        success: false,
        message: '系统用户需要填写用户名和密码',
      });
    }

    // 检查人员编码是否已存在（同一租户内）
    const existingCode = await prisma.user.findFirst({
      where: {
        tenantId: req.user.tenantId,
        code,
      },
    });

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: '人员编码已被使用',
      });
    }

    // 检查用户名是否已存在（同一租户内）
    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          tenantId: req.user.tenantId,
          username,
        },
      });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: '用户名已被使用',
        });
      }
    }

    // 加密密码
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    // 创建用户/人员
    const user = await prisma.user.create({
      data: {
        tenantId: req.user.tenantId,
        code,
        name,
        username: isSystemUser ? username : undefined,
        email: undefined, // 可选字段，先设为 undefined
        password: isSystemUser ? hashedPassword : undefined,
        phone: phone || undefined,
        isSystemUser,
        gender: gender || 'unknown',
        birthDate: birthDate ? new Date(birthDate) : undefined,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        address: address || undefined,
        idCard: idCard || undefined,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        role: role, // 直接使用传入的 role 值
        status,
        remark: remark || undefined,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        position: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: user,
      message: '创建成功',
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建用户失败',
    });
  }
};

/**
 * 删除用户
 * DELETE /api/v1/users/:id
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 不能删除自己
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己',
      });
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 删除用户
    await prisma.user.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'user',
      resource: id,
      detail: JSON.stringify({ email: existingUser.email, name: existingUser.name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '用户删除成功',
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除用户失败',
    });
  }
};

/**
 * 重置用户密码（管理员）
 * POST /api/v1/users/:id/reset-password
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度至少6位',
      });
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'user',
      resource: id,
      detail: JSON.stringify({ action: 'reset_password' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '密码重置成功',
    });
  } catch (error) {
    console.error('重置密码错误:', error);
    return res.status(500).json({
      success: false,
      message: '重置密码失败',
    });
  }
};

/**
 * 获取用户角色
 * GET /api/v1/users/:id/roles
 */
export const getUserRoles = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查用户是否存在
    const user = await prisma.user.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 获取用户角色
    const userRoles = await prisma.userRole.findMany({
      where: { userId: id },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });

    const roles = userRoles.map(ur => ur.role);

    return res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('获取用户角色错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户角色失败',
    });
  }
};

/**
 * 更新用户/人员信息
 * PUT /api/v1/users/:id
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      username,
      password,
      phone,
      isSystemUser,
      departmentId,
      positionId,
      gender,
      birthDate,
      hireDate,
      address,
      idCard,
      role,
      status,
      remark,
    } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 检查是否为系统用户（只有系统用户才能重置密码）
    if (!existingUser.isSystemUser) {
      return res.status(400).json({
        success: false,
        message: '该用户不是系统用户，无法重置密码',
      });
    }

    // 检查编码是否重复
    if (code && code !== existingUser.code) {
      const codeExists = await prisma.user.findFirst({
        where: {
          tenantId: req.user.tenantId,
          code,
          NOT: { id },
        },
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: '人员编码已被使用',
        });
      }
    }

    // 检查用户名是否重复
    if (username && username !== existingUser.username) {
      const usernameExists = await prisma.user.findFirst({
        where: {
          tenantId: req.user.tenantId,
          username,
          NOT: { id },
        },
      });

      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: '用户名已被使用',
        });
      }
    }

    // 加密新密码
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    // 更新用户/人员
    const user = await prisma.user.update({
      where: { id },
      data: {
        code: code !== undefined ? code : existingUser.code,
        name: name !== undefined ? name : existingUser.name,
        username: username !== undefined ? username : existingUser.username,
        password: hashedPassword,
        phone: phone !== undefined ? phone : existingUser.phone,
        isSystemUser: isSystemUser !== undefined ? isSystemUser : existingUser.isSystemUser,
        departmentId: departmentId !== undefined ? departmentId : existingUser.departmentId,
        positionId: positionId !== undefined ? positionId : existingUser.positionId,
        gender: gender !== undefined ? gender : existingUser.gender,
        birthDate: birthDate ? new Date(birthDate) : existingUser.birthDate,
        hireDate: hireDate ? new Date(hireDate) : existingUser.hireDate,
        address: address !== undefined ? address : existingUser.address,
        idCard: idCard !== undefined ? idCard : existingUser.idCard,
        role: role !== undefined ? role : existingUser.role,
        status: status !== undefined ? status : existingUser.status,
        remark: remark !== undefined ? remark : existingUser.remark,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        position: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: user,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新用户错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新用户失败',
    });
  }
};

/**
 * 更新用户角色
 * PUT /api/v1/users/:id/roles
 */
export const updateUserRoles = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roleIds } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查用户是否存在
    const user = await prisma.user.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '人员不存在',
      });
    }

    // 删除现有角色关联
    await prisma.userRole.deleteMany({
      where: { userId: id }
    });

    // 创建新的角色关联
    if (roleIds && roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId: string) => ({
          userId: id,
          roleId
        }))
      });
    }

    return res.json({
      success: true,
      message: '角色分配成功',
    });
  } catch (error) {
    console.error('更新用户角色错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新用户角色失败',
    });
  }
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getUserRoles,
  updateUserRoles,
};
