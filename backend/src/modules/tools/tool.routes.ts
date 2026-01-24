import { Router } from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware';
import {
  createTool,
  getAllTools,
  issueTool,
  returnTool,
  getToolHistory,
  deleteTool,
} from './tool.controller';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Tool CRUD
router.post('/', createTool);
router.get('/', getAllTools);
router.delete('/:toolId', deleteTool);

// Issue/Return
router.post('/:toolId/issue', issueTool);
router.post('/:toolId/return', returnTool);

// History
router.get('/:toolId/history', getToolHistory);

export default router;
