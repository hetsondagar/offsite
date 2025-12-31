import { Request, Response, NextFunction } from 'express';
import { User } from './user.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const user = await User.findById(req.user.userId)
      .populate('assignedProjects', 'name location')
      .select('-__v');

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'User retrieved successfully',
      data: user,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate('assignedProjects', 'name location')
      .select('-__v');

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'User retrieved successfully',
      data: user,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

