import { Router } from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware';
import {
  submitExpense,
  getPendingExpenses,
  approveExpense,
  rejectExpense,
  getAllExpenses,
  getMyExpenses,
} from './petty-cash.controller';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Submit expense (Manager)
router.post('/', submitExpense);

// Get expenses
router.get('/pending', getPendingExpenses);
router.get('/all', getAllExpenses);
router.get('/my', getMyExpenses);

// Approve/Reject
router.post('/:id/approve', approveExpense);
router.post('/:id/reject', rejectExpense);

export default router;
