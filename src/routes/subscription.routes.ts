import express from 'express';
import {
  getPlans,
  getCurrentSubscription,
  createSubscription,
  cancelSubscription,
  getInvoices
} from '../controllers/subscription.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   get:
 *     summary: 获取订阅计划列表
 *     tags: [Subscriptions]
 */
router.get('/plans', authenticate, getPlans);

/**
 * @swagger
 * /api/v1/subscriptions/current:
 *   get:
 *     summary: 获取当前租户订阅
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/current', authenticate, getCurrentSubscription);

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: 创建订阅
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, createSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/cancel:
 *   post:
 *     summary: 取消订阅
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
router.post('/cancel', authenticate, cancelSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/invoices:
 *   get:
 *     summary: 获取发票列表
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/invoices', authenticate, getInvoices);

export default router;
