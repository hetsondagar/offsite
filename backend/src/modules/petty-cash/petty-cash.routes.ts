import { Router } from 'express';
import multer from 'multer';
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

// Configure multer for memory storage (receipt photo)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// All routes require authentication
router.use(authenticateUser);

// Submit expense (Manager)
router.post('/', upload.single('receipt'), submitExpense);

// Get expenses
router.get('/pending', getPendingExpenses);
router.get('/all', getAllExpenses);
router.get('/my', getMyExpenses);

// Approve/Reject
router.post('/:id/approve', approveExpense);
router.post('/:id/reject', rejectExpense);

export default router;
