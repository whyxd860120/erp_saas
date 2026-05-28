import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

/**
 * 构建分类树形结构
 */
function buildCategoryTree(categories: any[]): any[] {
  const categoryMap = new Map();
  const roots: any[] = [];

  categories.forEach((cat) => {
    cat.children = [];
    categoryMap.set(cat.id, cat);
  });

  categories.forEach((cat) => {
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(cat);
      } else {
        roots.push(cat);
      }
    } else {
      roots.push(cat);
    }
  });

  return roots;
}

// ==================== 供应商分类管理 ====================

/**
 * 获取供应商分类树（带计数）
 * GET /api/v1/suppliers/categories/tree
 */
export const getSupplierCategoryTree = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { status } = req.query;
    const where: any = { tenantId: req.user.tenantId };
    if (status) where.status = status;

    const categories = await prisma.supplierCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const tree = await buildSupplierCategoryTreeWithCounts(categories, req.user.tenantId);
    return res.json({ success: true, data: tree });
  } catch (error) {
    console.error('获取供应商分类树错误:', error);
    return res.status(500).json({ success: false, message: '获取供应商分类树失败' });
  }
};

// 构建带计数的供应商分类树
async function buildSupplierCategoryTreeWithCounts(categories: any[], tenantId: string): Promise<any[]> {
  const nodeMap = new Map<string, any>();

  // 先创建节点
  categories.forEach(cat => {
    nodeMap.set(cat.id, {
      ...cat,
      children: [],
      supplierCount: 0
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

  // 递归计算供应商数量
  const countSuppliers = async (node: any): Promise<number> => {
    // 获取直接子分类的供应商数量
    let count = await prisma.supplier.count({
      where: {
        tenantId,
        categoryId: node.id,
        status: 'active'
      }
    });

    // 递归计算子分类的供应商数量
    if (node.children.length > 0) {
      for (const child of node.children) {
        count += await countSuppliers(child);
      }
    }

    node.supplierCount = count;
    return count;
  };

  // 计算所有节点的供应商数量
  for (const root of roots) {
    await countSuppliers(root);
  }

  return roots;
}

/**
 * 获取供应商分类列表
 * GET /api/v1/supplier-categories
 */
export const getSupplierCategories = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { status = 'active' } = req.query;

    const where: any = { tenantId: req.user.tenantId };
    if (status) where.status = status;

    const categories = await prisma.supplierCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取供应商分类列表错误:', error);
    return res.status(500).json({ success: false, message: '获取供应商分类列表失败' });
  }
};

/**
 * 创建供应商分类
 * POST /api/v1/supplier-categories
 */
export const createSupplierCategory = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { name, parentId, sortOrder = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '分类名称不能为空' });
    }

    const category = await prisma.supplierCategory.create({
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
      module: 'supplier_category',
      resource: category.id,
      detail: JSON.stringify({ name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({ success: true, data: category, message: '分类创建成功' });
  } catch (error) {
    console.error('创建供应商分类错误:', error);
    return res.status(500).json({ success: false, message: '创建供应商分类失败' });
  }
};

/**
 * 更新供应商分类
 * PUT /api/v1/supplier-categories/:id
 */
export const updateSupplierCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parentId, sortOrder, status } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const existingCategory = await prisma.supplierCategory.findFirst({
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

    const updatedCategory = await prisma.supplierCategory.update({
      where: { id },
      data: updateData,
    });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'supplier_category',
      resource: id,
      detail: JSON.stringify(updateData),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ success: true, data: updatedCategory, message: '分类更新成功' });
  } catch (error) {
    console.error('更新供应商分类错误:', error);
    return res.status(500).json({ success: false, message: '更新供应商分类失败' });
  }
};

/**
 * 删除供应商分类
 * DELETE /api/v1/supplier-categories/:id
 */
export const deleteSupplierCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const existingCategory = await prisma.supplierCategory.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existingCategory) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }

    // 检查是否有子分类
    const hasChildren = await prisma.supplierCategory.findFirst({
      where: { parentId: id },
    });

    if (hasChildren) {
      return res.status(400).json({ success: false, message: '该分类下存在子分类，无法删除' });
    }

    // 检查是否有供应商
    const hasSuppliers = await prisma.supplier.findFirst({
      where: { categoryId: id },
    });

    if (hasSuppliers) {
      return res.status(400).json({ success: false, message: '该分类下存在供应商，无法删除' });
    }

    await prisma.supplierCategory.delete({
      where: { id },
    });

    await auditLog(req, {
      action: 'delete',
      module: 'supplier_category',
      resource: id,
      details: `删除供应商分类: ${existingCategory.name}`
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('删除供应商分类错误:', error);
    return res.status(500).json({ success: false, message: '删除供应商分类失败' });
  }
};

/**
 * 导入供应商分类
 * POST /api/v1/supplier-categories/import
 */
export const importSupplierCategories = async (req: Request, res: Response) => {
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
      const existing = await prisma.supplierCategory.findFirst({
        where: { tenantId, code: item.code }
      });

      if (existing) {
        errors.push({ row, message: `分类编码 ${item.code} 已存在` });
        continue;
      }

      // 创建分类
      const category = await prisma.supplierCategory.create({
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
        module: 'supplier_category',
        resource: category.id,
        details: `导入供应商分类: ${category.name}`
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
    console.error('导入供应商分类失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

// ==================== 供应商管理 ====================

/**
 * 获取供应商列表（按分类）
 * GET /api/v1/suppliers
 */
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { page = '1', limit = '10', status, search, categoryId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { tenantId: req.user.tenantId };
    // 只有当status明确提供且不为空字符串时，才过滤状态
    if (status !== undefined && status !== '') {
      where.status = status as string;
    }
    if (categoryId) where.categoryId = categoryId as string;

    if (search) {
      where.OR = [
        { code: { contains: search as string } },
        { name: { contains: search as string } },
        { contact: { contains: search as string } },
        { phone: { contains: search as string } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      }),
      prisma.supplier.count({ where }),
    ]);

    return res.json({
      success: true,
      data: { items: suppliers, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('获取供应商列表错误:', error);
    return res.status(500).json({ success: false, message: '获取供应商列表失败' });
  }
};

/**
 * 获取供应商树形结构（分类+供应商）
 * GET /api/v1/suppliers/tree
 */
export const getSupplierTree = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { status, search } = req.query;

    // 获取分类
    const categoryWhere: any = { tenantId: req.user.tenantId };
    if (status) categoryWhere.status = status;

    const categories = await prisma.supplierCategory.findMany({
      where: categoryWhere,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // 获取供应商
    const supplierWhere: any = { tenantId: req.user.tenantId };
    if (status) supplierWhere.status = status;
    if (search) {
      supplierWhere.OR = [
        { code: { contains: search as string } },
        { name: { contains: search as string } },
        { contact: { contains: search as string } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where: supplierWhere,
      orderBy: { createdAt: 'asc' },
    });

    // 构建树：分类 -> 供应商
    const categoryMap = new Map();
    const roots: any[] = [];

    categories.forEach((cat) => {
      cat.children = [];
      cat.nodeType = 'category';
      categoryMap.set(cat.id, cat);
    });

    // 将供应商放入对应分类
    suppliers.forEach((sup) => {
      sup.nodeType = 'supplier';
      if (sup.categoryId) {
        const category = categoryMap.get(sup.categoryId);
        if (category) {
          category.children.push(sup);
        } else {
          roots.push(sup);
        }
      } else {
        roots.push(sup);
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
    console.error('获取供应商树错误:', error);
    return res.status(500).json({ success: false, message: '获取供应商树失败' });
  }
};

/**
 * 获取供应商详情
 * GET /api/v1/suppliers/:id
 */
export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { category: true },
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    return res.json({ success: true, data: supplier });
  } catch (error) {
    console.error('获取供应商详情错误:', error);
    return res.status(500).json({ success: false, message: '获取供应商详情失败' });
  }
};

/**
 * 创建供应商
 * POST /api/v1/suppliers
 */
export const createSupplier = async (req: Request, res: Response) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const { code, name, contact, phone, email, address, taxNo, bankAccount, categoryId, remark } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: '供应商编码和名称不能为空' });
    }

    // 检查编码是否已存在
    const existingSupplier = await prisma.supplier.findFirst({
      where: { tenantId: req.user.tenantId, code },
    });

    if (existingSupplier) {
      return res.status(400).json({ success: false, message: '供应商编码已存在' });
    }

    // 验证分类是否存在
    if (categoryId) {
      const category = await prisma.supplierCategory.findFirst({
        where: { id: categoryId, tenantId: req.user.tenantId },
      });
      if (!category) {
        return res.status(400).json({ success: false, message: '所选分类不存在' });
      }
    }

    const supplier = await prisma.supplier.create({
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
        categoryId: categoryId || null,
        remark,
        status: 'active',
      },
    });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'create',
      module: 'supplier',
      resource: supplier.id,
      detail: JSON.stringify({ code, name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.status(201).json({ success: true, data: supplier, message: '供应商创建成功' });
  } catch (error) {
    console.error('创建供应商错误:', error);
    return res.status(500).json({ success: false, message: '创建供应商失败' });
  }
};

/**
 * 更新供应商
 * PUT /api/v1/suppliers/:id
 */
export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, contact, phone, email, address, taxNo, bankAccount, categoryId, status, remark } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const existingSupplier = await prisma.supplier.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existingSupplier) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    // 检查编码是否已存在
    if (code && code !== existingSupplier.code) {
      const codeExists = await prisma.supplier.findFirst({
        where: { tenantId: req.user.tenantId, code, id: { not: id } },
      });
      if (codeExists) {
        return res.status(400).json({ success: false, message: '供应商编码已存在' });
      }
    }

    // 验证分类是否存在
    if (categoryId) {
      const category = await prisma.supplierCategory.findFirst({
        where: { id: categoryId, tenantId: req.user.tenantId },
      });
      if (!category) {
        return res.status(400).json({ success: false, message: '所选分类不存在' });
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
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (status !== undefined) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark;

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
    });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'supplier',
      resource: id,
      detail: JSON.stringify(updateData),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ success: true, data: updatedSupplier, message: '供应商更新成功' });
  } catch (error) {
    console.error('更新供应商错误:', error);
    return res.status(500).json({ success: false, message: '更新供应商失败' });
  }
};

/**
 * 删除供应商
 * DELETE /api/v1/suppliers/:id
 */
export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    const existingSupplier = await prisma.supplier.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existingSupplier) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    // 检查是否有关联的采购订单
    const purchaseOrders = await prisma.purchaseOrder.findFirst({
      where: { supplierId: id, tenantId: req.user.tenantId },
    });

    if (purchaseOrders) {
      return res.status(400).json({ success: false, message: '该供应商有关联的采购订单，无法删除' });
    }

    await prisma.supplier.delete({ where: { id } });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'delete',
      module: 'supplier',
      resource: id,
      detail: JSON.stringify({ code: existingSupplier.code, name: existingSupplier.name }),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({ success: true, message: '供应商删除成功' });
  } catch (error) {
    console.error('删除供应商错误:', error);
    return res.status(500).json({ success: false, message: '删除供应商失败' });
  }
};

/**
 * 批量删除供应商
 * DELETE /api/v1/suppliers/batch
 */
export const batchDeleteSuppliers = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({ success: false, message: '未关联租户' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的供应商' });
    }

    const errors: Array<{ id: string; message: string }> = [];
    const successIds: string[] = [];

    for (const id of ids) {
      try {
        const existingSupplier = await prisma.supplier.findFirst({
          where: { id, tenantId: req.user.tenantId },
        });

        if (!existingSupplier) {
          errors.push({ id, message: '供应商不存在' });
          continue;
        }

        const purchaseOrders = await prisma.purchaseOrder.findFirst({
          where: { supplierId: id, tenantId: req.user.tenantId },
        });

        if (purchaseOrders) {
          errors.push({ id, message: '该供应商有关联的采购订单，无法删除' });
          continue;
        }

        await prisma.supplier.delete({ where: { id } });
        successIds.push(id);
      } catch (error) {
        errors.push({ id, message: '删除失败' });
      }
    }

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'batch_delete',
      module: 'supplier',
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
    console.error('批量删除供应商错误:', error);
    return res.status(500).json({ success: false, message: '批量删除供应商失败' });
  }
};

// ==================== 供应商导入 ====================

/**
 * 导入供应商
 * POST /api/v1/suppliers/import
 */
export const importSuppliers = async (req: Request, res: Response) => {
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
      if (!item.name) rowErrors.push('供应商名称不能为空');
      if (!item.code) rowErrors.push('供应商编码不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      // 检查编码是否已存在
      const existingByCode = await prisma.supplier.findFirst({
        where: { tenantId, code: item.code }
      });

      if (existingByCode) {
        errors.push({ row, message: `供应商编码 ${item.code} 已存在` });
        continue;
      }

      // 检查名称是否已存在
      const existingByName = await prisma.supplier.findFirst({
        where: { tenantId, name: item.name }
      });

      if (existingByName) {
        errors.push({ row, message: `供应商名称 ${item.name} 已存在` });
        continue;
      }

      // 处理分类字段
      let categoryId = null;
      if (item.category) {
        const category = await prisma.supplierCategory.findFirst({
          where: {
            tenantId,
            name: item.category
          }
        });
        if (category) {
          categoryId = category.id;
        }
      }

      // 创建供应商
      const supplier = await prisma.supplier.create({
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
          categoryId,
          remark: item.remark,
          status: 'active'
        }
      });

      successItems.push(supplier);

      // 记录审计日志
      await auditLog(req, {
        action: 'create',
        module: 'supplier',
        resource: supplier.id,
        details: `导入供应商: ${supplier.name}`
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
    console.error('导入供应商失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

export default {
  getSupplierCategoryTree,
  getSupplierCategories,
  createSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
  importSupplierCategories,
  getSuppliers,
  getSupplierTree,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  batchDeleteSuppliers,
  importSuppliers,
};