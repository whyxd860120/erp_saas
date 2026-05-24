import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('全局错误捕获:', err);

  // Prisma错误
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '无效的认证令牌',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '认证令牌已过期',
    });
  }

  // bcrypt错误
  if (err.message.includes('bcrypt')) {
    return res.status(500).json({
      success: false,
      message: '密码加密失败',
    });
  }

  // 默认服务器错误
  return res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

/**
 * 处理Prisma已知错误
 */
function handlePrismaError(err: Prisma.PrismaClientKnownRequestError, res: Response) {
  switch (err.code) {
    case 'P2002': // 唯一约束违反
      const target = (err.meta?.target as string[]) || [];
      return res.status(409).json({
        success: false,
        message: `数据已存在: ${target.join(', ')}`,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });

    case 'P2014': // 外键约束违反
      return res.status(400).json({
        success: false,
        message: '关联数据不存在',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });

    case 'P2003': // 外键约束违反
      return res.status(400).json({
        success: false,
        message: '关联数据不存在',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });

    case 'P2025': // 记录不存在
      return res.status(404).json({
        success: false,
        message: '记录不存在',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });

    default:
      return res.status(500).json({
        success: false,
        message: '数据库错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
  }
}

/**
 * 异步错误捕获包装器
 * 用于包装async/await路由处理器
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  errorHandler,
  asyncHandler,
};
