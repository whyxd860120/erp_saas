import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from './auth.middleware';

const prisma = new PrismaClient();

/**
 * 租户识别中间件
 * 从请求中识别当前租户（通过JWT或请求参数）
 */
export const identifyTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 方式1: 从JWT中获取租户ID（推荐）
    if (req.user?.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: '租户不存在',
        });
      }

      // 检查租户状态（active 和 trial 允许登录）
      if (!['active', 'trial'].includes(tenant.status)) {
        return res.status(403).json({
          success: false,
          message: `租户状态异常: ${tenant.status}`,
        });
      }

      req.tenant = tenant;
      return next();
    }

    // 方式2: 从请求头中获取租户slug（适用于API调用）
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: '租户不存在',
        });
      }

      if (!['active', 'trial'].includes(tenant.status)) {
        return res.status(403).json({
          success: false,
          message: `租户状态异常: ${tenant.status}`,
        });
      }

      req.tenant = tenant;
      return next();
    }

    // 方式3: 从请求参数中获取租户ID（适用于特殊场景）
    const tenantId = req.params.tenantId || req.query.tenantId as string;
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: '租户不存在',
        });
      }

      if (!['active', 'trial'].includes(tenant.status)) {
        return res.status(403).json({
          success: false,
          message: `租户状态异常: ${tenant.status}`,
        });
      }

      req.tenant = tenant;
      return next();
    }

    // 系统管理员可以没有租户上下文
    if (req.user?.role === 'super_admin') {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: '无法识别租户',
    });
  } catch (error) {
    console.error('租户识别错误:', error);
    return res.status(500).json({
      success: false,
      message: '租户识别失败',
    });
  }
};

/**
 * 租户状态检查中间件
 * 检查租户是否处于正常状态
 */
export const checkTenantStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenant) {
    return res.status(400).json({
      success: false,
      message: '未识别到租户',
    });
  }

  const tenant = req.tenant;

  // 检查租户状态
  if (tenant.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: '租户已被停用，请联系管理员',
    });
  }

  if (tenant.status === 'trial') {
    // 检查试用期是否结束
    if (tenant.trialEndsAt && new Date(tenant.trialEndsAt) < new Date()) {
      // 更新租户状态为expired
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'expired' },
      });

      return res.status(403).json({
        success: false,
        message: '试用期已结束，请升级订阅计划',
      });
    }
  }

  if (tenant.status === 'expired') {
    return res.status(403).json({
      success: false,
      message: '订阅已过期，请续费',
    });
  }

  next();
};

/**
 * 租户配额检查中间件
 * 检查租户是否超出配额（如用户数、存储空间等）
 */
export const checkTenantQuota = (quotaType: 'users' | 'storage' | 'orders') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        message: '未识别到租户',
      });
    }

    const tenant = req.tenant;

    try {
      if (quotaType === 'users') {
        // 检查用户数配额
        const userCount = await prisma.user.count({
          where: { tenantId: tenant.id },
        });

        const maxUsers = getMaxUsersByPlan(tenant.plan);
        if (userCount >= maxUsers) {
          return res.status(403).json({
            success: false,
            message: `用户数已达上限(${maxUsers})，请升级订阅计划`,
          });
        }
      }

      if (quotaType === 'orders') {
        // 检查订单数配额（按月统计）
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const orderCount = await prisma.purchaseOrder.count({
          where: {
            tenantId: tenant.id,
            createdAt: { gte: startOfMonth },
          },
        });

        const maxOrders = getMaxOrdersByPlan(tenant.plan);
        if (orderCount >= maxOrders) {
          return res.status(403).json({
            success: false,
            message: `本月订单数已达上限(${maxOrders})，请升级订阅计划`,
          });
        }
      }

      // storage配额检查可以在上传文件时检查

      next();
    } catch (error) {
      console.error('租户配额检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '配额检查失败',
      });
    }
  };
};

/**
 * 根据订阅计划获取最大用户数
 */
function getMaxUsersByPlan(plan: string): number {
  switch (plan) {
    case 'free':
      return 5;
    case 'basic':
      return 20;
    case 'pro':
      return 100;
    case 'enterprise':
      return 1000;
    default:
      return 5;
  }
}

/**
 * 根据订阅计划获取最大订单数（每月）
 */
function getMaxOrdersByPlan(plan: string): number {
  switch (plan) {
    case 'free':
      return 100;
    case 'basic':
      return 1000;
    case 'pro':
      return 10000;
    case 'enterprise':
      return 100000;
    default:
      return 100;
  }
}

export default {
  identifyTenant,
  checkTenantStatus,
  checkTenantQuota,
};
