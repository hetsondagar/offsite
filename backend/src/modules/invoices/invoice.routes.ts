import { Router } from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  finalizeInvoice,
  downloadInvoicePDF,
  updatePaymentStatus,
  deleteInvoice,
} from './invoice.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';

const router = Router();

/**
 * Invoice routes with role-based access control:
 * - OWNER: Full CRUD (create, read, update, finalize, download PDF, delete)
 * - PROJECT_MANAGER: Read-only for assigned projects
 * - SITE_ENGINEER: Read-only
 */

// Create invoice (Owner only)
router.post('/', authenticateUser, authorizeRoles('owner'), createInvoice);

// Get invoices (All authenticated users, filtered by role)
router.get('/', authenticateUser, authorizeRoles('owner', 'manager', 'engineer'), getInvoices);

// Get single invoice (All authenticated users, with role-based access)
router.get('/:id', authenticateUser, authorizeRoles('owner', 'manager', 'engineer'), getInvoiceById);

// Update invoice (Owner only, draft invoices only)
router.put('/:id', authenticateUser, authorizeRoles('owner'), updateInvoice);

// Finalize invoice (Owner only)
router.post('/:id/finalize', authenticateUser, authorizeRoles('owner'), finalizeInvoice);

// Download PDF (Owner only)
router.get('/:id/pdf', authenticateUser, authorizeRoles('owner'), downloadInvoicePDF);

// Update payment status (Owner only)
router.patch('/:id/payment-status', authenticateUser, authorizeRoles('owner'), updatePaymentStatus);

// Delete invoice (Owner only, draft invoices only)
router.delete('/:id', authenticateUser, authorizeRoles('owner'), deleteInvoice);

export default router;
