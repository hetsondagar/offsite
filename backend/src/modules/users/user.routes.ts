import { Router } from 'express';
import { getMe, getUserById, updateUser, getUserByOffsiteId } from './user.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/me', authenticateUser, getMe);
router.patch('/me', authenticateUser, updateUser); // Update own profile
router.get('/offsite/:offsiteId', authenticateUser, getUserByOffsiteId); // Search by OffSite ID
router.get('/:id', authenticateUser, getUserById);

export default router;

