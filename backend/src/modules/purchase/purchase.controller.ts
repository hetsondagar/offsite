import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PurchaseHistory } from './purchase-history.model';
import { MaterialRequest } from '../materials/material.model';
import { MaterialCatalog } from '../materials/material-catalog.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';
import { createNotification } from '../notifications/notification.service';
import { generatePurchaseInvoice as generateInvoice } from './purchase-invoice.service';

const sendMaterialSchema = z.object({
  gstRate: z.number().min(0).max(100).optional().default(18),
});

const receiveMaterialSchema = z.object({
  proofPhotoUrl: z.string().min(1, 'Proof photo is required for GRN'),
  geoLocation: z.string().optional(),
  latitude: z.number().min(-90).max(90, 'Valid GPS coordinates required for GRN'),
  longitude: z.number().min(-180).max(180, 'Valid GPS coordinates required for GRN'),
});

/**
 * Get approved material requests ready to be sent by Purchase Manager
 */
export const getApprovedRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'purchase_manager' && req.user.role !== 'owner') {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get approved material requests that haven't been sent yet
    // Only exclude requests that have been sent (status: SENT or RECEIVED)
    // PENDING_GRN requests should still show as they need to be sent
    // Optimize: Use lean() and only get IDs for better performance
    const sentRequestIds = await PurchaseHistory.find({
      status: { $in: ['SENT', 'RECEIVED'] }
    })
      .select('materialRequestId')
      .lean()
      .distinct('materialRequestId');
    
    const query: any = {
      status: 'approved',
    };
    
    // Only filter if there are sent requests (optimization)
    if (sentRequestIds.length > 0) {
      query._id = { $nin: sentRequestIds };
    }

    const [requests, total] = await Promise.all([
      MaterialRequest.find(query)
        .populate('requestedBy', 'name phone offsiteId')
        .populate('approvedBy', 'name phone offsiteId')
        .populate('projectId', 'name location')
        .sort({ approvedAt: -1 })
        .skip(skip)
        .limit(limit),
      MaterialRequest.countDocuments(query),
    ]);

    // Get catalog info for GST rates
    const materialIds = [...new Set(requests.map(r => r.materialId))];
    const catalogItems = await MaterialCatalog.find({ _id: { $in: materialIds } });
    const catalogMap = new Map(catalogItems.map(c => [c._id.toString(), c]));

    const requestsWithGst = requests.map(r => {
      const catalog = catalogMap.get(r.materialId);
      return {
        ...r.toObject(),
        gstRate: 18, // Default GST rate
        approxPriceINR: catalog?.approxPriceINR || 0,
      };
    });

    const response: ApiResponse = {
      success: true,
      message: 'Approved requests retrieved successfully',
      data: {
        requests: requestsWithGst,
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
 * Send materials - Purchase Manager marks material as sent
 */
export const sendMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'purchase_manager') {
      throw new AppError('Only Purchase Manager can send materials', 403, 'FORBIDDEN');
    }

    const { requestId } = req.params;
    const data = sendMaterialSchema.parse(req.body);

    // Get the material request
    const materialRequest = await MaterialRequest.findById(requestId)
      .populate('requestedBy', 'name phone offsiteId _id')
      .populate('projectId', 'name');

    if (!materialRequest) {
      throw new AppError('Material request not found', 404, 'NOT_FOUND');
    }

    if (materialRequest.status !== 'approved') {
      throw new AppError('Only approved requests can be sent', 400, 'INVALID_STATUS');
    }

    // Check if already sent
    const existingHistory = await PurchaseHistory.findOne({ materialRequestId: requestId });
    if (existingHistory) {
      throw new AppError('Material has already been sent', 400, 'ALREADY_SENT');
    }

    // Get catalog for pricing
    const catalog = await MaterialCatalog.findById(materialRequest.materialId);
    const basePrice = (catalog?.approxPriceINR || 0) * materialRequest.quantity;
    const gstAmount = basePrice * (data.gstRate / 100);
    const totalCost = basePrice + gstAmount;

    // Create purchase history entry with PENDING_GRN status
    // This will only be marked as RECEIVED after Engineer verifies with GRN
    const purchaseHistory = new PurchaseHistory({
      projectId: materialRequest.projectId,
      materialRequestId: materialRequest._id,
      materialId: materialRequest.materialId,
      materialName: materialRequest.materialName,
      qty: materialRequest.quantity,
      unit: materialRequest.unit,
      gstRate: data.gstRate,
      gstAmount,
      basePrice,
      totalCost,
      sentAt: new Date(),
      sentBy: req.user.userId,
      status: 'PENDING_GRN', // Changed: Now pending GRN verification
      grnGenerated: false,
    });

    await purchaseHistory.save();

    // Update material request status to 'sent' (pending GRN)
    materialRequest.status = 'sent' as any;
    await materialRequest.save();

    // Send notification to the requesting engineer
    const requester = materialRequest.requestedBy as any;
    if (requester && requester._id) {
      try {
        await createNotification({
          userId: requester._id.toString(),
          offsiteId: requester.offsiteId,
          type: 'material_sent',
          title: 'Materials Sent - GRN Required',
          message: `Purchase Manager has sent: ${materialRequest.materialName} (${materialRequest.quantity} ${materialRequest.unit}). Please verify receipt and generate GRN.`,
          data: {
            purchaseHistoryId: purchaseHistory._id.toString(),
            materialRequestId: materialRequest._id.toString(),
            projectId: (materialRequest.projectId as any)?._id?.toString() || (materialRequest.projectId as any)?.toString(),
            projectName: (materialRequest.projectId as any)?.name || 'Project',
            materialName: materialRequest.materialName,
            quantity: materialRequest.quantity,
            unit: materialRequest.unit,
          },
        });
        logger.info(`Notification sent to engineer ${requester._id} for material sent`);
      } catch (notifError: any) {
        logger.error('Failed to send notification to engineer:', notifError.message);
        // Don't fail the request if notification fails, but log it
      }
    } else {
      logger.warn(`Could not send notification: requester not found for request ${requestId}`);
    }

    logger.info(`Material sent: ${purchaseHistory._id} by ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Material sent successfully',
      data: purchaseHistory,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Receive materials - Engineer confirms receipt
 */
export const receiveMaterial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { historyId } = req.params;
    const data = receiveMaterialSchema.parse(req.body);

    const purchaseHistory = await PurchaseHistory.findById(historyId)
      .populate('sentBy', 'name offsiteId');

    if (!purchaseHistory) {
      throw new AppError('Purchase history not found', 404, 'NOT_FOUND');
    }

    if (purchaseHistory.status === 'RECEIVED') {
      throw new AppError('Material already received', 400, 'ALREADY_RECEIVED');
    }

    // Validate GRN requirements (photo and GPS are mandatory)
    if (!data.proofPhotoUrl) {
      throw new AppError('Proof photo is required for Goods Receipt Note (GRN)', 400, 'MISSING_PHOTO');
    }
    if (data.latitude === undefined || data.longitude === undefined) {
      throw new AppError('GPS coordinates are required for Goods Receipt Note (GRN)', 400, 'MISSING_GPS');
    }

    // Verify this is in PENDING_GRN status
    if (purchaseHistory.status !== 'PENDING_GRN' && purchaseHistory.status !== 'SENT') {
      throw new AppError('Material is not pending GRN verification', 400, 'INVALID_STATUS');
    }

    // Update to received with GRN verification
    purchaseHistory.status = 'RECEIVED';
    purchaseHistory.receivedAt = new Date();
    purchaseHistory.receivedBy = req.user.userId as any;
    purchaseHistory.proofPhotoUrl = data.proofPhotoUrl;
    purchaseHistory.grnGenerated = true;
    purchaseHistory.grnGeneratedAt = new Date();
    
    if (data.geoLocation) {
      purchaseHistory.geoLocation = data.geoLocation;
    }
    
    purchaseHistory.coordinates = {
      latitude: data.latitude,
      longitude: data.longitude,
    };

    await purchaseHistory.save();

    // Update material request status
    await MaterialRequest.findByIdAndUpdate(purchaseHistory.materialRequestId, {
      status: 'received',
    });

    // Generate purchase invoice after GRN verification
    try {
      await generateInvoice(purchaseHistory, req.user.userId);
      logger.info(`Purchase invoice generated for GRN ${historyId}`);
    } catch (invoiceError: any) {
      logger.warn(`Failed to generate purchase invoice: ${invoiceError.message}`);
      // Don't fail the GRN if invoice generation fails
    }

    // Notify Project Manager and Owner about GRN completion
    try {
      const { Project } = await import('../projects/project.model');
      const { User } = await import('../users/user.model');
      const project = await Project.findById(purchaseHistory.projectId).populate('owner', 'offsiteId');
      
      if (project) {
        // Notify Project Manager
        const projectManagers = await User.find({
          _id: { $in: project.members },
          role: 'manager',
        }).select('_id offsiteId name');
        
        for (const manager of projectManagers) {
          try {
            await createNotification({
              userId: manager._id.toString(),
              offsiteId: manager.offsiteId,
              type: 'material_received',
              title: 'GRN Generated - Material Received',
              message: `Engineer has confirmed receipt of ${purchaseHistory.materialName} (${purchaseHistory.qty} ${purchaseHistory.unit}) with GRN. Invoice generated.`,
              data: {
                purchaseHistoryId: purchaseHistory._id.toString(),
                projectId: project._id.toString(),
                projectName: project.name,
                materialName: purchaseHistory.materialName,
              },
            });
          } catch (notifError: any) {
            logger.warn(`Failed to notify manager ${manager._id}:`, notifError.message);
          }
        }

        // Notify Owner
        if (project.owner) {
          const owner = project.owner as any;
          try {
            await createNotification({
              userId: owner._id.toString(),
              offsiteId: owner.offsiteId,
              type: 'material_received',
              title: 'GRN Generated - Material Received',
              message: `Engineer has confirmed receipt of ${purchaseHistory.materialName} (${purchaseHistory.qty} ${purchaseHistory.unit}) with GRN. Invoice generated.`,
              data: {
                purchaseHistoryId: purchaseHistory._id.toString(),
                projectId: project._id.toString(),
                projectName: project.name,
                materialName: purchaseHistory.materialName,
              },
            });
          } catch (notifError: any) {
            logger.warn(`Failed to notify owner ${owner._id}:`, notifError.message);
          }
        }
      }
    } catch (notifError: any) {
      logger.warn(`Failed to send GRN completion notifications: ${notifError.message}`);
      // Don't fail the GRN if notifications fail
    }

    logger.info(`Material received with GRN: ${historyId} by ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Material received successfully',
      data: purchaseHistory,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get purchase history by project
 */
export const getHistoryByProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const query: any = { projectId };
    if (status && ['SENT', 'RECEIVED'].includes(status)) {
      query.status = status;
    }

    const [history, total] = await Promise.all([
      PurchaseHistory.find(query)
        .populate('sentBy', 'name phone offsiteId')
        .populate('receivedBy', 'name phone offsiteId')
        .populate('projectId', 'name location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PurchaseHistory.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Purchase history retrieved successfully',
      data: {
        history,
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
 * Get all sent materials for engineer to confirm
 */
export const getSentMaterialsForEngineer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get materials sent to projects the engineer is a member of
    const { Project } = await import('../projects/project.model');
    const engineerProjects = await Project.find({
      members: req.user.userId,
    }).select('_id');

    const projectIds = engineerProjects.map(p => p._id);

    const query = {
      projectId: { $in: projectIds },
      status: { $in: ['PENDING_GRN', 'SENT'] }, // Show both pending GRN and sent materials
    };

    const [history, total] = await Promise.all([
      PurchaseHistory.find(query)
        .populate('sentBy', 'name phone offsiteId')
        .populate('projectId', 'name location')
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit),
      PurchaseHistory.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Sent materials retrieved successfully',
      data: {
        history,
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
 * Get all purchase history for purchase manager
 */
export const getAllHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const query: any = {};
    if (status && ['PENDING_GRN', 'SENT', 'RECEIVED'].includes(status)) {
      query.status = status;
    }

    const [history, total] = await Promise.all([
      PurchaseHistory.find(query)
        .populate('sentBy', 'name phone offsiteId')
        .populate('receivedBy', 'name phone offsiteId')
        .populate('projectId', 'name location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PurchaseHistory.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Purchase history retrieved successfully',
      data: {
        history,
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
