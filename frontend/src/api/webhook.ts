import { request } from './http';

export interface Webhook {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  contentType: string;
  isActive: boolean;
  description?: string;
  lastDeliveredAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  deliveryAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLog {
  id: string;
  tenantId: string;
  webhookId: string;
  event: string;
  payload: any;
  url: string;
  statusCode?: number;
  response?: string;
  success: boolean;
  attempts: number;
  nextRetryAt?: string;
  createdAt: string;
}

export function getWebhooks(): Promise<{ success: boolean; data: Webhook[] }> {
  return request({ url: '/api/v1/webhooks', method: 'get' });
}

export function createWebhook(data: Partial<Webhook>): Promise<{ success: boolean; data: Webhook }> {
  return request({ url: '/api/v1/webhooks', method: 'post', data });
}

export function updateWebhook(id: string, data: Partial<Webhook>): Promise<{ success: boolean; data: Webhook }> {
  return request({ url: `/api/v1/webhooks/${id}`, method: 'put', data });
}

export function regenerateWebhookSecret(id: string): Promise<{ success: boolean; data: Webhook }> {
  return request({ url: `/api/v1/webhooks/${id}/regenerate-secret`, method: 'post' });
}

export function deleteWebhook(id: string): Promise<{ success: boolean; message: string }> {
  return request({ url: `/api/v1/webhooks/${id}`, method: 'delete' });
}

export function getWebhookLogs(webhookId: string, page = 1, pageSize = 20): Promise<{ success: boolean; data: WebhookLog[]; pagination: any }> {
  return request({ url: `/api/v1/webhooks/${webhookId}/logs?page=${page}&pageSize=${pageSize}`, method: 'get' });
}

export default {
  getWebhooks,
  createWebhook,
  updateWebhook,
  regenerateWebhookSecret,
  deleteWebhook,
  getWebhookLogs
};