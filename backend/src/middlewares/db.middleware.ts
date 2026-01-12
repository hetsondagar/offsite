import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../types';

/**
 * When MongoDB goes unreachable (e.g., user turns internet off while using Atlas),
 * mongoose queries can hang for a long time. This middleware fails fast with 503.
 */
export const requireDbConnection = (req: Request, res: Response, next: NextFunction): void => {
  const readyState = mongoose.connection.readyState;

  // 1 = connected. 0 = disconnected, 2 = connecting, 3 = disconnecting
  if (readyState !== 1) {
    const response: ApiResponse = {
      success: false,
      message: 'Database unavailable. If you are offline, use offline mode and sync later.',
      code: 'DB_UNAVAILABLE',
    };
    res.status(503).json(response);
    return;
  }

  next();
};
