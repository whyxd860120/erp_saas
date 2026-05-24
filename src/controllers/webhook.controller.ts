import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

// 生成webhook密钥
const generateWebhookSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// 获取Webhook列表
export const getWebhooks = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const webhooks = await prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: webhooks });
  } catch (error) {
    console.error('获取Webhook列表失败:', error);
    res.status(500).json({ success: false, message: '获取Webhook列表失败' });
  }
};

// 创建Webhook
export const createWebhook = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { name, url, events, contentType } = req.body;
    const secret = generateWebhookSecret();

    const webhook = await prisma.webhook.create({
      data: {
        tenantId,
        name,
        url,
        events,
        secret,
        contentType: contentType || 'json',
        isActive: true
      }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'create',
      module: 'webhook',
      resource: webhook.id
    });

    res.json({ success: true, data: webhook });
  } catch (error) {
    console.error('创建Webhook失败:', error);
    res.status(500).json({ success: false, message: '创建Webhook失败' });
  }
};

// 更新Webhook
export const updateWebhook = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { id } = req.params;
    const { name, url, events, contentType, isActive } = req.body;

    const webhook = await prisma.webhook.findFirst({
      where: { id, tenantId }
    });

    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook不存在' });
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: {
        name,
        url,
        events,
        contentType,
        isActive
      }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'update',
      module: 'webhook',
      resource: id
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('更新Webhook失败:', error);
    res.status(500).json({ success: false, message: '更新Webhook失败' });
  }
};

// 重新生成Webhook密钥
export const regenerateWebhookSecret = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { id } = req.params;

    const webhook = await prisma.webhook.findFirst({
      where: { id, tenantId }
    });

    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook不存在' });
    }

    const secret = generateWebhookSecret();
    const updated = await prisma.webhook.update({
      where: { id },
      data: { secret }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'update',
      module: 'webhook',
      resource: id,
      detail: '重新生成密钥'
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('重新生成密钥失败:', error);
    res.status(500).json({ success: false, message: '重新生成密钥失败' });
  }
};

// 删除Webhook
export const deleteWebhook = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { id } = req.params;

    await prisma.webhook.deleteMany({
      where: { id, tenantId }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'delete',
      module: 'webhook',
      resource: id
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除Webhook失败:', error);
    res.status(500).json({ success: false, message: '删除Webhook失败' });
  }
};

// 获取Webhook日志
export const getWebhookLogs = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { webhookId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const logs = await prisma.webhookLog.findMany({
      where: { tenantId, webhookId },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize)
    });

    const total = await prisma.webhookLog.count({
      where: { tenantId, webhookId }
    });

    res.json({
      success: true,
      data: logs,
      pagination: { page: Number(page), pageSize: Number(pageSize), total }
    });
  } catch (error) {
    console.error('获取Webhook日志失败:', error);
    res.status(500).json({ success: false, message: '获取Webhook日志失败' });
  }
};

export default {
  getWebhooks,
  createWebhook,
  updateWebhook,
  regenerateWebhookSecret,
  deleteWebhook,
  getWebhookLogs
};

