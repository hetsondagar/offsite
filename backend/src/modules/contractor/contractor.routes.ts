import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
  uploadInvoicePdf,
} from './contractor.controller';

const router = Router();

// Configure multer for contractor invoice PDF uploads
const getContractorInvoiceUploadsDir = (): string => {
  const possiblePaths = [
    path.join(process.cwd(), 'backend', 'uploads', 'contractor', 'invoices'),
    path.join(process.cwd(), 'uploads', 'contractor', 'invoices'),
    path.join(__dirname, '..', '..', '..', 'uploads', 'contractor', 'invoices'),
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

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadsDir = getContractorInvoiceUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.pdf';
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `contractor_invoice_${timestamp}_${baseName}${ext}`;
    cb(null, filename);
  },
});

const pdfUpload = multer({
  storage: pdfStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

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
router.post('/invoice/:id/upload-pdf', authorizeRoles('contractor'), pdfUpload.single('pdf'), uploadInvoicePdf);

export default router;
