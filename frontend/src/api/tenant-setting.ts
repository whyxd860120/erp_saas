import { request } from './http';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  displayName?: string;
  description?: string;
  logoUrl?: string;
  faviconUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNo?: string;
  website?: string;
  timezone: string;
  locale: string;
  currency: string;
  plan: string;
  status: string;
  trialEndsAt?: string;
  currentPeriodStartsAt?: string;
  currentPeriodEndsAt?: string;
  billingEmail?: string;
  billingAddress?: string;
  featureMultiWarehouse: boolean;
  featureMultiCurrency: boolean;
  featureCustomFields: boolean;
  featureApiAccess: boolean;
  featureWebhooks: boolean;
  featureAuditLogs: boolean;
  featureAnalytics: boolean;
  quotaUsers: number;
  quotaStorage: number;
  quotaApiCalls: number;
  // 账套参数
  fiscalYearStartYear: number;
  fiscalYearStartMonth: number;
  currentFiscalYear: number;
  currentFiscalMonth: number;
  initializationStatus: string;
}

export interface TenantSetting {
  id: string;
  tenantId: string;
  key: string;
  value?: string;
  category?: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getCurrentTenant(): Promise<{ success: boolean; data: Tenant }> {
  return request({ url: '/api/v1/tenant-settings/current/tenant', method: 'get' });
}

export function updateTenant(data: Partial<Tenant>): Promise<{ success: boolean; data: Tenant }> {
  return request({ url: '/api/v1/tenant-settings/current/tenant', method: 'put', data });
}

export function getTenantSettings(): Promise<{ success: boolean; data: TenantSetting[] }> {
  return request({ url: '/api/v1/tenant-settings', method: 'get' });
}

export function saveTenantSetting(data: Partial<TenantSetting>): Promise<{ success: boolean; data: TenantSetting }> {
  return request({ url: '/api/v1/tenant-settings', method: 'post', data });
}

export function deleteTenantSetting(key: string): Promise<{ success: boolean; message: string }> {
  return request({ url: `/api/v1/tenant-settings/${key}`, method: 'delete' });
}

export default {
  getCurrentTenant,
  updateTenant,
  getTenantSettings,
  saveTenantSetting,
  deleteTenantSetting
};
