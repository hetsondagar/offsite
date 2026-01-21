import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Event } from './event.model';
import { Project } from '../projects/project.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

const createEventSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['meeting', 'inspection', 'delivery', 'safety', 'maintenance', 'other']),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  reminders: z.array(z.string()).transform((arr) => arr.map(str => new Date(str))).optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(['meeting', 'inspection', 'delivery', 'safety', 'maintenance', 'other']).optional(),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
});

export const createEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const data = createEventSchema.parse(req.body);

    // Verify project exists and user has access
    const project = await Project.findById(data.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Authorization: Owners can create events for any project, others must be members
    if (req.user.role !== 'owner') {
      const isMember = project.members.some(
        (memberId) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('You are not a member of this project', 403, 'FORBIDDEN');
      }
    }

    const event = new Event({
      ...data,
      createdBy: req.user.userId,
      status: 'scheduled',
    });

    await event.save();
    await event.populate('projectId', 'name');
    await event.populate('createdBy', 'name email');
    await event.populate('attendees', 'name email');

    const response: ApiResponse = {
      success: true,
      message: 'Event created successfully',
      data: event,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};
    
    // Role-based filtering
    if (req.user.role === 'owner') {
      // Owners can see all events
      if (projectId) {
        query.projectId = projectId;
      }
    } else {
      // Managers and engineers can only see events from projects they are members of
      const userProjects = await Project.find({
        members: new mongoose.Types.ObjectId(req.user.userId),
      }).select('_id');
      const projectIds = userProjects.map(p => p._id);
      
      if (projectIds.length === 0) {
        // No projects assigned, return empty result
        const response: ApiResponse = {
          success: true,
          message: 'Events retrieved successfully',
          data: {
            events: [],
            pagination: {
              page,
              limit,
              total: 0,
              pages: 0,
            },
          },
        };
        res.status(200).json(response);
        return;
      }
      
      // If projectId is provided, verify it's in the user's projects
      if (projectId) {
        const requestedProjectId = new mongoose.Types.ObjectId(projectId as string);
        const hasAccess = projectIds.some(id => id.toString() === requestedProjectId.toString());
        if (!hasAccess) {
          throw new AppError('Access denied. You are not a member of this project.', 403, 'FORBIDDEN');
        }
        query.projectId = requestedProjectId;
      } else {
        query.projectId = { $in: projectIds };
      }
    }

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate('projectId', 'name')
        .populate('createdBy', 'name email')
        .populate('attendees', 'name email')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Event.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Events retrieved successfully',
      data: {
        events,
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

export const getEventById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id)
      .populate('projectId', 'name location members')
      .populate('createdBy', 'name email phone')
      .populate('attendees', 'name email phone')
      .select('-__v');

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    // Verify user has access to the project
    const project = event.projectId as any;
    if (req.user.role !== 'owner') {
      const isMember = project?.members?.some(
        (memberId: any) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('Access denied. You are not a member of this project.', 403, 'FORBIDDEN');
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Event retrieved successfully',
      data: event,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const data = updateEventSchema.parse(req.body);

    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const event = await Event.findById(id).populate('projectId', 'members');

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    // Verify user has access to the project
    const project = event.projectId as any;
    if (req.user.role !== 'owner') {
      const isMember = project?.members?.some(
        (memberId: any) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('Access denied. You are not a member of this project.', 403, 'FORBIDDEN');
      }
    }

    Object.assign(event, data);
    await event.save();
    await event.populate('projectId', 'name');
    await event.populate('createdBy', 'name email');
    await event.populate('attendees', 'name email');

    const response: ApiResponse = {
      success: true,
      message: 'Event updated successfully',
      data: event,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const event = await Event.findById(id).populate('projectId', 'members');

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    // Verify user has access to the project
    const project = event.projectId as any;
    if (req.user.role !== 'owner') {
      const isMember = project?.members?.some(
        (memberId: any) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('Access denied. You are not a member of this project.', 403, 'FORBIDDEN');
      }
    }

    await Event.findByIdAndDelete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Event deleted successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

