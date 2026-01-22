import { Router } from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { getOwnerOverview } from './owner.controller';

const router = Router();

router.get('/overview/:projectId', authenticateUser, authorizeRoles('owner'), getOwnerOverview);

export default router;
