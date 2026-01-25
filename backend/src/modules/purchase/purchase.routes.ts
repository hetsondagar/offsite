import { Router } from 'express';
import { authenticateUser } from '../../middlewares/auth.middleware';
import {
  getApprovedRequests,
  sendMaterial,
  receiveMaterial,
  getHistoryByProject,
  getSentMaterialsForEngineer,
  getAllHistory,
} from './purchase.controller';
import {
  getPurchaseInvoices,
  getPurchaseInvoiceById,
  generatePurchaseInvoicePDF,
} from './purchase-invoice.controller';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Get approved requests ready to send (Purchase Manager)
router.get('/approved-requests', getApprovedRequests);

// Send material (Purchase Manager)
router.post('/send/:requestId', sendMaterial);

// Receive material (Engineer)
router.post('/receive/:historyId', receiveMaterial);

// Get sent materials for engineer to confirm
router.get('/sent-for-engineer', getSentMaterialsForEngineer);

// Get purchase history by project
router.get('/history/project/:projectId', getHistoryByProject);

// Get all purchase history
router.get('/history', getAllHistory);

// Get purchase invoices (Manager/Owner)
router.get('/invoices', getPurchaseInvoices);

// Get purchase invoice by ID
router.get('/invoices/:id', getPurchaseInvoiceById);

// Generate PDF for purchase invoice
router.get('/invoices/:id/pdf', generatePurchaseInvoicePDF);

export default router;
