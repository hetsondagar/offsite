import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createNode, getProjectNodes, getNode } from './site360.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { ensureUploadsDirectory } from './site360.service';

const router = Router();

// Ensure uploads directory exists
ensureUploadsDirectory();

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'backend', 'uploads', 'site360');
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `site360_${timestamp}_${originalName}`;
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
  upload.single('panorama'),
  createNode
);

router.get(
  '/project/:projectId',
  authenticateUser,
  getProjectNodes
);

router.get(
  '/node/:nodeId',
  authenticateUser,
  getNode
);

export default router;
