import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { auditLog } from '../utils/audit.util';

const prisma = new PrismaClient();

// 获取租户配置列表
export const getTenantSettings = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const settings = await prisma.tenantSetting.findMany({
      where: { tenantId }
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('获取租户配置失败:', error);
    res.status(500).json({ success: false, message: '获取租户配置失败' });
  }
};

// 创建或更新租户配置
export const saveTenantSetting = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { key, value, category, description, isPublic } = req.body;

    const existing = await prisma.tenantSetting.findFirst({
      where: { tenantId, key }
    });

    let setting;
    if (existing) {
      setting = await prisma.tenantSetting.update({
        where: { id: existing.id },
        data: {
          value,
          category: category || existing.category,
          description: description || existing.description,
          isPublic: isPublic !== undefined ? isPublic : existing.isPublic
        }
      });
    } else {
      setting = await prisma.tenantSetting.create({
        data: {
          tenantId,
          key,
          value,
          category,
          description,
          isPublic: isPublic || false
        }
      });
    }

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'update',
      module: 'tenant-setting',
      resource: key,
      detail: JSON.stringify({ value, category })
    });

    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('保存租户配置失败:', error);
    res.status(500).json({ success: false, message: '保存租户配置失败' });
  }
};

// 删除租户配置
export const deleteTenantSetting = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const { key } = req.params;

    await prisma.tenantSetting.deleteMany({
      where: { tenantId, key }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'delete',
      module: 'tenant-setting',
      resource: key
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除租户配置失败:', error);
    res.status(500).json({ success: false, message: '删除租户配置失败' });
  }
};

// 获取当前租户信息
export const getCurrentTenant = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('获取租户信息失败:', error);
    res.status(500).json({ success: false, message: '获取租户信息失败' });
  }
};

// 更新租户基本信息
export const updateTenant = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const {
      displayName,
      description,
      logoUrl,
      faviconUrl,
      email,
      phone,
      address,
      taxNo,
      website,
      timezone,
      locale,
      currency,
      // 账套参数
      fiscalYearStartYear,
      fiscalYearStartMonth,
      currentFiscalYear,
      currentFiscalMonth,
      initializationStatus
    } = req.body;

    // 检查初始化状态，如果已完成则不允许修改账套参数
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!existingTenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    // 如果初始化已完成，不允许修改账套参数
    if (existingTenant.initializationStatus === 'completed') {
      const fiscalFields = [fiscalYearStartYear, fiscalYearStartMonth, currentFiscalYear, currentFiscalMonth];
      if (fiscalFields.some(f => f !== undefined)) {
        return res.status(403).json({
          success: false,
          message: '账套初始化已完成，无法修改账套参数'
        });
      }
    }

    // 校验：当前账期必须大于等于账套启用时间
    const newFiscalYearStartYear = fiscalYearStartYear !== undefined ? fiscalYearStartYear : existingTenant.fiscalYearStartYear;
    const newFiscalYearStartMonth = fiscalYearStartMonth !== undefined ? fiscalYearStartMonth : existingTenant.fiscalYearStartMonth;
    const newCurrentFiscalYear = currentFiscalYear !== undefined ? currentFiscalYear : existingTenant.currentFiscalYear;
    const newCurrentFiscalMonth = currentFiscalMonth !== undefined ? currentFiscalMonth : existingTenant.currentFiscalMonth;

    if (newCurrentFiscalYear && newCurrentFiscalMonth && newFiscalYearStartYear && newFiscalYearStartMonth) {
      const currentPeriod = newCurrentFiscalYear * 12 + newCurrentFiscalMonth;
      const startPeriod = newFiscalYearStartYear * 12 + newFiscalYearStartMonth;

      if (currentPeriod < startPeriod) {
        return res.status(400).json({
          success: false,
          message: '当前账期不能早于账套启用时间'
        });
      }
    }

    const updateData: any = {};

    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (faviconUrl !== undefined) updateData.faviconUrl = faviconUrl;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (taxNo !== undefined) updateData.taxNo = taxNo;
    if (website !== undefined) updateData.website = website;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (locale !== undefined) updateData.locale = locale;
    if (currency !== undefined) updateData.currency = currency;

    // 账套参数
    if (fiscalYearStartYear !== undefined) updateData.fiscalYearStartYear = fiscalYearStartYear;
    if (fiscalYearStartMonth !== undefined) updateData.fiscalYearStartMonth = fiscalYearStartMonth;
    if (currentFiscalYear !== undefined) updateData.currentFiscalYear = currentFiscalYear;
    if (currentFiscalMonth !== undefined) updateData.currentFiscalMonth = currentFiscalMonth;
    if (initializationStatus !== undefined) updateData.initializationStatus = initializationStatus;

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'update',
      module: 'tenant',
      resource: tenantId,
      detail: JSON.stringify(req.body)
    });

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('更新租户信息失败:', error);
    res.status(500).json({ success: false, message: '更新租户信息失败' });
  }
};

// 结转至下期
export const carryForward = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    // 计算下期
    let nextYear = tenant.currentFiscalYear || tenant.fiscalYearStartYear || new Date().getFullYear();
    let nextMonth = (tenant.currentFiscalMonth || tenant.fiscalYearStartMonth || 1) + 1;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    // 更新当前账期
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        currentFiscalYear: nextYear,
        currentFiscalMonth: nextMonth
      }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'carry_forward',
      module: 'tenant',
      resource: tenantId,
      detail: JSON.stringify({ fromYear: tenant.currentFiscalYear, fromMonth: tenant.currentFiscalMonth, toYear: nextYear, toMonth: nextMonth })
    });

    res.json({
      success: true,
      message: `已成功结转至${nextYear}年${nextMonth}月`,
      data: {
        currentFiscalYear: nextYear,
        currentFiscalMonth: nextMonth
      }
    });
  } catch (error) {
    console.error('结转失败:', error);
    res.status(500).json({ success: false, message: '结转失败' });
  }
};

// 反结账
export const reversePeriod = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: '缺少租户ID' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    const currentYear = tenant.currentFiscalYear || tenant.fiscalYearStartYear || new Date().getFullYear();
    const currentMonth = tenant.currentFiscalMonth || tenant.fiscalYearStartMonth || 1;
    const startYear = tenant.fiscalYearStartYear || currentYear;
    const startMonth = tenant.fiscalYearStartMonth || 1;

    // 检查是否可以反结账（当前账期 > 账套启用时间）
    const currentPeriod = currentYear * 12 + currentMonth;
    const startPeriod = startYear * 12 + startMonth;

    if (currentPeriod <= startPeriod) {
      return res.status(400).json({
        success: false,
        message: '当前账期已回到账套启用时间，无法继续反结账'
      });
    }

    // 计算上期
    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;

    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }

    // 更新当前账期
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        currentFiscalYear: prevYear,
        currentFiscalMonth: prevMonth
      }
    });

    await auditLog({
      tenantId,
      userId: req.user?.id,
      action: 'reverse_period',
      module: 'tenant',
      resource: tenantId,
      detail: JSON.stringify({ fromYear: currentYear, fromMonth: currentMonth, toYear: prevYear, toMonth: prevMonth })
    });

    res.json({
      success: true,
      message: `已成功反结账至${prevYear}年${prevMonth}月`,
      data: {
        currentFiscalYear: prevYear,
        currentFiscalMonth: prevMonth
      }
    });
  } catch (error) {
    console.error('反结账失败:', error);
    res.status(500).json({ success: false, message: '反结账失败' });
  }
};

export default {
  getTenantSettings,
  saveTenantSetting,
  deleteTenantSetting,
  getCurrentTenant,
  updateTenant,
  carryForward,
  reversePeriod
};
