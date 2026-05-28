import { request } from './http';

export const getWorkflowDefinitions = (params?: any) =>
  request({ url: '/api/v1/workflows', method: 'get', params });

export const getWorkflowDefinition = (id: string) =>
  request({ url: `/api/v1/workflows/${id}`, method: 'get' });

export const createWorkflowDefinition = (data: any) =>
  request({ url: '/api/v1/workflows', method: 'post', data });

export const updateWorkflowDefinition = (id: string, data: any) =>
  request({ url: `/api/v1/workflows/${id}`, method: 'put', data });

export const deleteWorkflowDefinition = (id: string) =>
  request({ url: `/api/v1/workflows/${id}`, method: 'delete' });

export const getDocumentTypes = () =>
  request({ url: '/api/v1/workflows/document-types', method: 'get' });

export const getWorkflowStats = () =>
  request({ url: '/api/v1/workflows/stats', method: 'get' });

// 待办和审批
export const getMyTodos = () =>
  request({ url: '/api/v1/workflows/me/todos', method: 'get' });

export const getPendingApprovals = () =>
  request({ url: '/api/v1/workflows/me/pending', method: 'get' });

export const getMyRequests = (params?: any) =>
  request({ url: '/api/v1/workflows/me/requests', method: 'get', params });

// 审批操作
export const approveDocument = (instanceId: string, data: any) =>
  request({ url: `/api/v1/workflows/approve/${instanceId}`, method: 'post', data });

export const cancelWorkflow = (instanceId: string, data?: any) =>
  request({ url: `/api/v1/workflows/cancel/${instanceId}`, method: 'post', data });

export const submitToWorkflow = (data: any) =>
  request({ url: '/api/v1/workflows/submit', method: 'post', data });

export const getApprovalHistory = (instanceId: string) =>
  request({ url: `/api/v1/workflows/history/${instanceId}`, method: 'get' });

export default {
  getWorkflowDefinitions,
  getWorkflowDefinition,
  createWorkflowDefinition,
  updateWorkflowDefinition,
  deleteWorkflowDefinition,
  getDocumentTypes,
  getWorkflowStats,
  getMyTodos,
  getPendingApprovals,
  getMyRequests,
  approveDocument,
  cancelWorkflow,
  submitToWorkflow,
  getApprovalHistory
};