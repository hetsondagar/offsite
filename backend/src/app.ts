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

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
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

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'OffSite API is running',
    timestamp: new Date().toISOString(),
  });
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

// Serve frontend build (single-origin local/prod setup)
// Build the frontend first: ../frontend/dist
const frontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // SPA fallback (must be after API routes)
  app.get('*', (req, res, next) => {
    // Don’t interfere with API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;

