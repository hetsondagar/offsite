import { Router } from 'express';
import { createTask, updateTaskStatus, getTasks } from './task.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateUser, getTasks);
router.post('/', authenticateUser, createTask);
router.patch('/:id/status', authenticateUser, updateTaskStatus);

export default router;

