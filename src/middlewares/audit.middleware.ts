import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 审计日志中间件
export const auditMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 记录操作日志
  try {
    const user = (req as any).user; // 从 JWT 中获取用户信息
    if (user && req.method !== 'GET') {
      // 只在非 GET 请求时记录日志
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId || null,
          userId: user.userId || null,
          action: req.method.toLowerCase(),
          module: req.path.split('/')[1] || 'unknown',
          resource: req.path,
          detail: JSON.stringify(req.body),
          ip: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
        },
      });
    }
  } catch (error) {
    console.error('审计日志记录失败:', error);
  }

  next();
};

// 简化的审计中间件（如果上面有问题，使用这个）
export const simpleAuditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 只记录到控制台
  if (req.method !== 'GET') {
    console.log(`[AUDIT] ${req.method} ${req.path} - User: ${(req as any).user?.userId || 'unknown'}`);
  }
  next();
};

// 导出 auditLogger（兼容 app.ts 的导入）
export const auditLogger = simpleAuditMiddleware;
