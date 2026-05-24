import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

/**
 * 获取审计日志列表
 * GET /api/v1/audit-logs
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      page = '1',
      limit = '10',
      userId,
      action,
      module,
      resource,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (module) {
      where.module = module;
    }

    if (resource) {
      where.resource = resource;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // 查询审计日志列表
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: logs,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取审计日志错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取审计日志失败',
    });
  }
};

/**
 * 获取审计日志统计
 * GET /api/v1/audit-logs/stats
 */
export const getAuditLogStats = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      startDate,
      endDate,
      groupBy = 'date', // user|action|module|date
    } = req.query;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // 查询审计日志
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 根据groupBy分组统计
    let stats: any[] = [];

    if (groupBy === 'user') {
      // 按用户分组
      const userMap = new Map();
      logs.forEach(log => {
        const userId = log.userId;
        const userName = log.user?.name || log.user?.email || '未知用户';
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            userName,
            count: 0,
            actions: {} as Record<string, number>,
          });
        }

        const stat = userMap.get(userId);
        stat.count++;
        stat.actions[log.action] = (stat.actions[log.action] || 0) + 1;
      });

      stats = Array.from(userMap.values());
    } else if (groupBy === 'action') {
      // 按操作类型分组
      const actionMap = new Map();
      logs.forEach(log => {
        const action = log.action;
        
        if (!actionMap.has(action)) {
          actionMap.set(action, {
            action,
            count: 0,
          });
        }

        const stat = actionMap.get(action);
        stat.count++;
      });

      stats = Array.from(actionMap.values());
    } else if (groupBy === 'module') {
      // 按模块分组
      const moduleMap = new Map();
      logs.forEach(log => {
        const module = log.module;
        
        if (!moduleMap.has(module)) {
          moduleMap.set(module, {
            module,
            count: 0,
          });
        }

        const stat = moduleMap.get(module);
        stat.count++;
      });

      stats = Array.from(moduleMap.values());
    } else {
      // 按日期分组（默认）
      const dateMap = new Map();
      logs.forEach(log => {
        const date = log.createdAt.toISOString().split('T')[0];
        
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date,
            count: 0,
          });
        }

        const stat = dateMap.get(date);
        stat.count++;
      });

      stats = Array.from(dateMap.values());
    }

    return res.json({
      success: true,
      data: {
        items: stats,
        total: logs.length,
        groupBy,
      },
    });
  } catch (error) {
    console.error('获取审计日志统计错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取审计日志统计失败',
    });
  }
};

export default {
  getAuditLogs,
  getAuditLogStats,
};
