import { Request, Response, NextFunction } from 'express';
import { User } from './user.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
      .select('-__v -password');

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
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    // Users can only view their own profile unless they are owners
    if (req.user.role !== 'owner' && id !== req.user.userId) {
      throw new AppError('Access denied. You can only view your own profile.', 403, 'FORBIDDEN');
    }

    const user = await User.findById(id)
      .populate('assignedProjects', 'name location')
      .select('-__v -password');

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

/**
 * Update user profile
 * IMPORTANT: Prevents updates to offsiteId (immutable field)
 */
/**
 * Search user by OffSite ID
 */
export const getUserByOffsiteId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { offsiteId } = req.params;

    if (!offsiteId) {
      throw new AppError('OffSite ID is required', 400, 'VALIDATION_ERROR');
    }

    // Case-insensitive search for OffSite ID
    const user = await User.findOne({ 
      offsiteId: { $regex: new RegExp(`^${offsiteId.trim()}$`, 'i') }
    })
      .populate('assignedProjects', 'name location')
      .select('-__v -password');

    if (!user) {
      throw new AppError('User not found with this OffSite ID', 404, 'USER_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'User found successfully',
      data: user,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    // Prevent updates to offsiteId (immutable)
    if (req.body.offsiteId) {
      throw new AppError('OffSite ID cannot be modified', 403, 'IMMUTABLE_FIELD');
    }

    // Prevent updates to role (should be done by admin only)
    if (req.body.role) {
      throw new AppError('Role cannot be modified through this endpoint', 403, 'IMMUTABLE_FIELD');
    }

    // Only allow updating own profile
    const userId = req.user.userId;
    const { name, phone } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedProjects', 'name location')
      .select('-__v -password');

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'User updated successfully',
      data: user,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Search users (Owner only)
 * Supports filtering by role and partial matching on offsiteId/name/phone/email.
 * GET /api/users/search?q=...&role=contractor
 */
export const searchUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can search users', 403, 'FORBIDDEN');
    }

    const q = (req.query.q as string | undefined)?.trim() || '';
    const role = (req.query.role as string | undefined)?.trim();
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    if (!q || q.length < 2) {
      const response: ApiResponse = {
        success: true,
        message: 'No query provided',
        data: [],
      };
      res.status(200).json(response);
      return;
    }

    const rx = new RegExp(escapeRegex(q), 'i');
    const query: any = {
      $or: [
        { offsiteId: rx },
        { name: rx },
        { phone: rx },
        { email: rx },
      ],
    };
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('_id name email phone role offsiteId isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(limit);

    const response: ApiResponse = {
      success: true,
      message: 'Users retrieved successfully',
      data: users,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

