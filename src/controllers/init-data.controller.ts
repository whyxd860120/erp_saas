import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 初始化数据结构（存储在 TenantSetting 中）
interface InitInventory {
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  batchNo?: string;
  productionDate?: Date;
  expiryDate?: Date;
  serialNumbers?: string[];
  snCount?: number;
}

interface InitReceivable {
  customerId: string;
  customerName: string;
  amount: number;
  remark: string;
}

interface InitPayable {
  supplierId: string;
  supplierName: string;
  amount: number;
  remark: string;
}

interface InitAccountBalance {
  accountId: string;
  accountName: string;
  balance: number;
  remark: string;
}

// 获取初始库存数据
export const getInitInventory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const setting = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_inventory' }
    });

    const data = setting?.value ? JSON.parse(setting.value) : [];
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取初始库存失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
};

// 添加初始库存
export const addInitInventory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    // 检查初始化状态
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.initializationStatus === 'completed') {
      return res.status(403).json({ success: false, message: '账套初始化已完成，无法修改' });
    }

    const { warehouseId, productId, quantity, unitCost, batchNo, productionDate, expiryDate, serialNumbers } = req.body;

    // 获取仓库和商品信息
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!warehouse || !product) {
      return res.status(400).json({ success: false, message: '仓库或商品不存在' });
    }

    // 验证物料管理属性
    if (product.enableBatch && !batchNo) {
      return res.status(400).json({ success: false, message: '物料启用批次管理，必须填写批次号' });
    }

    if (product.enableExpiry && (!productionDate || !expiryDate)) {
      return res.status(400).json({ success: false, message: '物料启用保质期管理，必须填写生产日期和有效期至' });
    }

    if (product.enableSN) {
      if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length !== quantity) {
        return res.status(400).json({ success: false, message: '物料启用SN码管理，SN码数量必须与数量一致' });
      }
    }

    const newItem: InitInventory = {
      warehouseId,
      warehouseName: warehouse.name,
      productId,
      productName: product.name,
      sku: product.sku || '',
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      batchNo,
      productionDate: productionDate ? new Date(productionDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      serialNumbers: serialNumbers && serialNumbers.length > 0 ? serialNumbers : undefined,
      snCount: serialNumbers ? serialNumbers.length : undefined
    };

    // 获取现有数据
    const existing = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_inventory' }
    });

    let items: InitInventory[] = [];
    if (existing?.value) {
      items = JSON.parse(existing.value);
    }

    // 如果已存在相同商品+仓库的记录，删除旧记录
    items = items.filter(i => !(i.productId === productId && i.warehouseId === warehouseId));
    items.push(newItem);

    // 保存
    if (existing) {
      await prisma.tenantSetting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(items) }
      });
    } else {
      await prisma.tenantSetting.create({
        data: {
          tenantId,
          key: 'init_inventory',
          value: JSON.stringify(items),
          category: 'init',
          isPublic: true
        }
      });
    }

    res.json({ success: true, data: newItem });
  } catch (error) {
    console.error('添加初始库存失败:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
};

// 更新初始库存
export const updateInitInventory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    // 检查初始化状态
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.initializationStatus === 'completed') {
      return res.status(403).json({ success: false, message: '账套初始化已完成，无法修改' });
    }

    const { warehouseId, productId, quantity, unitCost, batchNo, productionDate, expiryDate, serialNumbers } = req.body;

    // 获取仓库和商品信息
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!warehouse || !product) {
      return res.status(400).json({ success: false, message: '仓库或商品不存在' });
    }

    // 验证物料管理属性
    if (product.enableBatch && !batchNo) {
      return res.status(400).json({ success: false, message: '物料启用批次管理，必须填写批次号' });
    }

    if (product.enableExpiry && (!productionDate || !expiryDate)) {
      return res.status(400).json({ success: false, message: '物料启用保质期管理，必须填写生产日期和有效期至' });
    }

    if (product.enableSN) {
      if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length !== quantity) {
        return res.status(400).json({ success: false, message: '物料启用SN码管理，SN码数量必须与数量一致' });
      }
    }

    const newItem: InitInventory = {
      warehouseId,
      warehouseName: warehouse.name,
      productId,
      productName: product.name,
      sku: product.sku || '',
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      batchNo,
      productionDate: productionDate ? new Date(productionDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      serialNumbers: serialNumbers && serialNumbers.length > 0 ? serialNumbers : undefined,
      snCount: serialNumbers ? serialNumbers.length : undefined
    };

    // 获取现有数据
    const existing = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_inventory' }
    });

    let items: InitInventory[] = [];
    if (existing?.value) {
      items = JSON.parse(existing.value);
    }

    // 更新或添加记录
    const existingIndex = items.findIndex(i => i.productId === productId && i.warehouseId === warehouseId);
    if (existingIndex >= 0) {
      items[existingIndex] = newItem;
    } else {
      items.push(newItem);
    }

    // 保存
    if (existing) {
      await prisma.tenantSetting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(items) }
      });
    } else {
      await prisma.tenantSetting.create({
        data: {
          tenantId,
          key: 'init_inventory',
          value: JSON.stringify(items),
          category: 'init',
          isPublic: true
        }
      });
    }

    res.json({ success: true, data: newItem });
  } catch (error) {
    console.error('更新初始库存失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
};

// 删除初始库存
export const deleteInitInventory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const { id } = req.params;
    const { productId, warehouseId } = req.query as any;

    const existing = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_inventory' }
    });

    if (!existing?.value) {
      return res.status(404).json({ success: false, message: '数据不存在' });
    }

    let items: InitInventory[] = JSON.parse(existing.value);
    items = items.filter(i => !(i.productId === productId && i.warehouseId === warehouseId));

    await prisma.tenantSetting.update({
      where: { id: existing.id },
      data: { value: JSON.stringify(items) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('删除初始库存失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
};

// 获取应收款
export const getInitReceivable = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const setting = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_receivable' }
    });

    const data = setting?.value ? JSON.parse(setting.value) : [];
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取应收款失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
};

// 添加应收款
export const addInitReceivable = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const { customerId, amount, remark } = req.body;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(400).json({ success: false, message: '客户不存在' });
    }

    const newItem: InitReceivable = {
      customerId,
      customerName: customer.name,
      amount,
      remark: remark || ''
    };

    const existing = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_receivable' }
    });

    let items: InitReceivable[] = [];
    if (existing?.value) {
      items = JSON.parse(existing.value);
    }

    items.push(newItem);

    if (existing) {
      await prisma.tenantSetting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(items) }
      });
    } else {
      await prisma.tenantSetting.create({
        data: {
          tenantId,
          key: 'init_receivable',
          value: JSON.stringify(items),
          category: 'init',
          isPublic: true
        }
      });
    }

    res.json({ success: true, data: newItem });
  } catch (error) {
    console.error('添加应收款失败:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
};

// 删除应收款
export const deleteInitReceivable = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const { customerId } = req.query as any;

    const existing = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_receivable' }
    });

    if (!existing?.value) {
      return res.status(404).json({ success: false, message: '数据不存在' });
    }

    let items: InitReceivable[] = JSON.parse(existing.value);
    items = items.filter(i => i.customerId !== customerId);

    await prisma.tenantSetting.update({
      where: { id: existing.id },
      data: { value: JSON.stringify(items) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('删除应收款失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
};

// 获取应付款
export const getInitPayable = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const setting = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_payable' }
    });

    const data = setting?.value ? JSON.parse(setting.value) : [];
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取应付款失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
};

// 添加应付款
export const addInitPayable = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const { supplierId, amount, remark } = req.body;

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return res.status(400).json({ success: false, message: '供应商不存在' });
    }

    const newItem: InitPayable = {
      supplierId,
      supplierName: supplier.name,
      amount,
      remark: remark || ''
    };

    const existing = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_payable' }
    });

    let items: InitPayable[] = [];
    if (existing?.value) {
      items = JSON.parse(existing.value);
    }

    items.push(newItem);

    if (existing) {
      await prisma.tenantSetting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(items) }
      });
    } else {
      await prisma.tenantSetting.create({
        data: {
          tenantId,
          key: 'init_payable',
          value: JSON.stringify(items),
          category: 'init',
          isPublic: true
        }
      });
    }

    res.json({ success: true, data: newItem });
  } catch (error) {
    console.error('添加应付款失败:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
};

// 删除应付款
export const deleteInitPayable = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const { supplierId } = req.query as any;

    const existing = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_payable' }
    });

    if (!existing?.value) {
      return res.status(404).json({ success: false, message: '数据不存在' });
    }

    let items: InitPayable[] = JSON.parse(existing.value);
    items = items.filter(i => i.supplierId !== supplierId);

    await prisma.tenantSetting.update({
      where: { id: existing.id },
      data: { value: JSON.stringify(items) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('删除应付款失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
};

// 导入库存数据
export const importInventory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    // 检查初始化状态
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.initializationStatus === 'completed') {
      return res.status(403).json({ success: false, message: '账套初始化已完成，无法修改' });
    }

    const items = req.body as any[];
    const errors: Array<{ row: number; message: string }> = [];
    const successItems: InitInventory[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      // 验证必填字段
      if (!item.warehouseCode) rowErrors.push('仓库编码不能为空');
      if (!item.productCode) rowErrors.push('物料编码不能为空');
      if (!item.quantity || item.quantity <= 0) rowErrors.push('数量必须大于0');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      // 查找仓库
      const warehouse = await prisma.warehouse.findFirst({
        where: { tenantId, code: item.warehouseCode }
      });

      if (!warehouse) {
        errors.push({ row, message: `仓库编码 ${item.warehouseCode} 不存在` });
        continue;
      }

      // 查找物料
      const product = await prisma.product.findFirst({
        where: { tenantId, code: item.productCode }
      });

      if (!product) {
        errors.push({ row, message: `物料编码 ${item.productCode} 不存在` });
        continue;
      }

      // 验证物料管理属性
      if (product.enableBatch && !item.batchNo) {
        errors.push({ row, message: '物料启用批次管理，必须填写批次号' });
        continue;
      }

      if (product.enableExpiry && (!item.productionDate || !item.expiryDate)) {
        errors.push({ row, message: '物料启用保质期管理，必须填写生产日期和有效期至' });
        continue;
      }

      if (product.enableSN) {
        if (!item.serialNumbers || !Array.isArray(item.serialNumbers) || item.serialNumbers.length !== item.quantity) {
          errors.push({ row, message: '物料启用SN码管理，SN码数量必须与数量一致' });
          continue;
        }
      }

      // 解析SN码
      let serialNumbers: string[] = [];
      if (item.serialNumbers) {
        if (typeof item.serialNumbers === 'string') {
          serialNumbers = item.serialNumbers.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (Array.isArray(item.serialNumbers)) {
          serialNumbers = item.serialNumbers;
        }
      }

      const inventoryItem: InitInventory = {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        productId: product.id,
        productName: product.name,
        sku: product.sku || '',
        quantity: item.quantity,
        unitCost: item.unitCost || 0,
        totalCost: item.quantity * (item.unitCost || 0),
        batchNo: item.batchNo,
        productionDate: item.productionDate ? new Date(item.productionDate) : undefined,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
        serialNumbers: serialNumbers.length > 0 ? serialNumbers : undefined,
        snCount: serialNumbers.length
      };

      successItems.push(inventoryItem);
    }

    // 保存成功的数据
    if (successItems.length > 0) {
      const existing = await prisma.tenantSetting.findFirst({
        where: { tenantId, key: 'init_inventory' }
      });

      let currentItems: InitInventory[] = [];
      if (existing?.value) {
        currentItems = JSON.parse(existing.value);
      }

      // 合并数据，删除重复的
      const mergedItems = [...currentItems];
      for (const newItem of successItems) {
        const existingIndex = mergedItems.findIndex(
          item => item.productId === newItem.productId && item.warehouseId === newItem.warehouseId
        );
        if (existingIndex >= 0) {
          mergedItems[existingIndex] = newItem;
        } else {
          mergedItems.push(newItem);
        }
      }

      if (existing) {
        await prisma.tenantSetting.update({
          where: { id: existing.id },
          data: { value: JSON.stringify(mergedItems) }
        });
      } else {
        await prisma.tenantSetting.create({
          data: {
            tenantId,
            key: 'init_inventory',
            value: JSON.stringify(mergedItems),
            category: 'init',
            isPublic: true
          }
        });
      }
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
    console.error('导入库存数据失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

// 导入应收款
export const importReceivable = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const items = req.body as any[];
    const errors: Array<{ row: number; message: string }> = [];
    const successItems: InitReceivable[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      // 验证必填字段
      if (!item.customerName) rowErrors.push('客户名称不能为空');
      if (!item.amount || item.amount <= 0) rowErrors.push('应收金额必须大于0');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      // 查找客户
      const customer = await prisma.customer.findFirst({
        where: { tenantId, name: item.customerName }
      });

      if (!customer) {
        errors.push({ row, message: `客户 ${item.customerName} 不存在` });
        continue;
      }

      const receivableItem: InitReceivable = {
        customerId: customer.id,
        customerName: customer.name,
        amount: item.amount,
        remark: item.remark || ''
      };

      successItems.push(receivableItem);
    }

    // 保存成功的数据
    if (successItems.length > 0) {
      const existing = await prisma.tenantSetting.findFirst({
        where: { tenantId, key: 'init_receivable' }
      });

      let currentItems: InitReceivable[] = [];
      if (existing?.value) {
        currentItems = JSON.parse(existing.value);
      }

      const mergedItems = [...currentItems, ...successItems];

      if (existing) {
        await prisma.tenantSetting.update({
          where: { id: existing.id },
          data: { value: JSON.stringify(mergedItems) }
        });
      } else {
        await prisma.tenantSetting.create({
          data: {
            tenantId,
            key: 'init_receivable',
            value: JSON.stringify(mergedItems),
            category: 'init',
            isPublic: true
          }
        });
      }
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
    console.error('导入应收款失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

// 导入应付款
export const importPayable = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const items = req.body as any[];
    const errors: Array<{ row: number; message: string }> = [];
    const successItems: InitPayable[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      // 验证必填字段
      if (!item.supplierName) rowErrors.push('供应商名称不能为空');
      if (!item.amount || item.amount <= 0) rowErrors.push('应付金额必须大于0');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      // 查找供应商
      const supplier = await prisma.supplier.findFirst({
        where: { tenantId, name: item.supplierName }
      });

      if (!supplier) {
        errors.push({ row, message: `供应商 ${item.supplierName} 不存在` });
        continue;
      }

      const payableItem: InitPayable = {
        supplierId: supplier.id,
        supplierName: supplier.name,
        amount: item.amount,
        remark: item.remark || ''
      };

      successItems.push(payableItem);
    }

    // 保存成功的数据
    if (successItems.length > 0) {
      const existing = await prisma.tenantSetting.findFirst({
        where: { tenantId, key: 'init_payable' }
      });

      let currentItems: InitPayable[] = [];
      if (existing?.value) {
        currentItems = JSON.parse(existing.value);
      }

      const mergedItems = [...currentItems, ...successItems];

      if (existing) {
        await prisma.tenantSetting.update({
          where: { id: existing.id },
          data: { value: JSON.stringify(mergedItems) }
        });
      } else {
        await prisma.tenantSetting.create({
          data: {
            tenantId,
            key: 'init_payable',
            value: JSON.stringify(mergedItems),
            category: 'init',
            isPublic: true
          }
        });
      }
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
    console.error('导入应付款失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

// 导入账户余额
export const importAccountBalance = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const items = req.body as any[];
    const errors: Array<{ row: number; message: string }> = [];
    const successItems: InitAccountBalance[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = i + 1;
      const rowErrors: string[] = [];

      // 验证必填字段
      if (!item.accountName) rowErrors.push('账户名称不能为空');
      if (item.balance === undefined || item.balance === null) rowErrors.push('初始余额不能为空');

      if (rowErrors.length > 0) {
        errors.push({ row, message: rowErrors.join('; ') });
        continue;
      }

      // 查找账户
      const account = await prisma.account.findFirst({
        where: { tenantId, name: item.accountName }
      });

      if (!account) {
        errors.push({ row, message: `账户 ${item.accountName} 不存在` });
        continue;
      }

      const accountBalanceItem: InitAccountBalance = {
        accountId: account.id,
        accountName: account.name,
        balance: item.balance,
        remark: item.remark || ''
      };

      successItems.push(accountBalanceItem);
    }

    // 保存成功的数据
    if (successItems.length > 0) {
      const existing = await prisma.tenantSetting.findFirst({
        where: { tenantId, key: 'init_account_balance' }
      });

      let currentItems: InitAccountBalance[] = [];
      if (existing?.value) {
        currentItems = JSON.parse(existing.value);
      }

      // 合并数据，删除重复的
      const mergedItems = [...currentItems];
      for (const newItem of successItems) {
        const existingIndex = mergedItems.findIndex(item => item.accountId === newItem.accountId);
        if (existingIndex >= 0) {
          mergedItems[existingIndex] = newItem;
        } else {
          mergedItems.push(newItem);
        }
      }

      if (existing) {
        await prisma.tenantSetting.update({
          where: { id: existing.id },
          data: { value: JSON.stringify(mergedItems) }
        });
      } else {
        await prisma.tenantSetting.create({
          data: {
            tenantId,
            key: 'init_account_balance',
            value: JSON.stringify(mergedItems),
            category: 'init',
            isPublic: true
          }
        });
      }
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
    console.error('导入账户余额失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

// 获取账户余额
export const getInitAccountBalance = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const setting = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_account_balance' }
    });

    const data = setting?.value ? JSON.parse(setting.value) : [];
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取账户余额失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
};

// 添加账户余额
export const addInitAccountBalance = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const { accountId, balance, remark } = req.body;

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      return res.status(400).json({ success: false, message: '账户不存在' });
    }

    const newItem: InitAccountBalance = {
      accountId,
      accountName: account.name,
      balance,
      remark: remark || ''
    };

    const existing = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_account_balance' }
    });

    let items: InitAccountBalance[] = [];
    if (existing?.value) {
      items = JSON.parse(existing.value);
    }

    // 删除重复记录
    items = items.filter(i => i.accountId !== accountId);
    items.push(newItem);

    if (existing) {
      await prisma.tenantSetting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(items) }
      });
    } else {
      await prisma.tenantSetting.create({
        data: {
          tenantId,
          key: 'init_account_balance',
          value: JSON.stringify(items),
          category: 'init',
          isPublic: true
        }
      });
    }

    res.json({ success: true, data: newItem });
  } catch (error) {
    console.error('添加账户余额失败:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
};

// 删除账户余额
export const deleteInitAccountBalance = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    const { accountId } = req.query as any;

    const existing = await prisma.tenantSetting.findFirst({
      where: { tenantId, key: 'init_account_balance' }
    });

    if (!existing?.value) {
      return res.status(404).json({ success: false, message: '数据不存在' });
    }

    let items: InitAccountBalance[] = JSON.parse(existing.value);
    items = items.filter(i => i.accountId !== accountId);

    await prisma.tenantSetting.update({
      where: { id: existing.id },
      data: { value: JSON.stringify(items) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('删除账户余额失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
};

// 重置初始化数据
export const resetInitData = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    await prisma.tenantSetting.deleteMany({
      where: {
        tenantId,
        key: { in: ['init_inventory', 'init_receivable', 'init_payable', 'init_account_balance'] }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('重置初始化数据失败:', error);
    res.status(500).json({ success: false, message: '重置失败' });
  }
};

// 完成初始化
export const completeInit = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    // 更新租户状态为已完成初始化
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { initializationStatus: 'completed' }
    });

    res.json({ success: true, message: '账套初始化已完成' });
  } catch (error) {
    console.error('完成初始化失败:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
};

// 反初始化
export const revertInit = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未授权' });
    }

    // 检查业务数据是否存在
    const [orders, inventory] = await Promise.all([
      prisma.purchaseOrder.count({ where: { tenantId } }),
      prisma.inventoryItem.count({ where: { tenantId } })
    ]);

    if (orders > 0 || inventory > 0) {
      return res.status(403).json({
        success: false,
        message: '存在业务数据，无法反初始化'
      });
    }

    // 更新状态
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { initializationStatus: 'data_entry' }
    });

    // 删除初始化数据
    await prisma.tenantSetting.deleteMany({
      where: {
        tenantId,
        key: { in: ['init_inventory', 'init_receivable', 'init_payable', 'init_account_balance'] }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('反初始化失败:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
};

export default {
  getInitInventory,
  addInitInventory,
  updateInitInventory,
  deleteInitInventory,
  importInventory,
  getInitReceivable,
  addInitReceivable,
  deleteInitReceivable,
  importReceivable,
  getInitPayable,
  addInitPayable,
  deleteInitPayable,
  importPayable,
  getInitAccountBalance,
  addInitAccountBalance,
  deleteInitAccountBalance,
  importAccountBalance,
  resetInitData,
  completeInit,
  revertInit
};
