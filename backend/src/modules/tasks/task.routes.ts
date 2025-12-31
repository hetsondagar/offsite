import { Router } from 'express';
import { createTask, updateTaskStatus } from './task.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticateUser, createTask);
router.patch('/:id/status', authenticateUser, updateTaskStatus);

export default router;

