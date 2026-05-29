import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';
import { parseDateStart, parseDateEnd } from '../utils/date.util';

const prisma = new PrismaClient();

/**
 * 获取付款单列表
 * GET /api/v1/payment-payments
 */
export const getPaymentPayments = async (req: Request, res: Response) => {
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
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = parseDateStart(startDate as string);
      }
      if (endDate) {
        where.paymentDate.lte = parseDateEnd(endDate as string);
      }
    }

    if (search) {
      where.OR = [
        { paymentNo: { contains: search as string } },
        { remark: { contains: search as string } },
      ];
    }

    // 查询付款单列表
    const [payments, total] = await Promise.all([
      prisma.paymentPayment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              supplier: {
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
      prisma.paymentPayment.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: payments,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取付款单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取付款单列表失败',
    });
  }
};

/**
 * 获取付款单详情
 * GET /api/v1/payment-payments/:id
 */
export const getPaymentPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const payment = await prisma.paymentPayment.findFirst({
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
            supplier: {
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

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: '付款单不存在',
      });
    }

    return res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('获取付款单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取付款单详情失败',
    });
  }
};

/**
 * 创建付款单
 * POST /api/v1/payment-payments
 */
export const createPaymentPayment = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    const {
      paymentNo,
      orderId,
      accountId,
      paymentDate = new Date(),
      amount,
      remark,
    } = req.body;

    // 验证参数
    if (!paymentNo || !amount) {
      return res.status(400).json({
        success: false,
        message: '付款单编号和金额不能为空',
      });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: '金额必须是大于0的数字',
      });
    }

    const amountNum = parseFloat(amount);

    // 检查付款单编号是否已存在（同一租户内）
    const existingPayment = await prisma.paymentPayment.findFirst({
      where: {
        tenantId: req.user.tenantId,
        paymentNo,
      },
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: '付款单编号已存在',
      });
    }

    // 如果关联采购订单，检查是否存在
    if (orderId) {
      const order = await prisma.purchaseOrder.findFirst({
        where: {
          id: orderId,
          tenantId: req.user.tenantId,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: '采购订单不存在',
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
        // 注意：账户余额检查在事务内进行（见 confirmPaymentPayment），防止 TOCTOU 竞态
      }

    // 创建付款单（事务：创建付款单 + 更新账户余额）
    const payment = await prisma.$transaction(async (tx) => {
      // 创建付款单
      const newPayment = await tx.paymentPayment.create({
        data: {
          tenantId: req.user!.tenantId!,
          paymentNo,
          orderId,
          accountId,
          paymentDate: new Date(paymentDate),
          amount: amountNum,
          status: 'draft',
          remark,
          creatorId: req.user.id,
        },
      });

      return newPayment;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'payment_payment',
      resource: payment.id,
      detail: JSON.stringify({ paymentNo, orderId, accountId, amount: amountNum }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // 返回完整的付款单信息
    const createdPayment = await prisma.paymentPayment.findUnique({
      where: { id: payment.id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            supplier: {
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
      data: createdPayment,
      message: '付款单创建成功',
    });
  } catch (error) {
    console.error('创建付款单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建付款单失败',
    });
  }
};

/**
 * 确认付款单（草稿 → 已确认，同时更新账户余额）
 * POST /api/v1/payment-payments/:id/confirm
 */
export const confirmPaymentPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查付款单是否存在
    const existingPayment = await prisma.paymentPayment.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: '付款单不存在',
      });
    }

    // 只有草稿状态可以确认
    if (existingPayment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以确认',
      });
    }

    // 确认付款单（事务：更新状态 + 更新账户余额）
    const confirmedPayment = await prisma.$transaction(async (tx) => {
      // 1. 更新付款单状态
      const updatedPayment = await tx.paymentPayment.update({
        where: { id },
        data: { status: 'confirmed' },
      });

      // 2. 更新账户余额（减少）- 在事务内查询最新账户数据，防止TOCTOU竞态
      if (existingPayment.accountId) {
        const account = await tx.account.findUnique({
          where: { id: existingPayment.accountId },
        });
        if (account) {
          if (account.balance < existingPayment.amount) {
            throw new Error('账户余额不足');
          }
          await tx.account.update({
            where: { id: existingPayment.accountId },
            data: {
              balance: account.balance - existingPayment.amount,
            },
          });
        }
      }

      // 3. 如果关联采购订单，更新订单已付款金额
      if (existingPayment.orderId) {
        const order = await tx.purchaseOrder.findUnique({
          where: { id: existingPayment.orderId },
          include: {
            payments: {
              where: { status: 'confirmed' },
            },
          },
        });

        if (order) {
          // 计算已确认付款单的总金额
          const totalPaid = order.payments.reduce((sum, payment) => sum + payment.amount, 0);
          
          // 更新订单的已付款金额
          await tx.purchaseOrder.update({
            where: { id: existingPayment.orderId },
            data: { paidAmount: totalPaid },
          });
        }
      }

      return updatedPayment;
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'payment_payment',
      resource: id,
      detail: JSON.stringify({ action: 'confirm', status: 'confirmed' }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: confirmedPayment,
      message: '付款单确认成功，账户余额已更新',
    });
  } catch (error: any) {
    console.error('确认付款单错误:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '确认付款单失败',
    });
  }
};

/**
 * 删除付款单（仅草稿状态）
 * DELETE /api/v1/payment-payments/:id
 */
export const deletePaymentPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    // 检查付款单是否存在
    const existingPayment = await prisma.paymentPayment.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: '付款单不存在',
      });
    }

    // 只有草稿状态可以删除
    if (existingPayment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: '只有草稿状态可以删除',
      });
    }

    // 删除付款单
    await prisma.paymentPayment.delete({
      where: { id },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'payment_payment',
      resource: id,
      detail: JSON.stringify({ paymentNo: existingPayment.paymentNo, orderId: existingPayment.orderId }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: '付款单删除成功',
    });
  } catch (error) {
    console.error('删除付款单错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除付款单失败',
    });
  }
};

export default {
  getPaymentPayments,
  getPaymentPaymentById,
  createPaymentPayment,
  confirmPaymentPayment,
  deletePaymentPayment,
};
