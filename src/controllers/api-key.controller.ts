import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

// 生成安全的API密钥
const generateApiKey = () => {
  return 'sk_' + crypto.randomBytes(32).toString('hex');
};

// 获取API密钥列表
export const getApiKeys = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        key: true,
        lastUsedAt: true,
        lastUsedIp: true,
        expiresAt: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json({ success: true, data: apiKeys });
  } catch (error) {
    console.error('获取API密钥失败:', error);
    res.status(500).json({ success: false, message: '获取API密钥失败' });
  }
};

// 创建API密钥
export const createApiKey = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { name, permissions, expiresInDays } = req.body;
    const key = generateApiKey();

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId,
        name,
        key,
        permissions,
        expiresAt,
        isActive: true
      }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'create',
      module: 'api-key',
      resource: apiKey.id
    });

    res.json({ success: true, data: apiKey });
  } catch (error) {
    console.error('创建API密钥失败:', error);
    res.status(500).json({ success: false, message: '创建API密钥失败' });
  }
};

// 更新API密钥
export const updateApiKey = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { id } = req.params;
    const { name, permissions, isActive } = req.body;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id, tenantId }
    });

    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'API密钥不存在' });
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        name,
        permissions,
        isActive
      }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'update',
      module: 'api-key',
      resource: id
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('更新API密钥失败:', error);
    res.status(500).json({ success: false, message: '更新API密钥失败' });
  }
};

// 删除API密钥
export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { id } = req.params;

    await prisma.apiKey.deleteMany({
      where: { id, tenantId }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'delete',
      module: 'api-key',
      resource: id
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除API密钥失败:', error);
    res.status(500).json({ success: false, message: '删除API密钥失败' });
  }
};

export default {
  getApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey
};
