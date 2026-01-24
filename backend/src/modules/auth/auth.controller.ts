import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { login, signup } from './auth.service';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  role: z.enum(['engineer', 'manager', 'owner', 'purchase_manager', 'contractor']),
  phone: z.string().optional().transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
});

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(email, password);
    
    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: result,
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return next(new AppError(`Validation error: ${errorMessages}`, 400, 'VALIDATION_ERROR'));
    }
    
    next(error);
  }
};

export const signupController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name, role, phone } = signupSchema.parse(req.body);
    // Phone is optional - pass undefined if not provided or empty
    const result = await signup(email, password, name, role, phone);
    
    const response: ApiResponse = {
      success: true,
      message: 'User created successfully',
      data: result,
    };
    
    res.status(201).json(response);
  } catch (error: any) {
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return next(new AppError(`Validation error: ${errorMessages}`, 400, 'VALIDATION_ERROR'));
    }
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(new AppError(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`, 409, 'DUPLICATE_ENTRY'));
    }
    
    next(error);
  }
};

export const logoutController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // In production, invalidate refresh token in database
    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
    };
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Forgot password controller
const forgotSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

export const forgotPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = forgotSchema.parse(req.body);
    // Service will not reveal whether user exists
    await import('./auth.service').then((mod) => mod.forgotPassword(email));

    const response: ApiResponse = {
      success: true,
      message: 'If the email exists, a reset link has been sent',
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Reset password controller
const resetSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params as { token: string };
    const { newPassword } = resetSchema.parse(req.body);

    await import('./auth.service').then((mod) => mod.resetPassword(token, newPassword));

    const response: ApiResponse = {
      success: true,
      message: 'Password has been reset successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

