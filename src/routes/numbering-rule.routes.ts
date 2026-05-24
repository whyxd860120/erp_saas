import { Router } from 'express';
import {
  getNumberingRules,
  getNumberingRuleById,
  createNumberingRule,
  updateNumberingRule,
  deleteNumberingRule,
  generateNextNumber,
} from '../controllers/numbering-rule.controller';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 获取编码规则列表
 * GET /api/v1/numbering-rules
 */
router.get('/', authenticate, tenantIsolation(true), getNumberingRules);

/**
 * 获取编码规则详情
 * GET /api/v1/numbering-rules/:id
 */
router.get('/:id', authenticate, tenantIsolation(true), getNumberingRuleById);

/**
 * 创建编码规则
 * POST /api/v1/numbering-rules
 */
router.post('/', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), createNumberingRule);

/**
 * 更新编码规则
 * PUT /api/v1/numbering-rules/:id
 */
router.put('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), updateNumberingRule);

/**
 * 删除编码规则
 * DELETE /api/v1/numbering-rules/:id
 */
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tenantIsolation(true), deleteNumberingRule);

/**
 * 生成下一个编号
 * POST /api/v1/numbering-rules/:businessType/generate
 */
router.post('/:businessType/generate', authenticate, tenantIsolation(true), generateNextNumber);

export default router;
