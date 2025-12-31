import { Router } from 'express';
import {
  createMaterialRequest,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getMaterialsCatalog,
} from './material.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/role.middleware';

const router = Router();

router.post(
  '/request',
  authenticateUser,
  authorizePermission('canRaiseMaterialRequests'),
  createMaterialRequest
);
router.get(
  '/catalog',
  authenticateUser,
  getMaterialsCatalog
);
router.get(
  '/pending',
  authenticateUser,
  getPendingRequests
);
router.post(
  '/:id/approve',
  authenticateUser,
  authorizePermission('canApproveMaterialRequests'),
  approveRequest
);
router.post(
  '/:id/reject',
  authenticateUser,
  authorizePermission('canApproveMaterialRequests'),
  rejectRequest
);

export default router;

