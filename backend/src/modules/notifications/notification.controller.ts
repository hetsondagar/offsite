import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Notification } from './notification.model';
import { createNotification, createBulkNotifications, markAsRead, markAllAsRead } from './notification.service';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { User } from '../users/user.model';

const createNotificationSchema = z.object({
  userId: z.string().optional(),
  offsiteId: z.string().optional(),
  type: z.enum([
    'material_request',
    'material_approved',
    'material_rejected',
    'dpr_submitted',
    'task_assigned',
    'task_completed',
    'attendance_reminder',
    'project_update',
    'system_alert',
    'general',
  ]),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  data: z.record(z.any()).optional(),
});

const createBulkNotificationSchema = z.object({
  userIds: z.array(z.string()).optional(),
  offsiteIds: z.array(z.string()).optional(),
  type: z.enum([
    'material_request',
    'material_approved',
    'material_rejected',
    'dpr_submitted',
    'task_assigned',
    'task_completed',
    'attendance_reminder',
    'project_update',
    'system_alert',
    'general',
  ]),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  data: z.record(z.any()).optional(),
});

/**
 * Get all notifications for the authenticated user
 */
export const getMyNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true';

    const query: any = { userId: req.user.userId };
    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: req.user.userId, read: false }),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a notification (admin/managers can send to users)
 */
export const createNotificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const data = createNotificationSchema.parse(req.body);
    await createNotification(data);

    const response: ApiResponse = {
      success: true,
      message: 'Notification created successfully',
    };

    res.status(201).json(response);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return next(new AppError(`Validation error: ${errorMessages}`, 400, 'VALIDATION_ERROR'));
    }
    next(error);
  }
};

/**
 * Create bulk notifications
 */
export const createBulkNotificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const data = createBulkNotificationSchema.parse(req.body);
    await createBulkNotifications(data);

    const response: ApiResponse = {
      success: true,
      message: 'Bulk notifications created successfully',
    };

    res.status(201).json(response);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return next(new AppError(`Validation error: ${errorMessages}`, 400, 'VALIDATION_ERROR'));
    }
    next(error);
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    await markAsRead(id, req.user.userId);

    const response: ApiResponse = {
      success: true,
      message: 'Notification marked as read',
    };

    res.status(200).json(response);
  } catch (error: any) {
    if (error.message === 'Notification not found or unauthorized') {
      return next(new AppError(error.message, 404, 'NOTIFICATION_NOT_FOUND'));
    }
    next(error);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    await markAllAsRead(req.user.userId);

    const response: ApiResponse = {
      success: true,
      message: 'All notifications marked as read',
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Search users by OffSite ID
 */
export const searchUserByOffsiteId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { offsiteId } = req.query;

    if (!offsiteId || typeof offsiteId !== 'string') {
      throw new AppError('OffSite ID is required', 400, 'VALIDATION_ERROR');
    }

    const user = await User.findOne({ offsiteId: offsiteId.trim() })
      .select('-password -__v')
      .populate('assignedProjects', 'name location');

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

