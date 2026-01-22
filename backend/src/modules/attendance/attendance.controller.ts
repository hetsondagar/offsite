import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Attendance } from './attendance.model';
import { Project } from '../projects/project.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { reverseGeocode } from '../../services/maptiler.service';
import { logger } from '../../utils/logger';
import { calculateDistance } from '../../utils/calculateDistance';

const checkInSchema = z.object({
  projectId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  location: z.string().optional(), // Optional fallback address
});

const checkOutSchema = z.object({
  projectId: z.string(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
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

    const { projectId, latitude, longitude, location: fallbackLocation } = checkInSchema.parse(req.body);

    // Validate geofence if project has geofence data
    const project = await Project.findById(projectId);
    if (project && project.siteLatitude && project.siteLongitude && project.siteRadiusMeters) {
      const distance = calculateDistance(
        latitude,
        longitude,
        project.siteLatitude,
        project.siteLongitude
      );

      if (distance > project.siteRadiusMeters) {
        throw new AppError(
          `You are ${Math.round(distance)} meters away from the project site. Please be within ${project.siteRadiusMeters} meters to check in.`,
          400,
          'OUTSIDE_GEOFENCE'
        );
      }
    }

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

    // Get address from coordinates using MapTiler
    let locationAddress = fallbackLocation || 'Location not available';
    try {
      const geocodeResult = await reverseGeocode(latitude, longitude);
      locationAddress = geocodeResult.formattedAddress || geocodeResult.address || locationAddress;
      logger.info(`Reverse geocoded location for user ${req.user.userId}: ${locationAddress}`);
    } catch (geocodeError: any) {
      logger.warn(`Failed to reverse geocode location: ${geocodeError.message}`);
      // Use fallback location if geocoding fails
    }

    const attendance = new Attendance({
      userId: req.user.userId,
      projectId,
      type: 'checkin',
      location: locationAddress,
      latitude,
      longitude,
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

    const { projectId, latitude, longitude } = checkOutSchema.parse(req.body);

    // Verify project exists and user is a member
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Verify user is a member of the project (engineers must be members to mark attendance)
    if (req.user.role === 'engineer') {
      const isMember = project.members.some(
        (memberId) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('You are not a member of this project', 403, 'FORBIDDEN');
      }
    }

    // Validate geofence if project has geofence data and coordinates are provided
    if (latitude && longitude) {
      if (project.siteLatitude && project.siteLongitude && project.siteRadiusMeters) {
        const distance = calculateDistance(
          latitude,
          longitude,
          project.siteLatitude,
          project.siteLongitude
        );

        if (distance > project.siteRadiusMeters) {
          throw new AppError(
            `You are ${Math.round(distance)} meters away from the project site. Please be within ${project.siteRadiusMeters} meters to check out.`,
            400,
            'OUTSIDE_GEOFENCE'
          );
        }
      }
    }

    // Get today's check-in to use same location if coordinates not provided
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCheckIn = await Attendance.findOne({
      userId: req.user.userId,
      projectId,
      type: 'checkin',
      timestamp: { $gte: today, $lt: tomorrow },
    });

    let locationAddress = 'Location not available';
    let checkoutLatitude: number | undefined;
    let checkoutLongitude: number | undefined;

    if (latitude && longitude) {
      // Get address from coordinates using MapTiler
      try {
        const geocodeResult = await reverseGeocode(latitude, longitude);
        locationAddress = geocodeResult.formattedAddress || geocodeResult.address || locationAddress;
        checkoutLatitude = latitude;
        checkoutLongitude = longitude;
        logger.info(`Reverse geocoded checkout location for user ${req.user.userId}: ${locationAddress}`);
      } catch (geocodeError: any) {
        logger.warn(`Failed to reverse geocode checkout location: ${geocodeError.message}`);
      }
    } else if (todayCheckIn) {
      // Use check-in location if coordinates not provided
      locationAddress = todayCheckIn.location || 'Same as check-in';
      checkoutLatitude = todayCheckIn.latitude;
      checkoutLongitude = todayCheckIn.longitude;
    }

    const attendance = new Attendance({
      userId: req.user.userId,
      projectId,
      type: 'checkout',
      location: locationAddress,
      latitude: checkoutLatitude,
      longitude: checkoutLongitude,
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

export const getTodayCheckIn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's check-in for the user (any project)
    const todayCheckIn = await Attendance.findOne({
      userId: req.user.userId,
      type: 'checkin',
      timestamp: { $gte: today, $lt: tomorrow },
    })
      .populate('projectId', 'name')
      .sort({ timestamp: -1 })
      .select('-__v');

    // Check if there's a corresponding checkout
    let todayCheckOut = null;
    if (todayCheckIn) {
      todayCheckOut = await Attendance.findOne({
        userId: req.user.userId,
        projectId: todayCheckIn.projectId,
        type: 'checkout',
        timestamp: { $gte: todayCheckIn.timestamp, $lt: tomorrow },
      })
        .select('-__v');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Today\'s check-in status retrieved successfully',
      data: {
        checkIn: todayCheckIn,
        checkOut: todayCheckOut,
        isCheckedIn: !!todayCheckIn && !todayCheckOut,
      },
    };

    res.status(200).json(response);
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

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Authorization: Owners can access any project, others must be members
    if (req.user.role !== 'owner') {
      const isMember = project.members.some(
        (memberId) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('Access denied. You must be a member of this project.', 403, 'FORBIDDEN');
      }
    }

    const query: any = { projectId };
    if (req.user.role === 'engineer') {
      // Engineers can only see their own attendance
      query.userId = req.user.userId;
    }
    // Managers and owners can see all attendance for the project (already verified membership above)

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

