import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { auditLog } from '../utils/audit.util';
import { applyDataPermissions } from '../utils/data-permission.util';

const prisma = new PrismaClient();

// ==================== 客户分类管理 ====================

/**
 * 获取客户分类树（带计数）
 * GET /api/v1/customers/categories/tree
 */
export const getCustomerCategoryTree = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { status } = req.query;
    const where: any = { tenantId: req.user.tenantId };
    if (status) where.status = status;

    const categories = await prisma.customerCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const tree = await buildCategoryTreeWithCounts(categories, req.user.tenantId);
    return res.json({ success: true, data: tree });
  } catch (error) {
    console.error('获取客户分类树错误:', error);
    return res.status(500).json({ success: false, message: '获取客户分类树失败' });
  }
};

// 构建带计数的分类树
async function buildCategoryTreeWithCounts(categories: any[], tenantId: string): Promise<any[]> {
  const nodeMap = new Map<string, any>();

  // 先创建节点
  categories.forEach(cat => {
    nodeMap.set(cat.id, {
      ...cat,
      children: [],
      customerCount: 0
    });
  });

  // 建立父子关系
  const roots: any[] = [];
  categories.forEach(cat => {
    const node = nodeMap.get(cat.id);
    if (cat.parentId && nodeMap.has(cat.parentId)) {
      nodeMap.get(cat.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  // 递归计算客户数量
  const countCustomers = async (node: any): Promise<number> => {
    // 获取直接子分类的客户数量
    let count = await prisma.customer.count({
      where: {
        tenantId,
        categoryId: node.id,
        status: 'active'
      }
    });

    // 递归计算子分类的客户数量
    if (node.children.length > 0) {
      for (const child of node.children) {
        count += await countCustomers(child);
      }
    }

    node.customerCount = count;
    return count;
  };

  // 计算所有节点的客户数量
  for (const root of roots) {
    await countCustomers(root);
  }

  return roots;
}

/**
 * 构建普通分类树（不带计数）
 */
function buildCategoryTree(categories: any[]): any[] {
  const nodeMap = new Map<string, any>();

  // 先创建节点
  categories.forEach(cat => {
    nodeMap.set(cat.id, {
      ...cat,
      children: []
    });
  });

  // 建立父子关系
  const roots: any[] = [];
  categories.forEach(cat => {
    const node = nodeMap.get(cat.id);
    if (cat.parentId && nodeMap.has(cat.parentId)) {
      nodeMap.get(cat.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * 获取客户分类列表
 * GET /api/v1/customer-categories
 */
export const getCustomerCategories = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { status = 'active' } = req.query;

    const where: any = { tenantId: req.user.tenantId };
    if (status) where.status = status;

    const categories = await prisma.customerCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取客户分类列表错误:', error);
    return res.status(500).json({ success: false, message: '获取客户分类列表失败' });
  }
};

/**
 * 创建客户分类
 * POST /api/v1/customer-categories
 */
export const createCustomerCategory = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { name, parentId, sortOrder = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '分类名称不能为空' });
    }

    const category = await prisma.customerCategory.create({
      data: {
        tenantId: req.user.tenantId,
        name,
        parentId: parentId || null,
        sortOrder,
        status: 'active',
      },
    });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'customer_category',
      resource: category.id,
      detail: JSON.stringify({ name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({ success: true, data: category, message: '分类创建成功' });
  } catch (error) {
    console.error('创建客户分类错误:', error);
    return res.status(500).json({ success: false, message: '创建客户分类失败' });
  }
};

/**
 * 更新客户分类
 * PUT /api/v1/customer-categories/:id
 */
export const updateCustomerCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parentId, sortOrder, status } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const existingCategory = await prisma.customerCategory.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existingCategory) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }

    // 检查循环引用
    if (parentId && parentId === id) {
      return res.status(400).json({ success: false, message: '不能将自己设为父分类' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (status !== undefined) updateData.status = status;

    const updatedCategory = await prisma.customerCategory.update({
      where: { id },
      data: updateData,
    });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'customer_category',
      resource: id,
      detail: JSON.stringify(updateData),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ success: true, data: updatedCategory, message: '分类更新成功' });
  } catch (error) {
    console.error('更新客户分类错误:', error);
    return res.status(500).json({ success: false, message: '更新客户分类失败' });
  }
};

/**
 * 删除客户分类
 * DELETE /api/v1/customer-categories/:id
 */
export const deleteCustomerCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const existingCategory = await prisma.customerCategory.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existingCategory) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }

    // 检查是否有子分类
    const hasChildren = await prisma.customerCategory.findFirst({
      where: { parentId: id, tenantId: req.user.tenantId },
    });

    if (hasChildren) {
      return res.status(400).json({ success: false, message: '该分类有子分类，无法删除' });
    }

    // 检查是否有关联的客户
    const hasCustomers = await prisma.customer.findFirst({
      where: { categoryId: id, tenantId: req.user.tenantId },
    });

    if (hasCustomers) {
      return res.status(400).json({ success: false, message: '该分类下有关联的客户，无法删除' });
    }

    await prisma.customerCategory.delete({ where: { id } });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'customer_category',
      resource: id,
      detail: JSON.stringify({ name: existingCategory.name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ success: true, message: '分类删除成功' });
  } catch (error) {
    console.error('删除客户分类错误:', error);
    return res.status(500).json({ success: false, message: '删除客户分类失败' });
  }
};

// ==================== 客户管理 ====================

/**
 * 获取客户列表（按分类）
 * GET /api/v1/customers
 */
export const getCustomers = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { page = '1', limit = '10', status = 'active', search, categoryId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { tenantId: req.user.tenantId };
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId as string;

    if (search) {
      where.OR = [
        { code: { contains: search as string } },
        { name: { contains: search as string } },
        { contact: { contains: search as string } },
        { phone: { contains: search as string } },
      ];
    }

    // 应用数据权限过滤
    const dataPermissionWhere = await applyDataPermissions(
      'customer',
      {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        userRoles: req.user.roles || []
      },
      { salesmanId: 'salesmanId' } // 字段映射：customer表的salesmanId字段
    );

    // 合并数据权限条件
    if (Object.keys(dataPermissionWhere).length > 0) {
      if (where.OR) {
        // 如果已有OR条件（搜索条件），需要AND数据权限条件
        where.AND = [dataPermissionWhere];
      } else {
        Object.assign(where, dataPermissionWhere);
      }
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { category: true, salesman: { select: { id: true, name: true, code: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    // 将salesman转换为user字段以匹配前端期望
    const customersWithUser = customers.map(customer => ({
      ...customer,
      user: customer.salesman,
      salesman: undefined
    }));

    return res.json({
      success: true,
      data: { items: customersWithUser, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('获取客户列表错误:', error);
    return res.status(500).json({ success: false, message: '获取客户列表失败' });
  }
};

/**
 * 获取客户树形结构（分类+客户）
 * GET /api/v1/customers/tree
 */
export const getCustomerTree = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { status, search } = req.query;

    // 获取分类
    const categoryWhere: any = { tenantId: req.user.tenantId };
    if (status) categoryWhere.status = status;

    const categories = await prisma.customerCategory.findMany({
      where: categoryWhere,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // 获取客户
    const customerWhere: any = { tenantId: req.user.tenantId };
    if (status) customerWhere.status = status;
    if (search) {
      customerWhere.OR = [
        { code: { contains: search as string } },
        { name: { contains: search as string } },
        { contact: { contains: search as string } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: customerWhere,
      orderBy: { createdAt: 'asc' },
    });

    // 构建树：分类 -> 客户
    const categoryMap = new Map();
    const roots: any[] = [];

    categories.forEach((cat) => {
      cat.children = [];
      cat.nodeType = 'category';
      categoryMap.set(cat.id, cat);
    });

    // 将客户放入对应分类
    customers.forEach((cust) => {
      cust.nodeType = 'customer';
      if (cust.categoryId) {
        const category = categoryMap.get(cust.categoryId);
        if (category) {
          category.children.push(cust);
        } else {
          roots.push(cust);
        }
      } else {
        roots.push(cust);
      }
    });

    // 构建分类树
    categories.forEach((cat) => {
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.unshift(...categories.filter(c => c.id === cat.id));
        } else {
          const catNode = categoryMap.get(cat.id);
          if (catNode) roots.push(catNode);
        }
      } else {
        const catNode = categoryMap.get(cat.id);
        if (catNode && !roots.find(r => r.id === cat.id)) {
          roots.push(catNode);
        }
      }
    });

    return res.json({ success: true, data: roots });
  } catch (error) {
    console.error('获取客户树错误:', error);
    return res.status(500).json({ success: false, message: '获取客户树失败' });
  }
};

/**
 * 获取客户详情
 * GET /api/v1/customers/:id
 */
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { category: true, salesman: { select: { id: true, name: true, code: true } } },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }

    // 将salesman转换为user字段以匹配前端期望
    const customerWithUser = {
      ...customer,
      user: customer.salesman,
      salesman: undefined
    };

    return res.json({ success: true, data: customerWithUser });
  } catch (error) {
    console.error('获取客户详情错误:', error);
    return res.status(500).json({ success: false, message: '获取客户详情失败' });
  }
};

/**
 * 创建客户
 * POST /api/v1/customers
 */
export const createCustomer = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { code, name, contact, phone, email, address, taxNo, bankAccount, employeeId, categoryId, remark } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: '客户编码和名称不能为空' });
    }

    // 检查编码是否已存在
    const existingCustomer = await prisma.customer.findFirst({
      where: { tenantId: req.user.tenantId, code },
    });

    if (existingCustomer) {
      return res.status(400).json({ success: false, message: '客户编码已存在' });
    }

    // 验证分类是否存在
    if (categoryId) {
      const category = await prisma.customerCategory.findFirst({
        where: { id: categoryId, tenantId: req.user.tenantId },
      });
      if (!category) {
        return res.status(400).json({ success: false, message: '所选分类不存在' });
      }
    }

    // 验证专属业务员是否存在
    if (employeeId) {
      const user = await prisma.user.findFirst({
        where: { id: employeeId, tenantId: req.user.tenantId },
      });
      if (!user) {
        return res.status(400).json({ success: false, message: '所选专属业务员不存在' });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        tenantId: req.user.tenantId,
        code,
        name,
        contact,
        phone,
        email,
        address,
        taxNo,
        bankAccount,
        salesmanId: employeeId || null,
        categoryId: categoryId || null,
        remark,
        status: 'active',
      },
    });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'customer',
      resource: customer.id,
      detail: JSON.stringify({ code, name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({ success: true, data: customer, message: '客户创建成功' });
  } catch (error) {
    console.error('创建客户错误:', error);
    return res.status(500).json({ success: false, message: '创建客户失败' });
  }
};

/**
 * 更新客户
 * PUT /api/v1/customers/:id
 */
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, contact, phone, email, address, taxNo, bankAccount, employeeId, categoryId, status, remark } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existingCustomer) {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }

    // 检查编码是否已存在
    if (code && code !== existingCustomer.code) {
      const codeExists = await prisma.customer.findFirst({
        where: { tenantId: req.user.tenantId, code, id: { not: id } },
      });
      if (codeExists) {
        return res.status(400).json({ success: false, message: '客户编码已存在' });
      }
    }

    // 验证分类是否存在
    if (categoryId) {
      const category = await prisma.customerCategory.findFirst({
        where: { id: categoryId, tenantId: req.user.tenantId },
      });
      if (!category) {
        return res.status(400).json({ success: false, message: '所选分类不存在' });
      }
    }

    // 验证专属业务员是否存在
    if (employeeId) {
      const user = await prisma.user.findFirst({
        where: { id: employeeId, tenantId: req.user.tenantId },
      });
      if (!user) {
        return res.status(400).json({ success: false, message: '所选专属业务员不存在' });
      }
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (contact !== undefined) updateData.contact = contact;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (taxNo !== undefined) updateData.taxNo = taxNo;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
    if (employeeId !== undefined) updateData.salesmanId = employeeId || null;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (status !== undefined) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'customer',
      resource: id,
      detail: JSON.stringify(updateData),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ success: true, data: updatedCustomer, message: '客户更新成功' });
  } catch (error) {
    console.error('更新客户错误:', error);
    return res.status(500).json({ success: false, message: '更新客户失败' });
  }
};

/**
 * 删除客户
 * DELETE /api/v1/customers/:id
 */
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existingCustomer) {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }

    // 检查是否有关联的销售订单
    const salesOrders = await prisma.salesOrder.findFirst({
      where: { customerId: id, tenantId: req.user.tenantId },
    });

    if (salesOrders) {
      return res.status(400).json({ success: false, message: '该客户有关联的销售订单，无法删除' });
    }

    await prisma.customer.delete({ where: { id } });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'customer',
      resource: id,
      detail: JSON.stringify({ code: existingCustomer.code, name: existingCustomer.name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ success: true, message: '客户删除成功' });
  } catch (error) {
    console.error('删除客户错误:', error);
    return res.status(500).json({ success: false, message: '删除客户失败' });
  }
};

/**
 * 批量删除客户
 * DELETE /api/v1/customers/batch
 */
export const batchDeleteCustomers = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的客户' });
    }

    const errors: Array<{ id: string; message: string }> = [];
    const successIds: string[] = [];

    for (const id of ids) {
      try {
        const existingCustomer = await prisma.customer.findFirst({
          where: { id, tenantId: req.user.tenantId },
        });

        if (!existingCustomer) {
          errors.push({ id, message: '客户不存在' });
          continue;
        }

        const salesOrders = await prisma.salesOrder.findFirst({
          where: { customerId: id, tenantId: req.user.tenantId },
        });

        if (salesOrders) {
          errors.push({ id, message: '该客户有关联的销售订单，无法删除' });
          continue;
        }

        await prisma.customer.delete({ where: { id } });
        successIds.push(id);
      } catch (error) {
        errors.push({ id, message: '删除失败' });
      }
    }

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'batch_delete',
      module: 'customer',
      resource: null,
      detail: JSON.stringify({
        total: ids.length,
        success: successIds.length,
        failed: errors.length
      }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      message: `批量删除完成：成功 ${successIds.length} 条，失败 ${errors.length} 条`,
      data: {
        successIds,
        errors
      }
    });
  } catch (error) {
    console.error('批量删除客户错误:', error);
    return res.status(500).json({ success: false, message: '批量删除客户失败' });
  }
};

// ==================== 客户分类导入 ====================

/**
 * 导入客户分类
 * POST /api/v1/customer-categories/import
 */
export const importCustomerCategories = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const items = req.body as any[];
    const errors: Array<{ row: number; message: string }> = [];
    const successItems: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      // 验证必填字段
      if (!item.name) rowErrors.push('分类名称不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      // 检查编码是否已存在
      const existing = await prisma.customerCategory.findFirst({
        where: { tenantId, code: item.code }
      });

      if (existing) {
        errors.push({ row, message: `分类编码 ${item.code} 已存在` });
        continue;
      }

      // 创建分类
      const category = await prisma.customerCategory.create({
        data: {
          tenantId,
          code: item.code,
          name: item.name,
          parentId: item.parentId,
          sortOrder: item.sortOrder || 0,
          remark: item.remark
        }
      });

      successItems.push(category);

      // 记录审计日志
      await auditLog(req, {
        action: 'create',
        module: 'customer_category',
        resource: category.id,
        details: `导入客户分类: ${category.name}`
      });
    }

    res.json({
      success: true,
      data: {
        successCount: successItems.length,
        failCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('导入客户分类失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

// ==================== 客户导入 ====================

/**
 * 导入客户
 * POST /api/v1/customers/import
 */
export const importCustomers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const items = req.body as any[];
    const errors: Array<{ row: number; message: string }> = [];
    const successItems: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      // 验证必填字段
      if (!item.name) rowErrors.push('客户名称不能为空');
      if (!item.code) rowErrors.push('客户编码不能为空');

      // 强制要求客户必须有分类
      if (!item.categoryId) {
        rowErrors.push('客户分类不能为空，明细资料必须有上级分类');
      } else {
        // 验证分类是否存在
        const category = await prisma.customerCategory.findFirst({
          where: { id: item.categoryId, tenantId }
        });
        if (!category) {
          rowErrors.push(`客户分类不存在，请先创建分类或检查分类名称是否正确`);
        }
      }

      // 处理专属业务员，如果存在必须匹配成功
      let salesmanId = null;
      if (item.employeeName) {
        const trimmedEmployeeName = item.employeeName.trim();
        console.log(`第 ${row} 行：查找专属业务员 "${trimmedEmployeeName}"`);

        const user = await prisma.user.findFirst({
          where: {
            tenantId,
            name: trimmedEmployeeName
          }
        });

        if (user) {
          salesmanId = user.id;
          console.log(`第 ${row} 行：专属业务员 "${trimmedEmployeeName}" 匹配成功，ID: ${user.id}, 状态: ${user.status}`);
        } else {
          rowErrors.push(`专属业务员 "${trimmedEmployeeName}" 不存在，请检查用户名称是否正确`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      // 检查编码是否已存在
      const existingByCode = await prisma.customer.findFirst({
        where: { tenantId, code: item.code }
      });

      if (existingByCode) {
        errors.push({ row, message: `客户编码 ${item.code} 已存在` });
        continue;
      }

      // 检查名称是否已存在
      const existingByName = await prisma.customer.findFirst({
        where: { tenantId, name: item.name }
      });

      if (existingByName) {
        errors.push({ row, message: `客户名称 ${item.name} 已存在` });
        continue;
      }

      // 创建客户
      const customer = await prisma.customer.create({
        data: {
          tenantId,
          code: item.code,
          name: item.name,
          contact: item.contact,
          phone: item.phone,
          address: item.address,
          email: item.email,
          taxNo: item.taxNo,
          bankName: item.bankName,
          bankAccount: item.bankAccount,
          creditLimit: item.creditLimit,
          categoryId: item.categoryId,
          salesmanId,
          remark: item.remark,
          status: 'active'
        }
      });

      successItems.push(customer);

      // 记录审计日志
      await auditLog(req, {
        action: 'create',
        module: 'customer',
        resource: customer.id,
        details: `导入客户: ${customer.name}`
      });
    }

    res.json({
      success: true,
      data: {
        successCount: successItems.length,
        failCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('导入客户失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

export default {
  getCustomerCategoryTree,
  getCustomerCategories,
  createCustomerCategory,
  updateCustomerCategory,
  deleteCustomerCategory,
  importCustomerCategories,
  getCustomers,
  getCustomerTree,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  batchDeleteCustomers,
  importCustomers,
};