import { Router } from 'express';
import multer from 'multer';
import { createDPR, getDPRsByProject } from './dpr.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/role.middleware';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

router.post(
  '/',
  authenticateUser,
  authorizePermission('canCreateDPR'),
  upload.array('photos', 6),
  createDPR
);
router.get(
  '/project/:projectId',
  authenticateUser,
  getDPRsByProject
);

export default router;

