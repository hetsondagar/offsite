import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { AppError } from './error.middleware';
import { hasPermission } from '../utils/permissions';

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      if (!roles.includes(req.user.role)) {
        throw new AppError(
          'Insufficient permissions',
          403,
          'FORBIDDEN'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const authorizePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      if (!hasPermission(req.user.role, permission as any)) {
        throw new AppError(
          'Insufficient permissions',
          403,
          'FORBIDDEN'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

