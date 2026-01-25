import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createNode, getProjectNodes, getNode } from './site360.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { ensureUploadsDirectory } from './site360.service';

const router = Router();

// Ensure uploads directory exists
ensureUploadsDirectory();

// Configure multer for disk storage
// Handle both development and production paths
const getUploadsDir = (): string => {
  const possiblePaths = [
    path.join(process.cwd(), 'backend', 'uploads', 'site360'), // Development: from project root
    path.join(process.cwd(), 'uploads', 'site360'), // Production: from backend/dist
    path.join(__dirname, '..', '..', '..', 'uploads', 'site360'), // Alternative: relative to compiled code
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(path.dirname(possiblePath))) {
      if (!fs.existsSync(possiblePath)) {
        fs.mkdirSync(possiblePath, { recursive: true });
      }
      return possiblePath;
    }
  }

  // Fallback: create in first possible location
  const fallbackPath = possiblePaths[0];
  fs.mkdirSync(fallbackPath, { recursive: true });
  return fallbackPath;
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadsDir = getUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    // Sanitize filename - keep extension, replace special chars
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `site360_${timestamp}_${baseName}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for panorama images
  },
  fileFilter: (_req, file, cb) => {
    // Accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Routes
router.post(
  '/nodes',
  authenticateUser,
  authorizeRoles('engineer'),
  upload.single('panorama'),
  createNode
);

router.get(
  '/project/:projectId',
  authenticateUser,
  authorizeRoles('engineer', 'manager', 'owner'),
  getProjectNodes
);

router.get(
  '/node/:nodeId',
  authenticateUser,
  authorizeRoles('engineer', 'manager', 'owner'),
  getNode
);

export default router;
