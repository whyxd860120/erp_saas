import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateToken } from '../middlewares/auth.middleware';
import config from '../config';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 获取租户列表（系统管理员）
 * GET /api/v1/tenants
 */
export const getTenants = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { slug: { contains: search as string } },
      ];
    }

    // 查询租户列表（包含用户数量统计）
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: tenants,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取租户列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取租户列表失败',
    });
  }
};

/**
 * 获取租户详情
 * GET /api/v1/tenants/:id
 */
export const getTenantById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            lastLoginAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            suppliers: true,
            customers: true,
            products: true,
            purchaseOrders: true,
            salesOrders: true,
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: '租户不存在',
      });
    }

    return res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('获取租户详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取租户详情失败',
    });
  }
};

/**
 * 创建租户（系统管理员）
 * POST /api/v1/tenants
 */
export const createTenant = async (req: Request, res: Response) => {
  try {
    const { name, slug, plan = config.tenant.defaultPlan } = req.body;

    // 验证参数
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: '机构名称和标识不能为空',
      });
    }

    // 检查名称是否已存在
    const existingByName = await prisma.tenant.findFirst({
      where: { name },
    });

    if (existingByName) {
      return res.status(400).json({
        success: false,
        message: '机构名称已存在',
      });
    }

    // 检查标识是否已存在
    const existingBySlug = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingBySlug) {
      return res.status(400).json({
        success: false,
        message: '机构标识已存在',
      });
    }

    // 创建租户
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        plan,
        status: 'trial',
        trialEndsAt: new Date(Date.now() + config.tenant.defaultTrialDays * 24 * 60 * 60 * 1000),
      },
    });

    // 记录审计日志
    await auditLog({
      userId: req.user?.id,
      action: 'create',
      module: 'tenant',
      resource: tenant.id,
      detail: JSON.stringify({ name, slug, plan }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      success: true,
      data: tenant,
      message: '租户创建成功',
    });
  } catch (error) {
    console.error('创建租户错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建租户失败',
    });
  }
};

/**
 * 更新租户信息（系统管理员）
 * PUT /api/v1/tenants/:id
 */
export const updateTenant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, plan, status,
      trialEndsAt, currentPeriodStartsAt, currentPeriodEndsAt,
      featureMultiWarehouse, featureMultiCurrency, featureCustomFields,
      featureApiAccess, featureWebhooks, featureAuditLogs, featureAnalytics,
      quotaUsers, quotaStorage, quotaApiCalls
    } = req.body;

    // 检查租户是否存在
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      return res.status(404).json({
        success: false,
        message: '租户不存在',
      });
    }

    // 构建更新数据
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (plan !== undefined) updateData.plan = plan;
    if (status !== undefined) {
      updateData.status = status;
      // 如果状态改为trial且没有设置试用到期时间，自动设置
      if (status === 'trial' && !trialEndsAt) {
        updateData.trialEndsAt = new Date(Date.now() + config.tenant.defaultTrialDays * 24 * 60 * 60 * 1000);
      }
    }

    // 租期设置
    if (trialEndsAt !== undefined) {
      updateData.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    }
    if (currentPeriodStartsAt !== undefined) {
      updateData.currentPeriodStartsAt = currentPeriodStartsAt ? new Date(currentPeriodStartsAt) : null;
    }
    if (currentPeriodEndsAt !== undefined) {
      updateData.currentPeriodEndsAt = currentPeriodEndsAt ? new Date(currentPeriodEndsAt) : null;
    }

    // 功能开关
    if (featureMultiWarehouse !== undefined) updateData.featureMultiWarehouse = featureMultiWarehouse;
    if (featureMultiCurrency !== undefined) updateData.featureMultiCurrency = featureMultiCurrency;
    if (featureCustomFields !== undefined) updateData.featureCustomFields = featureCustomFields;
    if (featureApiAccess !== undefined) updateData.featureApiAccess = featureApiAccess;
    if (featureWebhooks !== undefined) updateData.featureWebhooks = featureWebhooks;
    if (featureAuditLogs !== undefined) updateData.featureAuditLogs = featureAuditLogs;
    if (featureAnalytics !== undefined) updateData.featureAnalytics = featureAnalytics;

    // 配额
    if (quotaUsers !== undefined) updateData.quotaUsers = quotaUsers;
    if (quotaStorage !== undefined) updateData.quotaStorage = quotaStorage;
    if (quotaApiCalls !== undefined) updateData.quotaApiCalls = quotaApiCalls;

    // 更新租户
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    // 记录审计日志
    await auditLog({
      userId: req.user?.id,
      action: 'update',
      module: 'tenant',
      resource: id,
      detail: JSON.stringify({ ...updateData }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedTenant,
      message: '租户更新成功',
    });
  } catch (error) {
    console.error('更新租户错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新租户失败',
    });
  }
};

/**
 * 删除租户（系统管理员）
 * DELETE /api/v1/tenants/:id
 */
export const deleteTenant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查租户是否存在
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      return res.status(404).json({
        success: false,
        message: '租户不存在',
      });
    }

    // 删除租户（级联删除所有关联数据）
    await prisma.tenant.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      userId: req.user?.id,
      action: 'delete',
      module: 'tenant',
      resource: id,
      detail: JSON.stringify({ name: existingTenant.name, slug: existingTenant.slug }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '租户删除成功',
    });
  } catch (error) {
    console.error('删除租户错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除租户失败',
    });
  }
};

/**
 * 获取当前租户信息（租户管理员）
 * GET /api/v1/tenants/me
 */
export const getMyTenant = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            lastLoginAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            suppliers: true,
            customers: true,
            products: true,
            purchaseOrders: true,
            salesOrders: true,
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: '租户不存在',
      });
    }

    return res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('获取当前租户信息错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取租户信息失败',
    });
  }
};

/**
 * 更新当前租户信息（租户管理员）
 * PUT /api/v1/tenants/me
 */
export const updateMyTenant = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const { name } = req.body;

    // 构建更新数据（租户管理员只能修改名称）
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;

    // 更新租户
    const updatedTenant = await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: updateData,
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'tenant',
      resource: req.user.tenantId,
      detail: JSON.stringify({ ...updateData }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedTenant,
      message: '租户信息更新成功',
    });
  } catch (error) {
    console.error('更新当前租户信息错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新租户信息失败',
    });
  }
};

export default {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  getMyTenant,
  updateMyTenant,
};
