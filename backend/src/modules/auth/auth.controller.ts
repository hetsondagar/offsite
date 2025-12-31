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
  role: z.enum(['engineer', 'manager', 'owner']),
  phone: z.string().optional(),
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
  } catch (error) {
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
    const result = await signup(email, password, name, role, phone);
    
    const response: ApiResponse = {
      success: true,
      message: 'User created successfully',
      data: result,
    };
    
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (
  req: Request,
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

