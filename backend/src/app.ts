import express, { Application } from 'express';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/requestLogger';
import { requireDbConnection } from './middlewares/db.middleware';
import { logger } from './utils/logger';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import projectRoutes from './modules/projects/project.routes';
import taskRoutes from './modules/tasks/task.routes';
import dprRoutes from './modules/dpr/dpr.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import materialRoutes from './modules/materials/material.routes';
import insightsRoutes from './modules/insights/insights.routes';
import invoiceRoutes from './modules/invoices/invoice.routes';
import syncRoutes from './modules/sync/sync.routes';
import eventRoutes from './modules/events/event.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import aiRoutes from './modules/ai/ai.routes';
import stockRoutes from './modules/stock/stock.routes';
import ownerRoutes from './modules/owner/owner.routes';
import purchaseRoutes from './modules/purchase/purchase.routes';
import contractorRoutes from './modules/contractor/contractor.routes';
import toolRoutes from './modules/tools/tool.routes';
import permitRoutes from './modules/permits/permit.routes';
import pettyCashRoutes from './modules/petty-cash/petty-cash.routes';
import site360Routes from './modules/site360/site360.routes';

const app: Application = express();

// Security middleware with CSP configured for MapTiler CDN
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for some inline scripts
          "'unsafe-eval'", // Required for some libraries
          "https://cdn.jsdelivr.net", // MapTiler SDK CDN
          "https://unpkg.com", // Fallback CDN
          "https://api.maptiler.com", // MapTiler API
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for inline styles
          "https://cdn.jsdelivr.net", // MapTiler CSS
          "https://unpkg.com", // Fallback CDN
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://api.maptiler.com", // MapTiler map tiles
          "https://*.maptiler.com", // MapTiler subdomains
        ],
        connectSrc: [
          "'self'",
          "https://api.maptiler.com", // MapTiler API calls
          "https://*.maptiler.com", // MapTiler subdomains
        ],
        fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
      },
    },
  })
);

// CORS configuration - support multiple origins and Vercel preview deployments
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];
  
  // Parse CORS_ORIGIN - can be comma-separated list
  if (env.CORS_ORIGIN) {
    const corsOrigins = env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean);
    origins.push(...corsOrigins);
  }
  
  // Add default development origin
  if (env.NODE_ENV === 'development') {
    origins.push('http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000');
  }
  
  // Add Capacitor origins for mobile apps
  origins.push('capacitor://localhost', 'http://localhost');
  
  // Remove duplicates and normalize (remove trailing slashes)
  const normalizedOrigins = origins.map(origin => origin.replace(/\/+$/, ''));
  return [...new Set(normalizedOrigins)];
};

// Check if origin matches Vercel pattern
const isVercelOrigin = (origin: string): boolean => {
  // Vercel preview deployments: *.vercel.app
  // Vercel production: your-domain.vercel.app or custom domain
  const vercelPatterns = [
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/offsite-be-off-the-site.*\.vercel\.app$/,
    /^https:\/\/offsite.*\.vercel\.app$/,
  ];
  
  return vercelPatterns.some(pattern => pattern.test(origin));
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      const allowedOrigins = getAllowedOrigins();
      const normalizedOrigin = origin.replace(/\/+$/, '');
      
      // Allow explicit matches
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow Vercel preview domains (e.g. *.vercel.app) used by deployments/previews
      try {
        const vercelRegex = /^https:\/\/[-a-z0-9]+\.vercel\.app$/i;
        if (vercelRegex.test(normalizedOrigin)) {
          console.info(`CORS: allowing vercel origin ${normalizedOrigin}`);
          return callback(null, true);
        }
      } catch (e) {
        // ignore regex errors
      }

      // Not allowed
      console.warn(`CORS blocked origin: ${origin} (normalized: ${normalizedOrigin})`);
      console.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/auth', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploads (must be before API routes to avoid conflicts)
// Handle both development (from project root) and production (from backend/dist) scenarios
const possibleUploadsPaths = [
  path.join(process.cwd(), 'backend', 'uploads'), // Development: from project root
  path.join(process.cwd(), 'uploads'), // Production: from backend/dist
  path.join(__dirname, '..', 'uploads'), // Alternative: relative to compiled code
];

let uploadsPath = possibleUploadsPaths[0];
for (const possiblePath of possibleUploadsPaths) {
  if (fs.existsSync(possiblePath)) {
    uploadsPath = possiblePath;
    break;
  }
}

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  logger.info(`Created uploads directory: ${uploadsPath}`);
}

// Also ensure site360 subdirectory exists
const site360Path = path.join(uploadsPath, 'site360');
if (!fs.existsSync(site360Path)) {
  fs.mkdirSync(site360Path, { recursive: true });
  logger.info(`Created site360 directory: ${site360Path}`);
}

logger.info(`Serving static uploads from: ${uploadsPath}`);
app.use('/uploads', express.static(uploadsPath, {
  etag: true,
  lastModified: true,
  maxAge: '1d', // Cache for 1 day
}));

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Helper function to set CORS headers
const setCorsHeaders = (req: express.Request, res: express.Response): void => {
  const origin = req.headers.origin;
  if (origin) {
    // Check if origin is allowed
    const allowedOrigins = getAllowedOrigins();
    const normalizedOrigin = origin.replace(/\/+$/, '');
    
    if (allowedOrigins.includes(normalizedOrigin) || isVercelOrigin(normalizedOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
  }
};

// Health check (CORS enabled for all origins)
app.get('/health', (req, res) => {
  setCorsHeaders(req, res);
  res.json({
    success: true,
    message: 'OffSite API is running',
    timestamp: new Date().toISOString(),
  });
});

// Handle OPTIONS for /health
app.options('/health', (req, res) => {
  setCorsHeaders(req, res);
  res.sendStatus(204);
});

// API health check (includes database status) - CORS enabled
app.get('/api/health', async (req, res) => {
  setCorsHeaders(req, res);
  const mongoose = await import('mongoose');
  const dbStatus = mongoose.default.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    success: true,
    message: 'OffSite API Health Check',
    data: {
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});

// Handle OPTIONS for /api/health
app.options('/api/health', (req, res) => {
  setCorsHeaders(req, res);
  res.sendStatus(204);
});

// Root
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'OffSite API - Root',
  });
});

// Logging (minimal)
app.use(requestLogger);

// API Routes
// Fail fast when DB is unreachable (e.g., offline + Atlas)
app.use('/api', requireDbConnection);
app.use('/api/auth', authRoutes);
// Also mount at /auth to support direct postman tests to /auth/forgot-password
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dpr', dprRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/contractor', contractorRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/permits', permitRoutes);
app.use('/api/petty-cash', pettyCashRoutes);
app.use('/api/site360', site360Routes);

// Serve frontend build (single-origin local/prod setup)
// Build the frontend first: ../frontend/dist
const frontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  // Serve static assets with proper MIME types
  app.use(express.static(frontendDistPath, {
    maxAge: '1y', // Cache static assets
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Ensure proper MIME types for JS modules
      if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    },
  }));

  // SPA fallback (must be after API routes)
  app.get('*', (req, res, next) => {
    // Don’t interfere with API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
    
    // Don't serve index.html for static asset requests
    // Static assets should be handled by express.static above
    if (req.path.startsWith('/assets/') || 
        req.path.match(/\.(js|mjs|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|webmanifest)$/i)) {
      return next(); // Let it 404 if not found (shouldn't happen if static middleware works)
    }
    
    // For all other routes, serve index.html (SPA routing)
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;

