import express from 'express';
import {
  getApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey
} from '../controllers/api-key.controller';
import { authenticate, tenantIsolation } from '../middlewares/auth.middleware';
import { checkFeature } from '../middlewares/feature.middleware';

const router = express.Router();

/**
 * @swagger
 * /api/v1/api-keys:
 *   get:
 *     summary: 获取API密钥列表
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, tenantIsolation(true), checkFeature('apiAccess'), getApiKeys);

/**
 * @swagger
 * /api/v1/api-keys:
 *   post:
 *     summary: 创建API密钥
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, tenantIsolation(true), checkFeature('apiAccess'), createApiKey);

/**
 * @swagger
 * /api/v1/api-keys/{id}:
 *   put:
 *     summary: 更新API密钥
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticate, tenantIsolation(true), checkFeature('apiAccess'), updateApiKey);

/**
 * @swagger
 * /api/v1/api-keys/{id}:
 *   delete:
 *     summary: 删除API密钥
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, tenantIsolation(true), checkFeature('apiAccess'), deleteApiKey);

export default router;
