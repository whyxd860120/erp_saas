import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

// 业务类型映射
const BUSINESS_TYPE_MAP: Record<string, string> = {
  purchase_order: '采购订单',
  sales_order: '销售订单',
  purchase_inbound: '采购入库',
  sales_outbound: '销售出库',
  payment_receipt: '收款单',
  payment_payment: '付款单',
  stock_take: '盘点单',
  other_inbound: '其他入库',
  other_outbound: '其他出库',
  stock_transfer: '调拨单',
};

/**
 * 格式化日期
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('YY', String(year).slice(-2))
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * 生成序号（补零）
 */
function padSequence(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

/**
 * 检查是否需要重置序号
 */
function shouldReset(lastResetDate: Date | null, resetType: string): boolean {
  if (!lastResetDate || resetType === 'never') return false;
  
  const now = new Date();
  
  switch (resetType) {
    case 'daily':
      return lastResetDate.toDateString() !== now.toDateString();
    case 'monthly':
      return lastResetDate.getFullYear() !== now.getFullYear() || 
             lastResetDate.getMonth() !== now.getMonth();
    case 'yearly':
      return lastResetDate.getFullYear() !== now.getFullYear();
    default:
      return false;
  }
}

/**
 * 获取编码规则列表
 * GET /api/v1/numbering-rules
 */
export const getNumberingRules = async (req: Request, res: Response) => {
  try {
    const { businessType, status } = req.query;
    const where: any = {};
    
    // 系统管理员可以查看所有租户的规则
    if (req.user?.role === 'super_admin') {
      // 系统管理员：查询所有租户的规则
      if (businessType) where.businessType = businessType;
      if (status) where.status = status;
    } else {
      // 租户管理员：只查询自己租户的规则
      if (!req.user?.tenantId) {
        return res.status(400).json({
          success: false,
          message: '未关联租户',
        });
      }
      
      where.tenantId = req.user.tenantId;
      if (businessType) where.businessType = businessType;
      if (status) where.status = status;
    }

    const rules = await prisma.numberingRule.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 转换显示
    const displayRules = rules.map(rule => ({
      ...rule,
      businessTypeName: BUSINESS_TYPE_MAP[rule.businessType] || rule.businessType,
      resetTypeName: {
        daily: '每天',
        monthly: '每月',
        yearly: '每年',
        never: '从不'
      }[rule.resetType] || rule.resetType,
      tenantName: rule.tenant?.name || '系统默认',
    }));

    return res.json({
      success: true,
      data: displayRules,
    });
  } catch (error) {
    console.error('获取编码规则列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取编码规则列表失败',
    });
  }
};

/**
 * 获取单个编码规则
 * GET /api/v1/numbering-rules/:id
 */
export const getNumberingRuleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const where: any = { id };

    // 系统管理员可以查看任何租户的规则
    if (req.user?.role !== 'super_admin') {
      // 租户管理员：只能查看自己租户的规则
      if (!req.user?.tenantId) {
        return res.status(400).json({
          success: false,
          message: '未关联租户',
        });
      }
      where.tenantId = req.user.tenantId;
    }

    const rule = await prisma.numberingRule.findFirst({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: '编码规则不存在',
      });
    }

    return res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('获取编码规则详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取编码规则详情失败',
    });
  }
};

/**
 * 创建编码规则
 * POST /api/v1/numbering-rules
 */
export const createNumberingRule = async (req: Request, res: Response) => {
  try {
    // 系统管理员不能直接创建编码规则
    if (req.user?.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '系统管理员不能直接创建编码规则，请在租户管理中进入相应租户进行操作',
      });
    }

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      businessType,
      name,
      prefix,
      dateFormat = 'YYYYMMDD',
      sequenceLength = 4,
      startNumber = 1,
      resetType = 'never',
      separator = '-',
      status = 'active',
    } = req.body;

    // 验证必填项
    if (!businessType || !name || !prefix) {
      return res.status(400).json({
        success: false,
        message: '业务类型、规则名称和前缀不能为空',
      });
    }

    // 检查业务类型是否已存在
    const existingRule = await prisma.numberingRule.findFirst({
      where: {
        tenantId: req.user.tenantId,
        businessType,
      },
    });

    if (existingRule) {
      return res.status(400).json({
        success: false,
        message: `该业务类型（${BUSINESS_TYPE_MAP[businessType] || businessType}）的编码规则已存在`,
      });
    }

    // 创建编码规则
    const rule = await prisma.numberingRule.create({
      data: {
        tenantId: req.user.tenantId,
        businessType,
        name,
        prefix,
        dateFormat,
        sequenceLength: parseInt(sequenceLength),
        startNumber: parseInt(startNumber),
        currentNumber: parseInt(startNumber) - 1,
        resetType,
        separator,
        status,
      },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'numbering_rule',
      resource: rule.id,
      detail: JSON.stringify({ businessType, name, prefix }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      success: true,
      data: rule,
      message: '编码规则创建成功',
    });
  } catch (error) {
    console.error('创建编码规则错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建编码规则失败',
    });
  }
};

/**
 * 更新编码规则
 * PUT /api/v1/numbering-rules/:id
 */
export const updateNumberingRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 系统管理员不能直接修改编码规则
    if (req.user?.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '系统管理员不能直接修改编码规则，请在租户管理中进入相应租户进行操作',
      });
    }

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      name,
      prefix,
      dateFormat,
      sequenceLength,
      resetType,
      separator,
      status,
    } = req.body;

    // 检查规则是否存在
    const existingRule = await prisma.numberingRule.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: '编码规则不存在',
      });
    }

    // 更新编码规则
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (prefix !== undefined) updateData.prefix = prefix;
    if (dateFormat !== undefined) updateData.dateFormat = dateFormat;
    if (sequenceLength !== undefined) updateData.sequenceLength = parseInt(sequenceLength);
    if (resetType !== undefined) updateData.resetType = resetType;
    if (separator !== undefined) updateData.separator = separator;
    if (status !== undefined) updateData.status = status;

    const rule = await prisma.numberingRule.update({
      where: { id },
      data: updateData,
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'numbering_rule',
      resource: id,
      detail: JSON.stringify(updateData),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: rule,
      message: '编码规则更新成功',
    });
  } catch (error) {
    console.error('更新编码规则错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新编码规则失败',
    });
  }
};

/**
 * 删除编码规则
 * DELETE /api/v1/numbering-rules/:id
 */
export const deleteNumberingRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 系统管理员不能直接删除编码规则
    if (req.user?.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '系统管理员不能直接删除编码规则，请在租户管理中进入相应租户进行操作',
      });
    }

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查规则是否存在
    const existingRule = await prisma.numberingRule.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        message: '编码规则不存在',
      });
    }

    // 删除规则
    await prisma.numberingRule.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'numbering_rule',
      resource: id,
      detail: JSON.stringify({ businessType: existingRule.businessType, name: existingRule.name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '编码规则删除成功',
    });
  } catch (error) {
    console.error('删除编码规则错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除编码规则失败',
    });
  }
};

/**
 * 生成下一个编号
 * POST /api/v1/numbering-rules/:businessType/generate
 */
export const generateNextNumber = async (req: Request, res: Response) => {
  try {
    const { businessType } = req.params;

    // 系统管理员不能直接生成编号
    if (req.user?.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '系统管理员不能直接生成编号，请切换到相应租户进行业务操作',
      });
    }

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 查找规则
    const rule = await prisma.numberingRule.findFirst({
      where: {
        tenantId: req.user.tenantId,
        businessType,
        status: 'active',
      },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: `业务类型（${BUSINESS_TYPE_MAP[businessType] || businessType}）的编码规则不存在或已禁用`,
      });
    }

    const now = new Date();

    // 检查是否需要重置序号
    let shouldResetSequence = false;
    if (rule.resetType !== 'never') {
      const lastNumberDate = rule.updatedAt;
      shouldResetSequence = shouldReset(lastNumberDate, rule.resetType);
    }

    // 使用原子操作更新序号，防止并发竞态
    let nextNumber: number;
    if (shouldResetSequence) {
      // 重置序号时，显式设置为起始值
      await prisma.numberingRule.update({
        where: { id: rule.id },
        data: { currentNumber: rule.startNumber, updatedAt: new Date() },
      });
      nextNumber = rule.startNumber;
    } else {
      // 原子递增：使用 increment 而不是先读后写
      const updated = await prisma.numberingRule.update({
        where: { id: rule.id },
        data: { currentNumber: { increment: 1 } },
      });
      nextNumber = updated.currentNumber;
    }

    // 生成编号
    const dateStr = formatDate(now, rule.dateFormat);
    const sequenceStr = padSequence(nextNumber, rule.sequenceLength);
    const generatedNo = `${rule.prefix}${rule.separator}${dateStr}${rule.separator}${sequenceStr}`;

    return res.json({
      success: true,
      data: {
        number: generatedNo,
        sequence: nextNumber,
      },
    });
  } catch (error) {
    console.error('生成编号错误:', error);
    return res.status(500).json({
      success: false,
      message: '生成编号失败',
    });
  }
};

export default {
  getNumberingRules,
  getNumberingRuleById,
  createNumberingRule,
  updateNumberingRule,
  deleteNumberingRule,
  generateNextNumber,
};
