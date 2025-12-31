import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Event } from './event.model';
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
    if (projectId) {
      query.projectId = projectId;
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
      .populate('projectId', 'name location')
      .populate('createdBy', 'name email phone')
      .populate('attendees', 'name email phone')
      .select('-__v');

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
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

    const event = await Event.findById(id);

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
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

    const event = await Event.findById(id);

    if (!event) {
      throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
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

