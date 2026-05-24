import { Router } from 'express';
import {
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
} from '../controllers/workflow.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// 工作流定义管理
router.get('/', authenticate, getWorkflowDefinitions);
router.get('/document-types', authenticate, getDocumentTypes);
router.get('/stats', authenticate, getWorkflowStats);
router.get('/:id', authenticate, getWorkflowDefinition);
router.post('/', authenticate, createWorkflowDefinition);
router.put('/:id', authenticate, updateWorkflowDefinition);
router.delete('/:id', authorize('workflow:delete'), deleteWorkflowDefinition);

// 待办和审批
router.get('/me/todos', authenticate, getMyTodos);
router.get('/me/pending', authenticate, getPendingApprovals);
router.get('/me/requests', authenticate, getMyRequests);

// 审批操作
router.post('/approve/:instanceId', authenticate, approveDocument);
router.post('/cancel/:instanceId', authenticate, cancelWorkflow);
router.post('/submit', authenticate, submitToWorkflow);
router.get('/history/:instanceId', authenticate, getApprovalHistory);

export default router;