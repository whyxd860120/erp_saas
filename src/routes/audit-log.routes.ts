import { Router } from 'express';
import {
  getAuditLogs,
  getAuditLogStats,
} from '../controllers/audit-log.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFeature } from '../middlewares/feature.middleware';

const router = Router();

/**
 * 获取审计日志列表
 * GET /api/v1/audit-logs
 * Query: page, limit, userId, action, module, resource, startDate, endDate
 */
router.get('/', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), checkFeature('auditLogs'), getAuditLogs);

/**
 * 获取审计日志统计
 * GET /api/v1/audit-logs/stats
 * Query: startDate, endDate, groupBy (user|action|module|date)
 */
router.get('/stats', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), checkFeature('auditLogs'), getAuditLogStats);

export default router;
