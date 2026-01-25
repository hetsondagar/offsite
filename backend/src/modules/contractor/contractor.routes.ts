import { Router } from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import {
  getAllContractors,
  assignContractorToProject,
  registerLabour,
  getLabours,
  uploadAttendance,
  getAttendanceSummary,
  createWeeklyInvoice,
  getPendingInvoices,
  approveInvoice,
  rejectInvoice,
  getApprovedInvoices,
  getMyInvoices,
} from './contractor.controller';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Contractor management (Owner + Project Manager)
router.get('/', getAllContractors);
router.post('/assign', authorizeRoles('owner', 'manager'), assignContractorToProject);

// Labour management (Contractor)
router.post('/labour', registerLabour);
router.get('/labours', getLabours);

// Attendance (Contractor)
router.post('/attendance', uploadAttendance);
router.get('/attendance/summary/:projectId', getAttendanceSummary);

// Invoices
router.post('/invoice', createWeeklyInvoice);
router.get('/invoices/pending', getPendingInvoices);
router.get('/invoices/approved', getApprovedInvoices);
router.get('/invoices/my', getMyInvoices);
router.post('/invoice/:id/approve', approveInvoice);
router.post('/invoice/:id/reject', rejectInvoice);

export default router;
