import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  // Log full error details
  logger.error(`Error ${statusCode}: ${message}`, {
    path: req.path,
    method: req.method,
    body: req.body,
    stack: err.stack,
    error: err,
  });

  // Don't send stack trace in production
  const response: ApiResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500 
      ? 'Internal server error. Please try again later.' 
      : message,
    code,
  };

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    message: `Route ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  };
  res.status(404).json(response);
};

