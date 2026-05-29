import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';
import { parseDateStart, parseDateEnd } from '../utils/date.util';

const prisma = new PrismaClient();

/**
 * 获取收款单列表
 * GET /api/v1/payment-receipts
 */
export const getPaymentReceipts = async (req: Request, res: Response) => {
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
      status,
      orderId,
      accountId,
      startDate,
      endDate,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    if (accountId) {
      where.accountId = accountId;
    }

    if (startDate || endDate) {
      where.receiptDate = {};
      if (startDate) {
        where.receiptDate.gte = parseDateStart(startDate as string);
      }
      if (endDate) {
        where.receiptDate.lte = parseDateEnd(endDate as string);
      }
    }

    if (search) {
      where.OR = [
        { receiptNo: { contains: search as string } },
        { remark: { contains: search as string } },
      ];
    }

    // 查询收款单列表
    const [receipts, total] = await Promise.all([
      prisma.paymentReceipt.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              customer: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          account: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentReceipt.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: receipts,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取收款单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取收款单列表失败',
    });
  }
};

/**
 * 获取收款单详情
 * GET /api/v1/payment-receipts/:id
 */
export const getPaymentReceiptById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const receipt = await prisma.paymentReceipt.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            totalAmount: true,
            customer: {
              select: {
                id: true,
                code: true,
                name: true,
                contact: true,
                phone: true,
              },
            },
          },
        },
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: '收款单不存在',
      });
    }

    return res.json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    console.error('获取收款单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取收款单详情失败',
    });
  }
};

/**
 * 创建收款单
 * POST /api/v1/payment-receipts
 */
export const createPaymentReceipt = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      receiptNo,
      orderId,
      accountId,
      receiptDate = new Date(),
      amount,
      remark,
    } = req.body;

    // 验证参数
    if (!receiptNo || !amount) {
      return res.status(400).json({
        success: false,
        message: '收款单编号和金额不能为空',
      });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: '金额必须是大于0的数字',
      });
    }

    const amountNum = parseFloat(amount);

    // 检查收款单编号是否已存在（同一租户内）
    const existingReceipt = await prisma.paymentReceipt.findFirst({
      where: {
        tenantId: req.user.tenantId,
        receiptNo,
      },
    });

    if (existingReceipt) {
      return res.status(400).json({
        success: false,
        message: '收款单编号已存在',
      });
    }

    // 如果关联销售订单，检查是否存在
    if (orderId) {
      const order = await prisma.salesOrder.findFirst({
        where: {
          id: orderId,
          tenantId: req.user.tenantId,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: '销售订单不存在',
        });
      }
    }

    // 检查账户是否存在
    if (accountId) {
      const account = await prisma.account.findFirst({
        where: {
          id: accountId,
          tenantId: req.user.tenantId,
        },
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: '账户不存在',
        });
      }
    }

    // 创建收款单（事务：创建收款单 + 更新账户余额）
    const receipt = await prisma.$transaction(async (tx) => {
      // 创建收款单
      const newReceipt = await tx.paymentReceipt.create({
        data: {
          tenantId: req.user!.tenantId!,
          receiptNo,
          orderId,
          accountId,
          receiptDate: new Date(receiptDate),
          amount: amountNum,
          status: 'draft',
          remark,
          creatorId: req.user.id,
        },
      });

      return newReceipt;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'payment_receipt',
      resource: receipt.id,
      detail: JSON.stringify({ receiptNo, orderId, accountId, amount: amountNum }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的收款单信息
    const createdReceipt = await prisma.paymentReceipt.findUnique({
      where: { id: receipt.id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            customer: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        account: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: createdReceipt,
      message: '收款单创建成功',
    });
  } catch (error) {
    console.error('创建收款单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建收款单失败',
    });
  }
};

/**
 * 确认收款单（草稿 → 已确认，同时更新账户余额）
 * POST /api/v1/payment-receipts/:id/confirm
 */
export const confirmPaymentReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查收款单是否存在
    const existingReceipt = await prisma.paymentReceipt.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingReceipt) {
      return res.status(404).json({
        success: false,
        message: '收款单不存在',
      });
    }

    // 只有草稿状态可以确认
    if (existingReceipt.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以确认',
      });
    }

    // 确认收款单（事务：更新状态 + 更新账户余额）
    const confirmedReceipt = await prisma.$transaction(async (tx) => {
      // 1. 更新收款单状态
      const updatedReceipt = await tx.paymentReceipt.update({
        where: { id },
        data: { status: 'confirmed' },
      });

      // 2. 更新账户余额（增加）- 在事务内查询最新账户数据，防止TOCTOU
      if (existingReceipt.accountId) {
        const account = await tx.account.findUnique({
          where: { id: existingReceipt.accountId },
        });
        if (account) {
          await tx.account.update({
            where: { id: existingReceipt.accountId },
            data: {
              balance: account.balance + existingReceipt.amount,
            },
          });
        }
      }

      // 3. 如果关联销售订单，更新订单已收款金额
      if (existingReceipt.orderId) {
        const order = await tx.salesOrder.findUnique({
          where: { id: existingReceipt.orderId },
          include: {
            receipts: {
              where: { status: 'confirmed' },
            },
          },
        });

        if (order) {
          // 计算已确认收款单的总金额
          const totalReceived = order.receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

          // 更新订单的已收款金额
          await tx.salesOrder.update({
            where: { id: existingReceipt.orderId },
            data: { paidAmount: totalReceived },
          });
        }
      }

      return updatedReceipt;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'payment_receipt',
      resource: id,
      detail: JSON.stringify({ action: 'confirm', status: 'confirmed' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: confirmedReceipt,
      message: '收款单确认成功，账户余额已更新',
    });
  } catch (error) {
    console.error('确认收款单错误:', error);
    return res.status(500).json({
      success: false,
      message: '确认收款单失败',
    });
  }
};

/**
 * 删除收款单（仅草稿状态）
 * DELETE /api/v1/payment-receipts/:id
 */
export const deletePaymentReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查收款单是否存在
    const existingReceipt = await prisma.paymentReceipt.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingReceipt) {
      return res.status(404).json({
        success: false,
        message: '收款单不存在',
      });
    }

    // 只有草稿状态可以删除
    if (existingReceipt.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以删除',
      });
    }

    // 删除收款单
    await prisma.paymentReceipt.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'payment_receipt',
      resource: id,
      detail: JSON.stringify({ receiptNo: existingReceipt.receiptNo, orderId: existingReceipt.orderId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '收款单删除成功',
    });
  } catch (error) {
    console.error('删除收款单错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除收款单失败',
    });
  }
};

export default {
  getPaymentReceipts,
  getPaymentReceiptById,
  createPaymentReceipt,
  confirmPaymentReceipt,
  deletePaymentReceipt,
};
