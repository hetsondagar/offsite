import fs from 'fs';
import path from 'path';
import { Site360Node, ISite360Node } from './site360.model';
import { logger } from '../../utils/logger';

/**
 * Ensure uploads directory exists
 */
export const ensureUploadsDirectory = (): void => {
  const uploadsDir = path.join(process.cwd(), 'backend', 'uploads', 'site360');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info(`Created uploads directory: ${uploadsDir}`);
  }
};

/**
 * Get all nodes for a project
 */
export const getNodesByProject = async (projectId: string): Promise<ISite360Node[]> => {
  return Site360Node.find({ projectId })
    .populate('uploadedBy', 'name email offsiteId')
    .populate('projectId', 'name location')
    .sort({ createdAt: 1 });
};

/**
 * Get node by ID with populated connections
 */
export const getNodeById = async (nodeId: string): Promise<ISite360Node | null> => {
  const node = await Site360Node.findById(nodeId)
    .populate('uploadedBy', 'name email offsiteId')
    .populate('projectId', 'name location')
    .populate('connections.targetNodeId', 'zoneName imageUrl');

  return node;
};

/**
 * Create bidirectional connection between two nodes
 */
export const createBidirectionalConnection = async (
  fromNodeId: string,
  toNodeId: string,
  forwardLabel: string = 'Go Forward',
  backLabel: string = 'Go Back'
): Promise<void> => {
  const fromNode = await Site360Node.findById(fromNodeId);
  const toNode = await Site360Node.findById(toNodeId);

  if (!fromNode || !toNode) {
    throw new Error('One or both nodes not found');
  }

  // Add forward connection (from -> to)
  const forwardConnectionExists = fromNode.connections.some(
    (conn) => conn.targetNodeId.toString() === toNodeId
  );
  if (!forwardConnectionExists) {
    fromNode.connections.push({
      label: forwardLabel,
      targetNodeId: toNode._id as any,
    });
    await fromNode.save();
  }

  // Add back connection (to -> from)
  const backConnectionExists = toNode.connections.some(
    (conn) => conn.targetNodeId.toString() === fromNodeId
  );
  if (!backConnectionExists) {
    toNode.connections.push({
      label: backLabel,
      targetNodeId: fromNode._id as any,
    });
    await toNode.save();
  }
};
