import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Task } from './task.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

const createTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().transform((str) => new Date(str)).optional(),
});

const updateTaskStatusSchema = z.object({
  status: z.enum(['pending', 'in-progress', 'completed']),
});

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const data = createTaskSchema.parse(req.body);

    const task = new Task({
      ...data,
      assignedTo: data.assignedTo || req.user.userId,
      status: 'pending',
    });

    await task.save();
    await task.populate('assignedTo', 'name phone');
    await task.populate('projectId', 'name');

    const response: ApiResponse = {
      success: true,
      message: 'Task created successfully',
      data: task,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = updateTaskStatusSchema.parse(req.body);

    const task = await Task.findById(id);

    if (!task) {
      throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
    }

    task.status = status;
    await task.save();
    await task.populate('assignedTo', 'name phone');
    await task.populate('projectId', 'name');

    const response: ApiResponse = {
      success: true,
      message: 'Task status updated successfully',
      data: task,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

