import { Request, Response, NextFunction } from 'express';
import { StockLedger } from './stock-ledger.model';
import { Project } from '../projects/project.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import mongoose from 'mongoose';

/**
 * Get current stock balance per material for a project
 */
export const getProjectStock = async (
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

    // Authorization: Owners can access any project, others must be members
    if (req.user.role !== 'owner') {
      const isMember = project.members.some(
        (memberId) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('Access denied. You must be a member of this project.', 403, 'FORBIDDEN');
      }
    }

    // Aggregate stock balance
    const stockBalance = await StockLedger.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
        },
      },
      {
        $group: {
          _id: {
            materialId: '$materialId',
            materialName: '$materialName',
            unit: '$unit',
          },
          totalIn: {
            $sum: {
              $cond: [{ $eq: ['$type', 'IN'] }, '$quantity', 0],
            },
          },
          totalOut: {
            $sum: {
              $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          materialId: '$_id.materialId',
          materialName: '$_id.materialName',
          unit: '$_id.unit',
          balance: { $subtract: ['$totalIn', '$totalOut'] },
          totalIn: 1,
          totalOut: 1,
        },
      },
      {
        $sort: { materialName: 1 },
      },
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Stock balance retrieved successfully',
      data: {
        stock: stockBalance,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock alerts (negative or abnormal stock)
 */
export const getStockAlerts = async (
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

    // Authorization: Owners can access any project, others must be members
    if (req.user.role !== 'owner') {
      const isMember = project.members.some(
        (memberId) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('Access denied. You must be a member of this project.', 403, 'FORBIDDEN');
      }
    }

    // Aggregate stock balance
    const stockBalance = await StockLedger.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
        },
      },
      {
        $group: {
          _id: {
            materialId: '$materialId',
            materialName: '$materialName',
            unit: '$unit',
          },
          totalIn: {
            $sum: {
              $cond: [{ $eq: ['$type', 'IN'] }, '$quantity', 0],
            },
          },
          totalOut: {
            $sum: {
              $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          materialId: '$_id.materialId',
          materialName: '$_id.materialName',
          unit: '$_id.unit',
          balance: { $subtract: ['$totalIn', '$totalOut'] },
          totalIn: 1,
          totalOut: 1,
        },
      },
    ]);

    // Filter for alerts: negative balance or abnormal usage (OUT > IN * 1.2)
    const alerts = stockBalance.filter((item) => {
      const isNegative = item.balance < 0;
      const isAbnormal = item.totalOut > item.totalIn * 1.2 && item.totalIn > 0;
      return isNegative || isAbnormal;
    });

    const response: ApiResponse = {
      success: true,
      message: 'Stock alerts retrieved successfully',
      data: {
        alerts,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
