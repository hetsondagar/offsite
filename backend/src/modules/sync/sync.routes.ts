import { Router } from 'express';
import { syncBatch } from './sync.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/batch', authenticateUser, syncBatch);

export default router;

