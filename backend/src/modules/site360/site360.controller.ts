import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import fs from 'fs';
import { Site360Node } from './site360.model';
import { Project } from '../projects/project.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';
import { cloudinary } from '../../config/cloudinary';
import {
  ensureUploadsDirectory,
  getNodesByProject,
  getNodeById,
  createBidirectionalConnection,
} from './site360.service';

const createNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  zoneName: z.string().min(1, 'Zone name is required'),
  connectToNodeId: z.string().optional(),
  forwardLabel: z.string().optional().default('Go Forward'),
  backLabel: z.string().optional().default('Go Back'),
});

/**
 * Create a new Site360 node (Engineer only)
 */
export const createNode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'engineer') {
      throw new AppError('Only engineers can upload Site360 panoramas', 403, 'FORBIDDEN');
    }

    const data = createNodeSchema.parse(req.body);
    const file = req.file;

    if (!file) {
      throw new AppError('Panorama image is required', 400, 'MISSING_FILE');
    }

    // Verify project exists and user is a member
    const project = await Project.findById(data.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user!.userId
    );
    if (!isMember) {
      throw new AppError('You are not a member of this project', 403, 'FORBIDDEN');
    }

    // Ensure uploads directory exists
    ensureUploadsDirectory();

    // File is already saved by multer, get the filename
    // Prefer Cloudinary (persistent for production) but keep a local fallback for dev.
    let imageUrl = `/uploads/site360/${file.filename}`;

    try {
      if (file.path) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'offsite/site360',
          resource_type: 'image',
        });

        if (result?.secure_url) {
          imageUrl = result.secure_url;
          // Cleanup local file if Cloudinary upload succeeded
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            // ignore cleanup failures
          }
        }
      }
    } catch (e: any) {
      logger.warn(`Cloudinary upload failed for Site360 panorama; using local uploads fallback: ${e?.message || e}`);
    }

    // Create node
    const node = new Site360Node({
      projectId: data.projectId,
      zoneName: data.zoneName,
      imageUrl,
      uploadedBy: req.user.userId,
      connections: [],
    });

    await node.save();

    // If connecting to existing node, create bidirectional connection
    if (data.connectToNodeId) {
      try {
        await createBidirectionalConnection(
          data.connectToNodeId,
          node._id.toString(),
          data.forwardLabel,
          data.backLabel
        );
        // Reload node to get updated connections
        await node.populate('connections.targetNodeId', 'zoneName imageUrl');
      } catch (error: any) {
        logger.warn(`Failed to create connection: ${error.message}`);
        // Continue even if connection fails
      }
    }

    await node.populate('uploadedBy', 'name email offsiteId');
    await node.populate('projectId', 'name location');

    logger.info(`Site360 node created: ${node._id} by ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Site360 node created successfully',
      data: node,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all nodes for a project
 */
export const getProjectNodes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.params;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Check access: owner, manager, or engineer member
    if (req.user.role === 'engineer') {
      const isMember = project.members.some(
        (memberId) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('You are not a member of this project', 403, 'FORBIDDEN');
      }
    } else if (req.user.role !== 'owner' && req.user.role !== 'manager') {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const nodes = await getNodesByProject(projectId);

    const response: ApiResponse = {
      success: true,
      message: 'Site360 nodes retrieved successfully',
      data: nodes,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get node by ID with connections
 */
export const getNode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { nodeId } = req.params;

    const node = await getNodeById(nodeId);
    if (!node) {
      throw new AppError('Site360 node not found', 404, 'NODE_NOT_FOUND');
    }

    // Verify user has access to the project
    const project = await Project.findById(node.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    if (req.user.role === 'engineer') {
      const isMember = project.members.some(
        (memberId) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    } else if (req.user.role !== 'owner' && req.user.role !== 'manager') {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Site360 node retrieved successfully',
      data: node,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
