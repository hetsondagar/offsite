import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Tool, generateToolId } from './tool.model';
import { User } from '../users/user.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';

const createToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
});

const issueToolSchema = z.object({
  workerId: z.string().optional(), // Optional for labour assignments
  labourName: z.string().optional(), // For labour assignments
  projectId: z.string(),
  notes: z.string().optional(),
});

const returnToolSchema = z.object({
  notes: z.string().optional(),
});

/**
 * Create a new tool
 */
export const createTool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const data = createToolSchema.parse(req.body);
    const toolId = await generateToolId();

    const tool = new Tool({
      toolId,
      name: data.name,
      description: data.description,
      category: data.category,
      status: 'AVAILABLE',
      history: [],
      createdBy: req.user.userId,
    });

    await tool.save();

    logger.info(`Tool created: ${toolId} by ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Tool created successfully',
      data: tool,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all tools
 */
export const getAllTools = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const status = req.query.status as string;
    const category = req.query.category as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status && ['AVAILABLE', 'ISSUED'].includes(status)) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }

    const [tools, total] = await Promise.all([
      Tool.find(query)
        .populate('currentHolderWorkerId', 'name phone offsiteId')
        .populate('currentProjectId', 'name location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tool.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Tools retrieved successfully',
      data: {
        tools,
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

/**
 * Issue tool to a worker
 */
export const issueTool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { toolId } = req.params;
    const data = issueToolSchema.parse(req.body);

    const tool = await Tool.findOne({ toolId: toolId.toUpperCase() });
    if (!tool) {
      throw new AppError('Tool not found', 404, 'NOT_FOUND');
    }

    if (tool.status === 'ISSUED') {
      throw new AppError('Tool is already issued', 400, 'ALREADY_ISSUED');
    }

    // Validate: either workerId or labourName must be provided
    if (!data.workerId && !data.labourName) {
      throw new AppError('Either workerId or labourName must be provided', 400, 'VALIDATION_ERROR');
    }

    let holderName = '';
    let workerId: any = undefined;

    if (data.labourName) {
      // Labour assignment
      holderName = data.labourName;
      tool.currentLabourName = data.labourName;
    } else if (data.workerId) {
      // Worker assignment
      const worker = await User.findById(data.workerId).select('name');
      if (!worker) {
        throw new AppError('Worker not found', 404, 'WORKER_NOT_FOUND');
      }
      holderName = worker.name;
      workerId = data.workerId;
      tool.currentHolderWorkerId = data.workerId as any;
      tool.currentHolderName = worker.name;
    }

    // Update tool
    tool.status = 'ISSUED';
    tool.currentProjectId = data.projectId as any;
    tool.issuedAt = new Date();

    // Add to history
    tool.history.push({
      action: 'ISSUED',
      workerId: workerId,
      workerName: holderName,
      labourName: data.labourName,
      projectId: data.projectId as any,
      timestamp: new Date(),
      notes: data.notes,
    });

    await tool.save();

    logger.info(`Tool issued: ${toolId} to ${worker.name}`);

    const response: ApiResponse = {
      success: true,
      message: 'Tool issued successfully',
      data: tool,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Return a tool
 */
export const returnTool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { toolId } = req.params;
    const data = returnToolSchema.parse(req.body);

    const tool = await Tool.findOne({ toolId: toolId.toUpperCase() });
    if (!tool) {
      throw new AppError('Tool not found', 404, 'NOT_FOUND');
    }

    if (tool.status === 'AVAILABLE') {
      throw new AppError('Tool is not currently issued', 400, 'NOT_ISSUED');
    }

    // Add to history before clearing
    if (tool.currentProjectId) {
      tool.history.push({
        action: 'RETURNED',
        workerId: tool.currentHolderWorkerId,
        workerName: tool.currentHolderName || tool.currentLabourName || 'Unknown',
        labourName: tool.currentLabourName,
        projectId: tool.currentProjectId,
        timestamp: new Date(),
        notes: data.notes,
      });
    }

    // Clear issue info
    tool.status = 'AVAILABLE';
    tool.currentHolderWorkerId = undefined;
    tool.currentHolderName = undefined;
    tool.currentLabourName = undefined;
    tool.currentProjectId = undefined;
    tool.issuedAt = undefined;

    await tool.save();

    logger.info(`Tool returned: ${toolId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Tool returned successfully',
      data: tool,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get tool history
 */
export const getToolHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { toolId } = req.params;

    const tool = await Tool.findOne({ toolId: toolId.toUpperCase() })
      .populate('createdBy', 'name offsiteId');

    if (!tool) {
      throw new AppError('Tool not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Tool history retrieved successfully',
      data: {
        tool: {
          toolId: tool.toolId,
          name: tool.name,
          description: tool.description,
          category: tool.category,
          status: tool.status,
          createdBy: tool.createdBy,
          createdAt: tool.createdAt,
        },
        history: tool.history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a tool (only if available)
 */
export const deleteTool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner' && req.user.role !== 'manager') {
      throw new AppError('Only managers and owners can delete tools', 403, 'FORBIDDEN');
    }

    const { toolId } = req.params;

    const tool = await Tool.findOne({ toolId: toolId.toUpperCase() });
    if (!tool) {
      throw new AppError('Tool not found', 404, 'NOT_FOUND');
    }

    if (tool.status === 'ISSUED') {
      throw new AppError('Cannot delete issued tool. Return it first.', 400, 'TOOL_ISSUED');
    }

    await tool.deleteOne();

    logger.info(`Tool deleted: ${toolId} by ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Tool deleted successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
