import { Router } from 'express';
import { getMe, getUserById, updateUser } from './user.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/me', authenticateUser, getMe);
router.patch('/me', authenticateUser, updateUser); // Update own profile
router.get('/:id', authenticateUser, getUserById);

export default router;

