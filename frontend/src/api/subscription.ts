import { request } from './http';

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  price: number;
  currency: string;
  billingCycle: string;
  order: number;
  isActive: boolean;
  isPopular: boolean;
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
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  externalId?: string;
  status: string;
  price: number;
  currency: string;
  billingCycle: string;
  currentPeriodStartsAt?: string;
  currentPeriodEndsAt?: string;
  cancelsAt?: string;
  cancelledAt?: string;
  trialEndsAt?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  invoiceNo: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string;
  dueDate?: string;
  pdfUrl?: string;
  billingEmail?: string;
  billingAddress?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export function getPlans(): Promise<{ success: boolean; data: Plan[] }> {
  return request({ url: '/api/v1/subscriptions/plans', method: 'get' });
}

export function getCurrentSubscription(): Promise<{ success: boolean; data?: Subscription }> {
  return request({ url: '/api/v1/subscriptions/current', method: 'get' });
}

export function createSubscription(data: any): Promise<{ success: boolean; data: Subscription }> {
  return request({ url: '/api/v1/subscriptions', method: 'post', data });
}

export function cancelSubscription(): Promise<{ success: boolean; data: Subscription }> {
  return request({ url: '/api/v1/subscriptions/cancel', method: 'post' });
}

export function getInvoices(): Promise<{ success: boolean; data: Invoice[] }> {
  return request({ url: '/api/v1/subscriptions/invoices', method: 'get' });
}

export default {
  getPlans,
  getCurrentSubscription,
  createSubscription,
  cancelSubscription,
  getInvoices
};
