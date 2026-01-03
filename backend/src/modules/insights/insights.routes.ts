import { Router } from 'express';
import {
  getSiteHealth,
  getDelayRisks,
  getMaterialAnomalies,
  getLabourGap,
  getApprovalDelays,
} from './insights.controller';
import {
  getDPRSummary,
  getHealthExplanation,
  getDelayRiskExplanation,
  getMaterialAnomalyExplanation,
} from './insights.controller.ai';
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

// AI-Powered Insights Endpoints
router.get(
  '/ai/dpr-summary',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getDPRSummary
);
router.get(
  '/ai/health-explanation',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getHealthExplanation
);
router.get(
  '/ai/delay-risk-explanation',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getDelayRiskExplanation
);
router.get(
  '/ai/material-anomaly-explanation',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getMaterialAnomalyExplanation
);

export default router;

