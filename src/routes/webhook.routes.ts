import express from 'express';
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  regenerateWebhookSecret,
  deleteWebhook,
  getWebhookLogs
} from '../controllers/webhook.controller';
import { authenticate, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFeature } from '../middlewares/feature.middleware';

const router = express.Router();

/**
 * @swagger
 * /api/v1/webhooks:
 *   get:
 *     summary: 获取Webhook列表
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, tenantIsolation(true), checkFeature('webhooks'), getWebhooks);

/**
 * @swagger
 * /api/v1/webhooks:
 *   post:
 *     summary: 创建Webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, tenantIsolation(true), checkFeature('webhooks'), createWebhook);

/**
 * @swagger
 * /api/v1/webhooks/{id}:
 *   put:
 *     summary: 更新Webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticate, tenantIsolation(true), checkFeature('webhooks'), updateWebhook);

/**
 * @swagger
 * /api/v1/webhooks/{id}/regenerate-secret:
 *   post:
 *     summary: 重新生成Webhook密钥
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/regenerate-secret', authenticate, tenantIsolation(true), checkFeature('webhooks'), regenerateWebhookSecret);

/**
 * @swagger
 * /api/v1/webhooks/{id}:
 *   delete:
 *     summary: 删除Webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, tenantIsolation(true), checkFeature('webhooks'), deleteWebhook);

/**
 * @swagger
 * /api/v1/webhooks/{webhookId}/logs:
 *   get:
 *     summary: 获取Webhook日志
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:webhookId/logs', authenticate, tenantIsolation(true), checkFeature('webhooks'), getWebhookLogs);

export default router;
