import { Router } from 'express';
import { getMe, getUserById } from './user.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/me', authenticateUser, getMe);
router.get('/:id', authenticateUser, getUserById);

export default router;

