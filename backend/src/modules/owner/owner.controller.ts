import { Request, Response, NextFunction } from 'express';
import { Project } from '../projects/project.model';
import { Task } from '../tasks/task.model';
import { Invoice } from '../invoices/invoice.model';
import { calculateProjectHealthScore } from '../../utils/siteHealth';
import { predictDelayRisk } from '../../utils/delayPredictor';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

/**
 * Get consolidated owner overview for a project
 */
export const getOwnerOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can access this endpoint', 403, 'FORBIDDEN');
    }

    const { projectId } = req.params;

    // Get project
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Calculate project progress
    const tasks = await Task.find({ projectId });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate health score
    const healthScore = await calculateProjectHealthScore(projectId);

    // Get invoice data
    const invoices = await Invoice.find({ projectId });
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const paidInvoices = invoices.filter((inv) => inv.paymentStatus === 'PAID');
    const unpaidInvoices = invoices.filter((inv) => inv.paymentStatus !== 'PAID');
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    // Calculate delay risk
    const delayRisk = await predictDelayRisk(projectId, project.name);

    // Calculate timeline
    const startDate = new Date(project.startDate);
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const now = new Date();
    const elapsedDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const plannedDays = endDate
      ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const response: ApiResponse = {
      success: true,
      message: 'Owner overview retrieved successfully',
      data: {
        projectId: project._id.toString(),
        projectName: project.name,
        progress: Math.round(progress * 100) / 100,
        healthScore: Math.round(healthScore * 100) / 100,
        invoicing: {
          totalInvoiced: Math.round(totalInvoiced * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalUnpaid: Math.round(totalUnpaid * 100) / 100,
          invoiceCount: invoices.length,
        },
        delayRisk: {
          level: delayRisk.risk,
          probability: delayRisk.probability,
          impact: delayRisk.impact,
          cause: delayRisk.cause,
        },
        timeline: {
          startDate: project.startDate,
          endDate: project.endDate || null,
          elapsedDays,
          plannedDays,
          isOverdue: endDate ? now > endDate : false,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
