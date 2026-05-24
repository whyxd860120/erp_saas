import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Tenant } from '@prisma/client';
import config from '../config';

const prisma = new PrismaClient();

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        tenantId?: string;
      };
      tenant?: Tenant;
    }
  }
}

/**
 * JWT认证中间件
 * 验证Authorization header中的Bearer token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 从header获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
      });
    }

    const token = authHeader.split(' ')[1];

    // 验证token
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
      role: string;
      tenantId?: string;
    };

    // 查询用户信息
    let user: any;
    
    if (decoded.role === 'super_admin' || decoded.role === 'tenant_admin') {
      // 系统用户（跨租户）
      user = await prisma.systemUser.findUnique({
        where: { id: decoded.id },
      });
    } else {
      // 租户用户
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { tenant: true },
      });
    }

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用',
      });
    }

    // 将用户信息附加到request对象
    // 优先使用token中的tenantId，如果没有则使用数据库中的tenantId
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: decoded.tenantId || user.tenantId,
    };

    // 如果是租户用户，查询租户信息
    // 优先使用token中的tenantId
    const effectiveTenantId = decoded.tenantId || user.tenantId;
    if (effectiveTenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: effectiveTenantId },
      });

      if (!tenant) {
        return res.status(401).json({
          success: false,
          message: '租户不存在',
        });
      }

      // 检查租户状态（active 和 trial 允许访问）
      if (!['active', 'trial'].includes(tenant.status)) {
        return res.status(403).json({
          success: false,
          message: `租户状态异常: ${tenant.status}`,
        });
      }

      req.tenant = tenant;
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌',
      });
    }

    console.error('认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '认证失败',
    });
  }
};

/**
 * 角色授权中间件
 * @param allowedRoles 允许的角色数组
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足',
      });
    }

    next();
  };
};

/**
 * 租户隔离中间件
 * 确保租户用户只能访问自己的数据
 * @param skipInitCheck 是否跳过账套初始化检查（用于系统设置类接口）
 */
export const tenantIsolation = (skipInitCheck: boolean = false) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // 系统管理员跳过租户隔离
    if (req.user?.role === 'super_admin') {
      return next();
    }

    // 租户管理员或普通用户必须有关联租户
    if (!req.user?.tenantId) {
      return res.status(403).json({
        success: false,
        message: '未关联租户',
      });
    }

    if (!req.tenant) {
      return res.status(403).json({
        success: false,
        message: '租户信息无效',
      });
    }

    // 检查账套初始化状态
    if (!skipInitCheck && req.tenant.isSystem !== true && req.tenant.initializationStatus !== 'completed') {
      return res.status(403).json({
        success: false,
        message: '请先完成账套初始化',
      });
    }

    next();
  };
};

/**
 * 生成JWT token
 * @param payload 用户信息
 * @returns JWT token
 */
export const generateToken = (payload: {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
}): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
};

/**
 * 刷新Token中间件
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const oldToken = req.headers.authorization?.split(' ')[1];
    if (!oldToken) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
      });
    }

    // 验证旧token是否有效（检查是否过期或被吊销）
    let decoded: any;
    try {
      decoded = jwt.verify(oldToken, config.jwt.secret);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: '认证令牌已过期，请重新登录',
        });
      }
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌',
      });
    }

    // 检查用户是否仍然有效
    let user: any;
    if (decoded.role === 'super_admin' || decoded.role === 'tenant_admin') {
      user = await prisma.systemUser.findUnique({
        where: { id: decoded.id },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { tenant: true },
      });
    }

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用',
      });
    }

    // 生成新token
    const newToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
    });

    res.json({
      success: true,
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    console.error('刷新Token错误:', error);
    return res.status(401).json({
      success: false,
      message: '刷新Token失败',
    });
  }
};

export default {
  authenticate,
  authorize,
  tenantIsolation,
  generateToken,
  refreshToken,
};
