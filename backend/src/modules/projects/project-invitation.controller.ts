import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ProjectInvitation } from './project-invitation.model';
import { Project } from './project.model';
import { User } from '../users/user.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { createNotification } from '../notifications/notification.service';
import { logger } from '../../utils/logger';

/**
 * Get pending invitations for the authenticated user
 */
export const getMyInvitations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    // Convert userId to ObjectId for proper matching
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    const invitations = await ProjectInvitation.find({
      userId: userId,
      status: 'pending',
    })
      .populate('projectId', 'name location startDate endDate')
      .populate('invitedBy', 'name offsiteId')
      .sort({ createdAt: -1 })
      .select('-__v');
    
    logger.info(`Found ${invitations.length} pending invitations for user ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Invitations retrieved successfully',
      data: invitations,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Accept a project invitation
 */
export const acceptInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    // Find invitation - ensure userId matches using ObjectId
    const invitation = await ProjectInvitation.findOne({
      _id: id,
      userId: userId,
      status: 'pending',
    }).populate('projectId');

    if (!invitation) {
      throw new AppError('Invitation not found or already processed', 404, 'INVITATION_NOT_FOUND');
    }

    logger.info(`Processing invitation acceptance: ${id} for user ${req.user.userId}`);

    // Get project
    const project = await Project.findById(invitation.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Convert projectId to ObjectId for comparison
    const projectId = new mongoose.Types.ObjectId(project._id);

    // Check if user is already a member
    const isAlreadyMember = project.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (isAlreadyMember) {
      logger.warn(`User ${req.user.userId} is already a member of project ${project._id}`);
      // Still update invitation status
      invitation.status = 'accepted';
      invitation.respondedAt = new Date();
      await invitation.save();

      const response: ApiResponse = {
        success: true,
        message: 'You are already a member of this project',
        data: invitation,
      };
      res.status(200).json(response);
      return;
    }

    // Add user to project members using $addToSet to prevent duplicates
    await Project.findByIdAndUpdate(projectId, {
      $addToSet: { members: userId },
    });

    // Update user's assignedProjects using $addToSet to prevent duplicates
    await User.findByIdAndUpdate(userId, {
      $addToSet: { assignedProjects: projectId },
    });

    // Update invitation status
    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    await invitation.save();

    logger.info(`Invitation accepted: ${id} by user ${req.user.userId}. User added to project ${project._id}`);

    // Send notification to project owner (optional)
    try {
      const ownerId = (project as any).owner ?? project.members[0];
      const projectOwner = ownerId ? await User.findById(ownerId) : null;
      if (projectOwner && projectOwner._id.toString() !== userId.toString()) {
        await createNotification({
          userId: projectOwner._id.toString(),
          offsiteId: projectOwner.offsiteId,
          type: 'project_update',
          title: 'Project Member Joined',
          message: `A ${invitation.role === 'engineer' ? 'Site Engineer' : 'Project Manager'} has accepted the invitation to join "${project.name}".`,
          data: {
            projectId: project._id.toString(),
            projectName: project.name,
            invitationId: invitation._id.toString(),
          },
        });
      }
    } catch (notifError: any) {
      logger.warn('Failed to send notification to project owner:', notifError.message);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Invitation accepted successfully. You have been added to the project.',
      data: {
        invitation,
        project: {
          _id: project._id,
          name: project.name,
          location: project.location,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a project invitation
 */
export const rejectInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const invitation = await ProjectInvitation.findOne({
      _id: id,
      userId: req.user.userId,
      status: 'pending',
    });

    if (!invitation) {
      throw new AppError('Invitation not found or already processed', 404, 'INVITATION_NOT_FOUND');
    }

    // Update invitation status
    invitation.status = 'rejected';
    invitation.respondedAt = new Date();
    await invitation.save();

    logger.info(`Invitation rejected: ${id} by user ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Invitation rejected successfully',
      data: invitation,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

