import { Router } from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  finalizeInvoice,
  downloadInvoicePDF,
  updatePaymentStatus,
} from './invoice.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';

const router = Router();

// All routes are owner-only
router.post('/', authenticateUser, authorizeRoles('owner'), createInvoice);
router.get('/', authenticateUser, authorizeRoles('owner'), getInvoices);
router.get('/:id', authenticateUser, authorizeRoles('owner'), getInvoiceById);
router.post('/:id/finalize', authenticateUser, authorizeRoles('owner'), finalizeInvoice);
router.get('/:id/pdf', authenticateUser, authorizeRoles('owner'), downloadInvoicePDF);
router.patch('/:id/payment-status', authenticateUser, authorizeRoles('owner'), updatePaymentStatus);

export default router;
