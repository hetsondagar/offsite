import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
  uploadReceiptAndSendInvoice,
} from './purchase-invoice.controller';

const router = Router();

// Configure multer for receipt photo uploads
const getReceiptUploadsDir = (): string => {
  const possiblePaths = [
    path.join(process.cwd(), 'backend', 'uploads', 'purchase', 'receipts'),
    path.join(process.cwd(), 'uploads', 'purchase', 'receipts'),
    path.join(__dirname, '..', '..', '..', 'uploads', 'purchase', 'receipts'),
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(path.dirname(possiblePath))) {
      if (!fs.existsSync(possiblePath)) {
        fs.mkdirSync(possiblePath, { recursive: true });
      }
      return possiblePath;
    }
  }

  const fallbackPath = possiblePaths[0];
  fs.mkdirSync(fallbackPath, { recursive: true });
  return fallbackPath;
};

const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadsDir = getReceiptUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `receipt_${timestamp}_${baseName}${ext}`;
    cb(null, filename);
  },
});

const receiptUpload = multer({
  storage: receiptStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for receipt photos
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

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

// Upload receipt photo and send PDF invoice (Purchase Manager)
router.post(
  '/invoices/:id/upload-receipt',
  receiptUpload.single('receipt'),
  uploadReceiptAndSendInvoice
);

export default router;
