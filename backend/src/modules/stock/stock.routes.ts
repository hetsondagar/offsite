import { Router } from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { getProjectStock, getStockAlerts } from './stock.controller';

const router = Router();

router.get('/project/:projectId', authenticateUser, getProjectStock);
router.get('/alerts/:projectId', authenticateUser, getStockAlerts);

export default router;
