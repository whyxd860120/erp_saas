import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 记录审计日志
 * @param params 审计日志参数
 */
export const auditLog = async (params: {
  tenantId?: string;
  userId?: string;
  action: string;
  module: string;
  resource?: string;
  detail?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId || null,
        userId: params.userId || null,
        action: params.action,
        module: params.module,
        resource: params.resource || null,
        detail: params.detail || null,
        ip: params.ip || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error('记录审计日志失败:', error);
    // 审计日志失败不阻塞主流程
  }
};

/**
 * 查询审计日志
 * @param params 查询参数
 */
export const getAuditLogs = async (params: {
  tenantId?: string;
  userId?: string;
  action?: string;
  module?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) => {
  try {
    const {
      tenantId,
      userId,
      action,
      module,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = params;

    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (module) {
      where.module = module;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // 查询审计日志
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('查询审计日志失败:', error);
    throw error;
  }
};

export default {
  auditLog,
  getAuditLogs,
};