import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
}
