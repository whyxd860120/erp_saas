import express from 'express';
import {
  getTenantSettings,
  saveTenantSetting,
  deleteTenantSetting,
  getCurrentTenant,
  updateTenant,
  carryForward,
  reversePeriod
} from '../controllers/tenant-setting.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * @swagger
 * /api/v1/tenant-settings:
 *   get:
 *     summary: 获取租户配置列表
 *     tags: [Tenant Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 租户配置列表
 */
router.get('/', authenticate, getTenantSettings);

/**
 * @swagger
 * /api/v1/tenant-settings:
 *   post:
 *     summary: 保存租户配置
 *     tags: [Tenant Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 */
router.post('/', authenticate, saveTenantSetting);

/**
 * @swagger
 * /api/v1/tenant-settings/{key}:
 *   delete:
 *     summary: 删除租户配置
 *     tags: [Tenant Settings]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:key', authenticate, deleteTenantSetting);

/**
 * @swagger
 * /api/v1/tenant-settings/current:
 *   get:
 *     summary: 获取当前租户信息
 *     tags: [Tenant Settings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/current/tenant', authenticate, getCurrentTenant);

/**
 * @swagger
 * /api/v1/tenant-settings/current:
 *   put:
 *     summary: 更新当前租户信息
 *     tags: [Tenant Settings]
 *     security:
 *       - bearerAuth: []
 */
router.put('/current/tenant', authenticate, updateTenant);

/**
 * @swagger
 * /api/v1/tenant-settings/carry-forward:
 *   post:
 *     summary: 结转至下期
 *     tags: [Tenant Settings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/carry-forward', authenticate, authorize(['admin', 'manager']), carryForward);

/**
 * @swagger
 * /api/v1/tenant-settings/reverse:
 *   post:
 *     summary: 反结账
 *     tags: [Tenant Settings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/reverse', authenticate, authorize(['admin', 'manager']), reversePeriod);

export default router;
