import { request } from './http';

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  lastUsedAt?: string;
  lastUsedIp?: string;
  expiresAt?: string;
  permissions?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getApiKeys(): Promise<{ success: boolean; data: ApiKey[] }> {
  return request({ url: '/api/v1/api-keys', method: 'get' });
}

export function createApiKey(data: Partial<ApiKey> & { expiresInDays?: number | undefined }): Promise<{ success: boolean; data: ApiKey }> {
  return request({ url: '/api/v1/api-keys', method: 'post', data });
}

export function updateApiKey(id: string, data: Partial<ApiKey>): Promise<{ success: boolean; data: ApiKey }> {
  return request({ url: `/api/v1/api-keys/${id}`, method: 'put', data });
}

export function deleteApiKey(id: string): Promise<{ success: boolean; message: string }> {
  return request({ url: `/api/v1/api-keys/${id}`, method: 'delete' });
}

export default {
  getApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey
};