import { Router } from 'express';
import {
  getSiteHealth,
  getDelayRisks,
  getMaterialAnomalies,
  getLabourGap,
  getApprovalDelays,
} from './insights.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/role.middleware';

const router = Router();

router.get(
  '/site-health',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getSiteHealth
);
router.get(
  '/delay-risk',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getDelayRisks
);
router.get(
  '/material-anomalies',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getMaterialAnomalies
);
router.get(
  '/labour-gap',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getLabourGap
);
router.get(
  '/approval-delays',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getApprovalDelays
);

export default router;

