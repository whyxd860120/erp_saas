import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

// 获取订阅计划列表
export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });

    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('获取订阅计划失败:', error);
    res.status(500).json({ success: false, message: '获取订阅计划失败' });
  }
};

// 获取当前租户的订阅信�?
export const getCurrentSubscription = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, status: { not: 'cancelled' } },
      orderBy: { createdAt: 'desc' },
      include: { plan: true }
    });

    res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('获取订阅信息失败:', error);
    res.status(500).json({ success: false, message: '获取订阅信息失败' });
  }
};

// 创建订阅（内部使用）
export const createSubscription = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { planId, externalId, billingCycle, price, currency } = req.body;

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ success: false, message: '计划不存在' });
    }

    const now = new Date();
    const currentPeriodEndsAt = new Date();
    if (billingCycle === 'yearly') {
      currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
    } else {
      currentPeriodEndsAt.setMonth(currentPeriodEndsAt.getMonth() + 1);
    }

    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        planId,
        externalId,
        status: 'active',
        price: price || plan.price,
        currency: currency || plan.currency,
        billingCycle: billingCycle || plan.billingCycle,
        currentPeriodStartsAt: now,
        currentPeriodEndsAt
      }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'create',
      module: 'subscription',
      resource: subscription.id,
      detail: JSON.stringify({ planId })
    });

    res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('创建订阅失败:', error);
    res.status(500).json({ success: false, message: '创建订阅失败' });
  }
};

// 取消订阅
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, status: 'active' }
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: '没有找到有效订阅' });
    }

    const cancelsAt = new Date(subscription.currentPeriodEndsAt || Date.now());
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelsAt,
        cancelledAt: new Date()
      }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'update',
      module: 'subscription',
      resource: subscription.id,
      detail: '取消订阅'
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('取消订阅失败:', error);
    res.status(500).json({ success: false, message: '取消订阅失败' });
  }
};

// 获取发票列表
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const invoices = await prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { subscription: true }
    });

    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('获取发票失败:', error);
    res.status(500).json({ success: false, message: '获取发票失败' });
  }
};

export default {
  getPlans,
  getCurrentSubscription,
  createSubscription,
  cancelSubscription,
  getInvoices
};
