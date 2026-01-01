import { Request, Response, NextFunction } from 'express';
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

    const invitations = await ProjectInvitation.find({
      userId: req.user.userId,
      status: 'pending',
    })
      .populate('projectId', 'name location startDate endDate')
      .populate('invitedBy', 'name offsiteId')
      .sort({ createdAt: -1 })
      .select('-__v');

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

    const invitation = await ProjectInvitation.findOne({
      _id: id,
      userId: req.user.userId,
      status: 'pending',
    }).populate('projectId');

    if (!invitation) {
      throw new AppError('Invitation not found or already processed', 404, 'INVITATION_NOT_FOUND');
    }

    // Update invitation status
    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    await invitation.save();

    // Add user to project members
    const project = await Project.findById(invitation.projectId);
    if (project) {
      const memberId = req.user.userId;
      if (!project.members.includes(memberId as any)) {
        project.members.push(memberId as any);
        await project.save();
      }

      // Update user's assignedProjects
      await User.findByIdAndUpdate(memberId, {
        $addToSet: { assignedProjects: project._id },
      });
    }

    logger.info(`Invitation accepted: ${id} by user ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Invitation accepted successfully',
      data: invitation,
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

