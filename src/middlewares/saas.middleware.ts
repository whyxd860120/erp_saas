import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import config from '../config';

const prisma = new PrismaClient();
const redis = new Redis(config.redis.url);

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        tenantId: string;
        permissions: string[];
      };
      rateLimitInfo?: {
        limit: number;
        remaining: number;
        reset: Date;
      };
    }
  }
}

/**
 * SaaS功能开关检查中间件
 * 检查租户是否启用了特定功能
 */
export const checkFeatureFlag = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        code: 'TENANT_NOT_FOUND',
        message: '未识别到租户',
      });
    }

    const featureKey = `feature${feature.charAt(0).toUpperCase() + feature.slice(1)}`;
    const isEnabled = (req.tenant as any)[featureKey] === true;

    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        code: 'FEATURE_NOT_ENABLED',
        message: `功能"${feature}"未在当前订阅计划中启用`,
        data: {
          feature,
          requiredPlan: getRequiredPlanForFeature(feature),
        },
      });
    }

    next();
  };
};

/**
 * 获取功能对应的最低订阅计划
 */
function getRequiredPlanForFeature(feature: string): string {
  const featurePlanMap: Record<string, string> = {
    'multiWarehouse': 'basic',
    'multiCurrency': 'pro',
    'customFields': 'pro',
    'apiAccess': 'pro',
    'webhooks': 'pro',
    'auditLogs': 'basic',
    'analytics': 'enterprise',
  };
  return featurePlanMap[feature] || 'enterprise';
}

/**
 * API密钥认证中间件
 * 用于API访问的认证
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        code: 'API_KEY_MISSING',
        message: '未提供API密钥',
      });
    }

    // 查询API密钥
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { tenant: true },
    });

    if (!keyRecord || !keyRecord.isActive) {
      return res.status(401).json({
        success: false,
        code: 'API_KEY_INVALID',
        message: 'API密钥无效或已禁用',
      });
    }

    // 检查是否过期
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return res.status(401).json({
        success: false,
        code: 'API_KEY_EXPIRED',
        message: 'API密钥已过期',
      });
    }

    // 检查租户状态（active 和 trial 允许访问）
    if (!['active', 'trial'].includes(keyRecord.tenant.status)) {
      return res.status(403).json({
        success: false,
        code: 'TENANT_INACTIVE',
        message: `租户状态异常: ${keyRecord.tenant.status}`,
      });
    }

    // 更新最后使用时间
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: req.ip,
      },
    });

    // 设置请求上下文
    req.apiKey = {
      id: keyRecord.id,
      tenantId: keyRecord.tenantId,
      permissions: (keyRecord.permissions as string[]) || [],
    };
    req.tenant = keyRecord.tenant;

    next();
  } catch (error) {
    console.error('API密钥认证错误:', error);
    return res.status(500).json({
      success: false,
      code: 'API_KEY_AUTH_ERROR',
      message: 'API密钥认证失败',
    });
  }
};

/**
 * API权限检查中间件
 */
export const requireApiPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        code: 'API_KEY_REQUIRED',
        message: '需要API密钥认证',
      });
    }

    const permissions = req.apiKey.permissions;
    
    // 如果权限数组为空，表示拥有所有权限
    if (permissions.length === 0) {
      return next();
    }

    // 检查特定权限
    if (!permissions.includes(permission) && !permissions.includes('*')) {
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        message: `缺少权限: ${permission}`,
      });
    }

    next();
  };
};

/**
 * 基于Redis的分布式速率限制
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${options.keyPrefix || 'rate_limit'}:${req.tenant?.id || 'anonymous'}:${req.ip}`;
    const windowMs = options.windowMs;
    const max = options.max;

    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // 使用Redis Sorted Set实现滑动窗口
      const pipeline = redis.pipeline();
      
      // 移除窗口期外的请求记录
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // 获取当前窗口内的请求数
      pipeline.zcard(key);
      
      // 添加当前请求
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // 设置key过期时间
      pipeline.pexpire(key, windowMs);

      const results = await pipeline.exec();
      const currentCount = results?.[1]?.[1] as number || 0;

      // 计算重置时间
      const resetTime = new Date(now + windowMs);
      
      // 设置响应头
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - currentCount - 1).toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

      req.rateLimitInfo = {
        limit: max,
        remaining: Math.max(0, max - currentCount - 1),
        reset: resetTime,
      };

      if (currentCount >= max) {
        return res.status(429).json({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
          data: {
            retryAfter: Math.ceil(windowMs / 1000),
          },
        });
      }

      next();
    } catch (error) {
      console.error('速率限制检查错误:', error);
      // 速率限制服务故障时，允许请求通过（fail open）
      next();
    }
  };
};

/**
 * 租户级API速率限制
 */
export const tenantRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  max: 1000, // 每分钟1000请求
  keyPrefix: 'tenant_api',
});

/**
 * 严格模式速率限制（用于敏感操作）
 */
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 每分钟10请求
  keyPrefix: 'strict_api',
});

/**
 * 请求大小限制中间件
 */
export const checkRequestSize = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        code: 'REQUEST_TOO_LARGE',
        message: `请求体大小超过限制 (${Math.round(maxSize / 1024 / 1024)}MB)`,
      });
    }

    next();
  };
};

/**
 * 请求验证中间件
 * 验证请求格式和内容
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // 验证Content-Type
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    
    if (contentType && !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: '仅支持 application/json 格式',
      });
    }
  }

  // 安全头检查
  const userAgent = req.headers['user-agent'];
  if (!userAgent && process.env.NODE_ENV === 'production') {
    return res.status(400).json({
      success: false,
      code: 'USER_AGENT_REQUIRED',
      message: '缺少User-Agent头',
    });
  }

  next();
};

/**
 * CORS预检处理中间件
 */
export const handleCors = (req: Request, res: Response, next: NextFunction) => {
  // 允许的源（实际应从配置读取）
  const allowedOrigins = config.cors?.origins || ['http://localhost:5173'];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Tenant-Slug');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }

  next();
};

/**
 * 安全头中间件
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS保护
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // 内容类型嗅探保护
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // 引用策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 内容安全策略（CSP）
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  
  // HSTS（仅在HTTPS环境下）
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

/**
 * 请求ID中间件
 * 为每个请求生成唯一ID，便于追踪
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

export default {
  checkFeatureFlag,
  authenticateApiKey,
  requireApiPermission,
  createRateLimiter,
  tenantRateLimit,
  strictRateLimit,
  checkRequestSize,
  validateRequest,
  handleCors,
  securityHeaders,
  requestId,
};
