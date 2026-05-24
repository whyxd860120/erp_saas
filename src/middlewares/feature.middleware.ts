import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 功能权限检查中间件（简化版）
 * 由于租户有统一的租期限制，功能开关现在表示"是否有权限使用该功能"
 * 只要租户在租期内且功能开关为true，就可以使用该功能
 * 
 * 注意：如果需要更细粒度的功能控制，可以在这里添加更多逻辑
 */
export const checkFeature = (featureName: 'multiWarehouse' | 'multiCurrency' | 'customFields' | 'apiAccess' | 'webhooks' | 'auditLogs' | 'analytics') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 如果是系统管理员，跳过功能检查
      if (req.user?.role === 'super_admin') {
        return next();
      }

      const tenant = req.tenant;

      if (!tenant) {
        return res.status(401).json({
          success: false,
          message: '未找到租户信息',
        });
      }

      // 功能字段映射
      const featureMap: Record<string, string> = {
        multiWarehouse: 'featureMultiWarehouse',
        multiCurrency: 'featureMultiCurrency',
        customFields: 'featureCustomFields',
        apiAccess: 'featureApiAccess',
        webhooks: 'featureWebhooks',
        auditLogs: 'featureAuditLogs',
        analytics: 'featureAnalytics',
      };

      const featureField = featureMap[featureName];
      if (!featureField) {
        return res.status(500).json({
          success: false,
          message: '未知的功能类型',
        });
      }

      // 检查租户功能开关
      const enabled = tenant[featureField];
      if (!enabled) {
        return res.status(403).json({
          success: false,
          message: `该功能未启用，请联系管理员开通`,
        });
      }

      next();
    } catch (error) {
      console.error('功能权限检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '功能权限检查失败',
      });
    }
  };
};

export default {
  checkFeature,
};