import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { login, verifyOTPAndLogin, signup } from './auth.service';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

const loginSchema = z.object({
  phone: z.string().min(10).max(15),
});

const verifyOTPSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
  role: z.enum(['engineer', 'manager', 'owner']).optional(),
});

const signupSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().min(2).max(100),
  role: z.enum(['engineer', 'manager', 'owner']),
});

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone } = loginSchema.parse(req.body);
    const result = await login(phone);
    
    const response: ApiResponse = {
      success: true,
      message: 'OTP sent successfully',
      data: result,
    };
    
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const verifyOTPController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { phone, otp, role } = verifyOTPSchema.parse(req.body);
    const result = await verifyOTPAndLogin(phone, otp, role);
    
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
    const { phone, name, role } = signupSchema.parse(req.body);
    const result = await signup(phone, name, role);
    
    const response: ApiResponse = {
      success: true,
      message: 'User created. OTP sent successfully',
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

