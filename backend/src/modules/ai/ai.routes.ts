import { Router } from 'express';
import { getSiteRisk, getAnomalies, getAIHealth } from './ai.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/role.middleware';

const router = Router();

// Health check endpoint (no auth required for testing)
router.get('/health', getAIHealth);

router.get(
  '/site-risk/:siteId',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getSiteRisk
);

router.get(
  '/anomalies/:siteId',
  authenticateUser,
  authorizePermission('canViewAIInsights'),
  getAnomalies
);

export default router;

