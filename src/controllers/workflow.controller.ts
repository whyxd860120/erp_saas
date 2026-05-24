import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, tenantIsolation } from '../middlewares/auth.middleware';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

// 单据类型映射
const DOCUMENT_TYPES = {
  purchase_order: '采购订单',
  sales_order: '销售订单',
  purchase_inbound: '采购入库',
  sales_outbound: '销售出库',
  payment: '付款单',
  receipt: '收款单',
  expense: '费用报销',
  stock_adjustment: '库存调整'
};

/**
 * 获取工作流定义列表
 * GET /api/v1/workflows
 */
export const getWorkflowDefinitions = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { documentType } = req.query;

    const where: any = { tenantId: req.user.tenantId };
    if (documentType) {
      where.documentType = documentType;
    }

    const workflows = await prisma.workflowDefinition.findMany({
      where,
      include: {
        nodes: {
          orderBy: { orderIndex: 'asc' }
        },
        _count: {
          select: { instances: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: workflows });
  } catch (error) {
    console.error('获取工作流定义失败:', error);
    return res.status(500).json({ success: false, message: '获取工作流定义失败' });
  }
};

/**
 * 获取单个工作流定义
 * GET /api/v1/workflows/:id
 */
export const getWorkflowDefinition = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { id } = req.params;

    const workflow = await prisma.workflowDefinition.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: {
        nodes: {
          orderBy: { orderIndex: 'asc' },
          include: {
            conditions: true
          }
        }
      }
    });

    if (!workflow) {
      return res.status(404).json({ success: false, message: '工作流不存在' });
    }

    return res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('获取工作流定义失败:', error);
    return res.status(500).json({ success: false, message: '获取工作流定义失败' });
  }
};

/**
 * 创建工作流定义
 * POST /api/v1/workflows
 */
export const createWorkflowDefinition = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { name, code, documentType, description, nodes, settings } = req.body;

    // 检查编码唯一性
    const existing = await prisma.workflowDefinition.findFirst({
      where: { tenantId: req.user.tenantId, code }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '流程编码已存在' });
    }

    // 创建工作流和节点
    const workflow = await prisma.workflowDefinition.create({
      data: {
        tenantId: req.user.tenantId,
        name,
        code,
        documentType,
        description,
        settings: settings || {},
        createdBy: req.user.id,
        nodes: {
          create: nodes?.map((node: any, index: number) => ({
            name: node.name,
            nodeType: node.nodeType || 'approval',
            orderIndex: index,
            approverType: node.approverType || 'role',
            approverId: node.approverId,
            approverRoleId: node.approverRoleId,
            approverDeptId: node.approverDeptId,
            actionType: node.actionType || 'approve',
            timeoutHours: node.timeoutHours,
            remindHours: node.remindHours,
            settings: node.settings || {},
            conditions: node.conditions ? {
              create: node.conditions.map((c: any) => ({
                field: c.field,
                operator: c.operator,
                value: c.value,
                logicOp: c.logicOp || 'and'
              }))
            } : undefined
          }))
        }
      },
      include: {
        nodes: { orderBy: { orderIndex: 'asc' } }
      }
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'workflow',
      resource: workflow.id,
      detail: JSON.stringify({ name, code, documentType }),
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(201).json({ success: true, data: workflow });
  } catch (error) {
    console.error('创建工作流定义失败:', error);
    return res.status(500).json({ success: false, message: '创建工作流定义失败' });
  }
};

/**
 * 更新工作流定义
 * PUT /api/v1/workflows/:id
 */
export const updateWorkflowDefinition = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { id } = req.params;
    const { name, description, nodes, settings, isActive } = req.body;

    // 检查是否存在
    const existing = await prisma.workflowDefinition.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { nodes: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '工作流不存在' });
    }

    // 如果有节点更新，先删除旧节点
    if (nodes) {
      await prisma.workflowNode.deleteMany({ where: { workflowId: id } });
    }

    // 更新工作流
    const workflow = await prisma.workflowDefinition.update({
      where: { id },
      data: {
        name,
        description,
        settings: settings || {},
        isActive: isActive !== undefined ? isActive : existing.isActive,
        nodes: nodes ? {
          create: nodes.map((node: any, index: number) => ({
            name: node.name,
            nodeType: node.nodeType || 'approval',
            orderIndex: index,
            approverType: node.approverType || 'role',
            approverId: node.approverId,
            approverRoleId: node.approverRoleId,
            approverDeptId: node.approverDeptId,
            actionType: node.actionType || 'approve',
            timeoutHours: node.timeoutHours,
            remindHours: node.remindHours,
            settings: node.settings || {},
            conditions: node.conditions ? {
              create: node.conditions.map((c: any) => ({
                field: c.field,
                operator: c.operator,
                value: c.value,
                logicOp: c.logicOp || 'and'
              }))
            } : undefined
          }))
        } : undefined
      },
      include: {
        nodes: { orderBy: { orderIndex: 'asc' } }
      }
    });

    return res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('更新工作流定义失败:', error);
    return res.status(500).json({ success: false, message: '更新工作流定义失败' });
  }
};

/**
 * 删除工作流定义
 * DELETE /api/v1/workflows/:id
 */
export const deleteWorkflowDefinition = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { id } = req.params;

    const existing = await prisma.workflowDefinition.findFirst({
      where: { id, tenantId: req.user.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: '工作流不存在' });
    }

    // 检查是否有正在运行的实例
    const runningInstances = await prisma.workflowInstance.count({
      where: { workflowId: id, status: 'pending' }
    });

    if (runningInstances > 0) {
      return res.status(400).json({
        success: false,
        message: '该工作流有正在审批的实例，无法删除'
      });
    }

    await prisma.workflowDefinition.delete({ where: { id } });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'workflow',
      resource: id,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除工作流定义失败:', error);
    return res.status(500).json({ success: false, message: '删除工作流定义失败' });
  }
};

/**
 * 获取单据类型列表
 * GET /api/v1/workflows/document-types
 */
export const getDocumentTypes = async (req: Request, res: Response) => {
  const types = Object.entries(DOCUMENT_TYPES).map(([value, label]) => ({
    value,
    label
  }));
  return res.json({ success: true, data: types });
};

/**
 * 获取我的待办列表
 * GET /api/v1/workflows/todos
 */
export const getMyTodos = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId || !req.user?.id) {
      return res.status(400).json({ success: false, message: '未授权' });
    }

    const todos = await prisma.workflowTodo.findMany({
      where: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        isHandled: false
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return res.json({ success: true, data: todos });
  } catch (error) {
    console.error('获取待办列表失败:', error);
    return res.status(500).json({ success: false, message: '获取待办列表失败' });
  }
};

/**
 * 获取待我审批的单据列表
 * GET /api/v1/workflows/pending
 */
export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId || !req.user?.id) {
      return res.status(400).json({ success: false, message: '未授权' });
    }

    const pending = await prisma.workflowApproval.findMany({
      where: {
        approverId: req.user.id,
        status: 'pending'
      },
      include: {
        instance: {
          include: {
            workflow: true
          }
        },
        node: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: pending });
  } catch (error) {
    console.error('获取待审批列表失败:', error);
    return res.status(500).json({ success: false, message: '获取待审批列表失败' });
  }
};

/**
 * 审批单据
 * POST /api/v1/workflows/approve/:instanceId
 */
export const approveDocument = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId || !req.user?.id) {
      return res.status(400).json({ success: false, message: '未授权' });
    }

    const { instanceId } = req.params;
    const { opinion, action } = req.body; // action: approve, reject

    const instance = await prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId: req.user.tenantId },
      include: {
        workflow: {
          include: { nodes: { orderBy: { orderIndex: 'asc' } } }
        }
      }
    });

    if (!instance) {
      return res.status(404).json({ success: false, message: '审批实例不存在' });
    }

    if (instance.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该单据已不在待审批状态' });
    }

    // 查找当前审批记录
    const approval = await prisma.workflowApproval.findFirst({
      where: { instanceId, approverId: req.user.id, status: 'pending' }
    });

    if (!approval) {
      return res.status(400).json({ success: false, message: '您没有审批权限' });
    }

    if (action === 'reject') {
      // 驳回：更新实例状态
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'rejected', finishedAt: new Date() }
      });

      await prisma.workflowApproval.update({
        where: { id: approval.id },
        data: { status: 'rejected', opinion, actionAt: new Date() }
      });

      await prisma.workflowHistory.create({
        data: {
          instanceId,
          action: 'reject',
          actorId: req.user.id,
          actorName: req.user.name || '未知',
          nodeName: approval.node?.name,
          opinion
        }
      });

      return res.json({ success: true, message: '已驳回' });
    }

    // 审批通过：查找下一个节点
    const nodes = instance.workflow.nodes;
    const currentNodeIndex = nodes.findIndex(n => n.id === approval.nodeId);
    const nextNode = nodes[currentNodeIndex + 1];

    if (!nextNode) {
      // 没有下一个节点，审批完成
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'approved', finishedAt: new Date() }
      });
    } else {
      // 移动到下一个节点
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { currentNodeId: nextNode.id }
      });

      // 为下一个节点创建审批记录
      await createApprovalForNode(nextNode, instanceId, req.user.tenantId);
    }

    await prisma.workflowApproval.update({
      where: { id: approval.id },
      data: { status: 'approved', opinion, actionAt: new Date() }
    });

    await prisma.workflowHistory.create({
      data: {
        instanceId,
        action: 'approve',
        actorId: req.user.id,
        actorName: req.user.name || '未知',
        nodeName: approval.node?.name,
        opinion
      }
    });

    return res.json({ success: true, message: '审批成功' });
  } catch (error) {
    console.error('审批失败:', error);
    return res.status(500).json({ success: false, message: '审批失败' });
  }
};

/**
 * 为节点创建审批记录
 */
async function createApprovalForNode(node: any, instanceId: string, tenantId: string) {
  let approverIds: string[] = [];

  switch (node.approverType) {
    case 'approver':
      approverIds = [node.approverId];
      break;
    case 'role':
      // 根据角色获取用户
      const roleUsers = await prisma.userRoleAssignment.findMany({
        where: { roleId: node.approverRoleId },
        select: { userId: true }
      });
      approverIds = roleUsers.map(r => r.userId);
      break;
    case 'department_head':
      // TODO: 获取部门负责人
      break;
    case 'self':
      // 提交人自己
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        select: { startedBy: true }
      });
      approverIds = instance ? [instance.startedBy] : [];
      break;
  }

  for (const approverId of approverIds) {
    await prisma.workflowApproval.create({
      data: {
        instanceId,
        nodeId: node.id,
        approverId
      }
    });

    // 创建待办提醒
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      select: { title: true, documentNo: true }
    });

    await prisma.workflowTodo.create({
      data: {
        tenantId,
        userId: approverId,
        instanceId,
        approvalId: '', // 稍后更新
        title: `待审批：${instance?.title || '未知单据'}`,
        message: `单据编号：${instance?.documentNo || '未知'}`
      }
    });
  }
}

/**
 * 获取我发起的单据
 * GET /api/v1/workflows/my-requests
 */
export const getMyRequests = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId || !req.user?.id) {
      return res.status(400).json({ success: false, message: '未授权' });
    }

    const { status, page = 1, limit = 20 } = req.query;

    const where: any = {
      tenantId: req.user.tenantId,
      startedBy: req.user.id
    };

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.workflowInstance.findMany({
        where,
        include: {
          workflow: true,
          approvals: {
            include: {
              node: true
            }
          }
        },
        orderBy: { startedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.workflowInstance.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        items,
        total,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('获取我发起的单据失败:', error);
    return res.status(500).json({ success: false, message: '获取失败' });
  }
};

/**
 * 获取单据审批历史
 * GET /api/v1/workflows/history/:instanceId
 */
export const getApprovalHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未授权' });
    }

    const { instanceId } = req.params;

    const instance = await prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId: req.user.tenantId }
    });

    if (!instance) {
      return res.status(404).json({ success: false, message: '实例不存在' });
    }

    const history = await prisma.workflowHistory.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ success: true, data: history });
  } catch (error) {
    console.error('获取审批历史失败:', error);
    return res.status(500).json({ success: false, message: '获取失败' });
  }
};

/**
 * 提交单据到工作流
 * POST /api/v1/workflows/submit
 */
export const submitToWorkflow = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId || !req.user?.id) {
      return res.status(400).json({ success: false, message: '未授权' });
    }

    const { documentType, documentId, documentNo, title } = req.body;

    // 查找该单据类型的工作流
    const workflow = await prisma.workflowDefinition.findFirst({
      where: {
        tenantId: req.user.tenantId,
        documentType,
        isActive: true
      },
      include: {
        nodes: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!workflow) {
      return res.status(400).json({
        success: false,
        message: `未找到${DOCUMENT_TYPES[documentType] || documentType}的工作流配置`
      });
    }

    // 检查是否已有实例
    const existing = await prisma.workflowInstance.findFirst({
      where: { documentId }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: '该单据已在审批流程中' });
    }

    // 创建审批实例
    const instance = await prisma.workflowInstance.create({
      data: {
        tenantId: req.user.tenantId,
        workflowId: workflow.id,
        documentType,
        documentId,
        documentNo: documentNo || '',
        title: title || `${DOCUMENT_TYPES[documentType]} - ${documentNo || documentId}`,
        status: 'pending',
        startedBy: req.user.id,
        approvals: {
          create: {
            nodeId: workflow.nodes[0].id,
            approverId: req.user.id
          }
        }
      }
    });

    // 记录历史
    await prisma.workflowHistory.create({
      data: {
        instanceId: instance.id,
        action: 'submit',
        actorId: req.user.id,
        actorName: req.user.name || '未知'
      }
    });

    return res.status(201).json({ success: true, data: instance });
  } catch (error) {
    console.error('提交工作流失败:', error);
    return res.status(500).json({ success: false, message: '提交失败' });
  }
};

/**
 * 取消单据审批
 * POST /api/v1/workflows/cancel/:instanceId
 */
export const cancelWorkflow = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId || !req.user?.id) {
      return res.status(400).json({ success: false, message: '未授权' });
    }

    const { instanceId } = req.params;
    const { reason } = req.body;

    const instance = await prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId: req.user.tenantId }
    });

    if (!instance) {
      return res.status(404).json({ success: false, message: '实例不存在' });
    }

    // 只有发起人可以取消
    if (instance.startedBy !== req.user.id) {
      return res.status(403).json({ success: false, message: '只有发起人可以取消' });
    }

    if (instance.status !== 'pending') {
      return res.status(400).json({ success: false, message: '只有待审批的单据可以取消' });
    }

    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'cancelled', finishedAt: new Date() }
    });

    await prisma.workflowHistory.create({
      data: {
        instanceId,
        action: 'cancel',
        actorId: req.user.id,
        actorName: req.user.name || '未知',
        opinion: reason
      }
    });

    return res.json({ success: true, message: '已取消' });
  } catch (error) {
    console.error('取消工作流失败:', error);
    return res.status(500).json({ success: false, message: '取消失败' });
  }
};

/**
 * 获取审批统计
 * GET /api/v1/workflows/stats
 */
export const getWorkflowStats = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId || !req.user?.id) {
      return res.status(400).json({ success: false, message: '未授权' });
    }

    const [pendingCount, myRequestsCount, todayCount] = await Promise.all([
      // 待我审批的数量
      prisma.workflowApproval.count({
        where: { approverId: req.user.id, status: 'pending' }
      }),
      // 我发起的数量
      prisma.workflowInstance.count({
        where: { startedBy: req.user.id }
      }),
      // 今日审批数量
      prisma.workflowApproval.count({
        where: {
          approverId: req.user.id,
          status: { in: ['approved', 'rejected'] },
          actionAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    return res.json({
      success: true,
      data: {
        pendingCount,
        myRequestsCount,
        todayCount
      }
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    return res.status(500).json({ success: false, message: '获取失败' });
  }
};

export default {
  getWorkflowDefinitions,
  getWorkflowDefinition,
  createWorkflowDefinition,
  updateWorkflowDefinition,
  deleteWorkflowDefinition,
  getDocumentTypes,
  getMyTodos,
  getPendingApprovals,
  approveDocument,
  getMyRequests,
  getApprovalHistory,
  submitToWorkflow,
  cancelWorkflow,
  getWorkflowStats
};