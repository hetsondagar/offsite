import { Router } from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware';
import {
  createPermit,
  getPendingPermits,
  approvePermit,
  verifyOTP,
  getMyPermits,
  getPermitsByProject,
} from './permit.controller';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Engineer routes
router.post('/', createPermit);
router.get('/my', getMyPermits);
router.post('/:id/verify-otp', verifyOTP);

// Manager routes
router.get('/pending', getPendingPermits);
router.post('/:id/approve', approvePermit);

// Project permits
router.get('/project/:projectId', getPermitsByProject);

export default router;
