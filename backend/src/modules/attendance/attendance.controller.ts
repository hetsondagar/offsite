import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Attendance } from './attendance.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

const checkInSchema = z.object({
  projectId: z.string(),
  location: z.string().min(1).max(500),
});

const checkOutSchema = z.object({
  projectId: z.string(),
});

export const checkIn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId, location } = checkInSchema.parse(req.body);

    // Check if user already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingCheckIn = await Attendance.findOne({
      userId: req.user.userId,
      projectId,
      type: 'checkin',
      timestamp: { $gte: today, $lt: tomorrow },
    });

    if (existingCheckIn) {
      throw new AppError('Already checked in today', 400, 'ALREADY_CHECKED_IN');
    }

    const attendance = new Attendance({
      userId: req.user.userId,
      projectId,
      type: 'checkin',
      location,
      timestamp: new Date(),
      synced: true,
    });

    await attendance.save();
    await attendance.populate('userId', 'name phone');
    await attendance.populate('projectId', 'name');

    const response: ApiResponse = {
      success: true,
      message: 'Checked in successfully',
      data: attendance,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = checkOutSchema.parse(req.body);

    const attendance = new Attendance({
      userId: req.user.userId,
      projectId,
      type: 'checkout',
      location: 'Same as check-in', // In production, get from GPS
      timestamp: new Date(),
      synced: true,
    });

    await attendance.save();
    await attendance.populate('userId', 'name phone');
    await attendance.populate('projectId', 'name');

    const response: ApiResponse = {
      success: true,
      message: 'Checked out successfully',
      data: attendance,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceByProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = { projectId };
    if (req.user.role === 'engineer') {
      query.userId = req.user.userId;
    }

    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .populate('userId', 'name phone')
        .populate('projectId', 'name')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Attendance.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Attendance retrieved successfully',
      data: {
        attendance,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

