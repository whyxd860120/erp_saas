import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 获取账户列表
 * GET /api/v1/accounts
 */
export const getAccounts = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      page = '1',
      limit = '10',
      type,
      status = 'active',
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { code: { contains: search as string } },
        { name: { contains: search as string } },
      ];
    }

    // 查询账户列表
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.account.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: accounts,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取账户列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取账户列表失败',
    });
  }
};

/**
 * 获取账户详情
 * GET /api/v1/accounts/:id
 */
export const getAccountById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const account = await prisma.account.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: '账户不存在',
      });
    }

    return res.json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error('获取账户详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取账户详情失败',
    });
  }
};

/**
 * 创建账户
 * POST /api/v1/accounts
 */
export const createAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      code,
      name,
      type,
      remark,
    } = req.body;

    // 验证参数
    if (!code || !name || !type) {
      return res.status(400).json({
        success: false,
        message: '账户编码、名称和类型不能为空',
      });
    }

    // 验证账户类型
    const validTypes = ['bank', 'cash', 'alipay', 'wechat'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `账户类型无效，必须是: ${validTypes.join(', ')}`,
      });
    }

    // 检查编码是否已存在（同一租户内）
    const existingAccount = await prisma.account.findFirst({
      where: {
        tenantId: req.user.tenantId,
        code,
      },
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: '账户编码已存在',
      });
    }

    // 创建账户
    const account = await prisma.account.create({
      data: {
        tenantId: req.user.tenantId,
        code,
        name,
        type,
        balance: 0,
        remark,
        status: 'active',
      },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'account',
      resource: account.id,
      detail: JSON.stringify({ code, name, type }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({
      success: true,
      data: account,
      message: '账户创建成功',
    });
  } catch (error) {
    console.error('创建账户错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建账户失败',
    });
  }
};

/**
 * 更新账户
 * PUT /api/v1/accounts/:id
 */
export const updateAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      type,
      status,
      remark,
    } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查账户是否存在
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        message: '账户不存在',
      });
    }

    // 如果修改编码，检查新编码是否已存在
    if (code && code !== existingAccount.code) {
      const codeExists = await prisma.account.findFirst({
        where: {
          tenantId: req.user.tenantId,
          code,
          id: { not: id },
        },
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: '账户编码已存在',
        });
      }
    }

    // 如果修改类型，验证类型有效性
    if (type) {
      const validTypes = ['bank', 'cash', 'alipay', 'wechat'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `账户类型无效，必须是: ${validTypes.join(', ')}`,
        });
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark;

    // 更新账户
    const updatedAccount = await prisma.account.update({
      where: { id },
      data: updateData,
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'account',
      resource: id,
      detail: JSON.stringify({ ...updateData }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedAccount,
      message: '账户更新成功',
    });
  } catch (error) {
    console.error('更新账户错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新账户失败',
    });
  }
};

/**
 * 删除账户
 * DELETE /api/v1/accounts/:id
 */
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查账户是否存在
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        message: '账户不存在',
      });
    }

    // 检查余额是否为零
    const balance = Number(existingAccount.balance);
    if (balance !== 0) {
      return res.status(400).json({
        success: false,
        message: '账户余额不为零，无法删除',
      });
    }

    // 检查是否有关联的收款单
    const receiptPayments = await prisma.paymentReceipt.findFirst({
      where: {
        accountId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (receiptPayments) {
      return res.status(400).json({
        success: false,
        message: '该账户有关联的收款单，无法删除',
      });
    }

    // 检查是否有关联的付款单
    const paymentPayments = await prisma.paymentPayment.findFirst({
      where: {
        accountId: id,
        tenantId: req.user.tenantId,
      },
    });

    if (paymentPayments) {
      return res.status(400).json({
        success: false,
        message: '该账户有关联的付款单，无法删除',
      });
    }

    // 删除账户
    await prisma.account.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'account',
      resource: id,
      detail: JSON.stringify({ code: existingAccount.code, name: existingAccount.name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '账户删除成功',
    });
  } catch (error) {
    console.error('删除账户错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除账户失败',
    });
  }
};

/**
 * 调整账户余额（管理员）
 * POST /api/v1/accounts/:id/adjust-balance
 */
export const adjustBalance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, remark } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({
        success: false,
        message: '调整金额必须是有效数字',
      });
    }

    const adjustAmount = parseFloat(amount);

    // 检查账户是否存在
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        message: '账户不存在',
      });
    }

    // 计算新余额
    const newBalance = existingAccount.balance + adjustAmount;

    // 更新余额
    const updatedAccount = await prisma.account.update({
      where: { id },
      data: { balance: newBalance },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'account',
      resource: id,
      detail: JSON.stringify({ 
        action: 'adjust_balance',
        amount: adjustAmount,
        oldBalance: existingAccount.balance,
        newBalance,
        remark 
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updatedAccount,
      message: '账户余额调整成功',
    });
  } catch (error) {
    console.error('调整账户余额错误:', error);
    return res.status(500).json({
      success: false,
      message: '调整账户余额失败',
    });
  }
};

export default {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  adjustBalance,
};
