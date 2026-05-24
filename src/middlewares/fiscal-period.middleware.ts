import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查文档日期是否在当前账期内
 * 业务逻辑：单据日期必须大于等于当前账期（允许补单和提前做单，与系统日期无关）
 * @param documentDate 文档日期
 * @param tenant 租户信息
 * @returns 是否允许操作
 */
export function isWithinFiscalPeriod(documentDate: Date, tenant: any): boolean {
  const currentYear = tenant.currentFiscalYear;
  const currentMonth = tenant.currentFiscalMonth;

  if (!currentYear || !currentMonth) {
    return true; // 未设置账期，跳过检查
  }

  // 计算当前账期的开始日期（当月1日）
  const periodStart = new Date(currentYear, currentMonth - 1, 1);

  // 单据日期必须大于等于当前账期开始日期（允许提前做单，不检查上限）
  return documentDate >= periodStart;
}

/**
 * 获取当前账期范围
 */
export function getFiscalPeriodRange(tenant: any): { start: Date; end: Date } | null {
  const currentYear = tenant.currentFiscalYear;
  const currentMonth = tenant.currentFiscalMonth;

  if (!currentYear || !currentMonth) {
    return null;
  }

  return {
    start: new Date(currentYear, currentMonth - 1, 1),
    end: new Date(currentYear, currentMonth, 0, 23, 59, 59)
  };
}

/**
 * 账期检查中间件工厂
 * 用于需要检查账期的路由
 */
export const checkFiscalPeriod = (dateField: string = 'date') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = req.tenant;

      if (!tenant) {
        return res.status(401).json({
          success: false,
          message: '未找到租户信息',
        });
      }

      // 系统管理员跳过账期检查
      if (req.user?.role === 'super_admin') {
        return next();
      }

      // 获取请求体中的日期字段
      const documentDate = req.body[dateField] || req.query[dateField];

      if (!documentDate) {
        // 没有日期字段，允许继续（可能是查询操作）
        return next();
      }

      const date = new Date(documentDate);
      if (isNaN(date.getTime())) {
        return next(); // 日期格式无效，跳过检查
      }

      if (!isWithinFiscalPeriod(date, tenant)) {
        const periodRange = getFiscalPeriodRange(tenant);
        const startStr = periodRange
          ? `${periodRange.start.getFullYear()}年${(periodRange.start.getMonth() + 1)}月`
          : '未知';

        return res.status(403).json({
          success: false,
          message: `单据日期早于当前账期（${startStr}起），禁止操作历史账期数据`,
        });
      }

      next();
    } catch (error) {
      console.error('账期检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '账期检查失败',
      });
    }
  };
};

/**
 * 获取租户当前账期信息
 */
export const getTenantFiscalPeriod = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return null;
  }

  const periodRange = getFiscalPeriodRange(tenant);

  return {
    fiscalYearStartYear: tenant.fiscalYearStartYear,
    fiscalYearStartMonth: tenant.fiscalYearStartMonth,
    currentFiscalYear: tenant.currentFiscalYear,
    currentFiscalMonth: tenant.currentFiscalMonth,
    periodStart: periodRange?.start,
    periodEnd: periodRange?.end,
  };
};

export default {
  isWithinFiscalPeriod,
  getFiscalPeriodRange,
  checkFiscalPeriod,
  getTenantFiscalPeriod,
};
