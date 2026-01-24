import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Contractor } from './contractor.model';
import { Labour } from './labour.model';
import { LabourAttendance } from './labour-attendance.model';
import { ContractorInvoice } from './contractor-invoice.model';
import { User } from '../users/user.model';
import { Project } from '../projects/project.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';
import { createNotification } from '../notifications/notification.service';
import { validateGeoFence, getProjectGeoFence } from '../../utils/geoFence';

// Ensure contractor profile helper
async function ensureContractorProfileForUser(userId: string) {
  let contractor = await Contractor.findOne({ userId });
  if (!contractor) {
    contractor = new Contractor({ userId, assignedProjects: [], contracts: [] });
    await contractor.save();
    try {
      await contractor.populate('userId', 'name email phone offsiteId');
    } catch (e) {
      // ignore populate failures
    }
  }
  return contractor;
}

// Schema definitions
const assignContractorSchema = z.object({
  contractorUserId: z.string(),
  projectId: z.string(),
  labourCountPerDay: z.number().min(1),
  ratePerLabourPerDay: z.number().min(0),
  gstRate: z.number().min(0).max(100).optional().default(18),
  startDate: z.string().transform(s => new Date(s)),
  endDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
});

const createLabourSchema = z.object({
  name: z.string().min(1),
  faceImageUrl: z.string().optional(),
  projectId: z.string(),
});

const uploadAttendanceSchema = z.object({
  projectId: z.string(),
  date: z.string().transform(s => new Date(s)),
  groupPhotoUrl: z.string(),
  presentLabourIds: z.array(z.string()),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  detectedFaces: z.array(z.string()).optional(), // Array of labour IDs whose faces were detected
});

const createInvoiceSchema = z.object({
  projectId: z.string(),
  weekStartDate: z.string().transform(s => new Date(s)),
  weekEndDate: z.string().transform(s => new Date(s)),
});

// Generate dummy face embedding (MVP placeholder)
function generateDummyEmbedding(): number[] {
  return Array.from({ length: 128 }, () => Math.random() * 2 - 1);
}

// Generate labour code
async function generateLabourCode(contractorId: string): Promise<string> {
  const count = await Labour.countDocuments({ contractorId });
  return `LAB${String(count + 1).padStart(4, '0')}`;
}

/**
 * Get all contractors (Owner only)
 */
export const getAllContractors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can view all contractors', 403, 'FORBIDDEN');
    }

    const contractors = await Contractor.find()
      .populate('userId', 'name email phone offsiteId')
      .populate('assignedProjects', 'name location')
      .populate('contracts.projectId', 'name location')
      .sort({ rating: -1 }); // Sort by rating descending

    const response: ApiResponse = {
      success: true,
      message: 'Contractors retrieved successfully',
      data: contractors,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Assign contractor to project (Owner only)
 */
export const assignContractorToProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can assign contractors', 403, 'FORBIDDEN');
    }

    const data = assignContractorSchema.parse(req.body);

    // Resolve contractor user (accept MongoDB userId OR Offsite ID like OSCT0002)
    let contractorUser: any = null;
    const trimmedIdentifier = data.contractorUserId?.trim();

    if (trimmedIdentifier && mongoose.Types.ObjectId.isValid(trimmedIdentifier)) {
      contractorUser = await User.findById(trimmedIdentifier);
    } else if (trimmedIdentifier) {
      contractorUser = await User.findOne({
        offsiteId: { $regex: new RegExp(`^${trimmedIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        role: 'contractor',
      });
    }

    if (!contractorUser || contractorUser.role !== 'contractor') {
      throw new AppError('User is not a contractor', 400, 'INVALID_USER');
    }

    // Find or create contractor profile
    let contractor = await Contractor.findOne({ userId: contractorUser._id });
    if (!contractor) {
      contractor = new Contractor({
        userId: contractorUser._id,
        assignedProjects: [],
        contracts: [],
      });
    }

    // Add project assignment
    if (!contractor.assignedProjects.includes(data.projectId as any)) {
      contractor.assignedProjects.push(data.projectId as any);
    }

    // Add or update contract
    const existingContractIndex = contractor.contracts.findIndex(
      c => c.projectId.toString() === data.projectId
    );

    const contractData = {
      projectId: data.projectId as any,
      labourCountPerDay: data.labourCountPerDay,
      ratePerLabourPerDay: data.ratePerLabourPerDay,
      gstRate: data.gstRate,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: true,
    };

    if (existingContractIndex >= 0) {
      contractor.contracts[existingContractIndex] = contractData;
    } else {
      contractor.contracts.push(contractData);
    }

    await contractor.save();

    // Populate and return
    await contractor.populate('userId', 'name email phone offsiteId');
    await contractor.populate('assignedProjects', 'name location');

    logger.info(`Contractor ${data.contractorUserId} assigned to project ${data.projectId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Contractor assigned successfully',
      data: contractor,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Register labour face (Contractor only)
 */
export const registerLabour = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'contractor') {
      throw new AppError('Only contractors can register labours', 403, 'FORBIDDEN');
    }

    const data = createLabourSchema.parse(req.body);

    // Find or create contractor profile
    const contractor = await ensureContractorProfileForUser(req.user.userId);

    // Verify contractor is assigned to project
    if (!contractor.assignedProjects.includes(data.projectId as any)) {
      throw new AppError('Not assigned to this project', 403, 'FORBIDDEN');
    }

    // Generate labour code
    const code = await generateLabourCode(contractor._id.toString());

    // Generate dummy embedding (MVP - replace with face-api.js later)
    const faceEmbedding = data.faceImageUrl ? generateDummyEmbedding() : undefined;

    const labour = new Labour({
      contractorId: contractor._id,
      name: data.name,
      code,
      faceImageUrl: data.faceImageUrl,
      faceEmbedding,
      projectId: data.projectId,
      isActive: true,
    });

    await labour.save();

    logger.info(`Labour registered: ${code} by contractor ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Labour registered successfully',
      data: labour,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get labours for contractor
 */
export const getLabours = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const contractor = req.user ? await ensureContractorProfileForUser(req.user.userId) : null;

    const projectId = req.query.projectId as string;

    const query: any = {};
    if (req.user.role === 'contractor' && contractor) {
      query.contractorId = contractor._id;
    }
    if (projectId) {
      query.projectId = projectId;
    }

    const labours = await Labour.find(query)
      .populate('projectId', 'name location')
      .sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      message: 'Labours retrieved successfully',
      data: labours,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload attendance (Contractor uploads group photo)
 */
export const uploadAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'contractor') {
      throw new AppError('Only contractors can upload attendance', 403, 'FORBIDDEN');
    }

    const data = uploadAttendanceSchema.parse(req.body);

    const contractor = await ensureContractorProfileForUser(req.user.userId);

    // Get project for geofence validation
    const project = await Project.findById(data.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    // Validate geofence if coordinates provided
    let geoFenceValid = false;
    let distanceFromSite: number | undefined;
    let coordinates: { type: 'Point'; coordinates: [number, number] } | undefined;

    if (data.latitude && data.longitude) {
      coordinates = {
        type: 'Point',
        coordinates: [data.longitude, data.latitude], // GeoJSON format: [longitude, latitude]
      };

      const geoFence = getProjectGeoFence(project);
      if (geoFence) {
        const validation = validateGeoFence(data.latitude, data.longitude, geoFence);
        distanceFromSite = validation.distanceFromCenter;
        geoFenceValid = validation.isInside;

        if (!geoFenceValid) {
          throw new AppError(
            `You are ${distanceFromSite} meters away from the project site. Please be within ${geoFence.radiusMeters + geoFence.bufferMeters} meters to mark attendance.`,
            400,
            'OUTSIDE_GEOFENCE'
          );
        }
      }
    }

    // Normalize date to start of day
    const attendanceDate = new Date(data.date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Get detected faces (labour IDs whose faces were matched in the group photo)
    const detectedFaceIds = new Set(data.detectedFaces || []);

    // Only mark labours as present if their faces were detected in the group photo
    // AND they are in the presentLabourIds list
    const validLabourIds = data.presentLabourIds.filter(labourId => {
      // Check if this labour's face was detected
      return detectedFaceIds.has(labourId);
    });

    if (validLabourIds.length === 0) {
      throw new AppError(
        'No labours with detected faces found. Please ensure faces are registered and visible in the group photo.',
        400,
        'NO_FACES_DETECTED'
      );
    }

    // Create attendance records only for labours with detected faces
    const attendanceRecords = [];
    for (const labourId of validLabourIds) {
      // Verify labour exists and belongs to contractor
      const labour = await Labour.findById(labourId);
      if (!labour || labour.contractorId.toString() !== contractor._id.toString()) {
        logger.warn(`Labour ${labourId} not found or doesn't belong to contractor ${contractor._id}`);
        continue;
      }

      // Check if attendance already exists
      const existing = await LabourAttendance.findOne({
        labourId,
        date: attendanceDate,
      });

      if (!existing) {
        const record = new LabourAttendance({
          labourId,
          contractorId: contractor._id,
          projectId: data.projectId,
          date: attendanceDate,
          present: true,
          groupPhotoUrl: data.groupPhotoUrl,
          detectedAt: new Date(),
          coordinates,
          distanceFromSite,
          geoFenceValid,
          faceMatched: true, // Face was detected
        });
        await record.save();
        attendanceRecords.push(record);
      } else {
        // Update existing record with face match and geo-fence info
        existing.faceMatched = true;
        existing.coordinates = coordinates;
        existing.distanceFromSite = distanceFromSite;
        existing.geoFenceValid = geoFenceValid;
        existing.groupPhotoUrl = data.groupPhotoUrl;
        existing.detectedAt = new Date();
        await existing.save();
        attendanceRecords.push(existing);
      }
    }

    logger.info(`Attendance uploaded for ${attendanceRecords.length} labours (faces matched) by contractor ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: `Attendance marked for ${attendanceRecords.length} labours (faces detected and matched)`,
      data: {
        attendanceRecords,
        totalRequested: data.presentLabourIds.length,
        facesDetected: detectedFaceIds.size,
        markedAsPresent: attendanceRecords.length,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance summary for a project
 */
export const getAttendanceSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const attendance = await LabourAttendance.aggregate([
      {
        $match: {
          projectId: projectId as any,
          date: { $gte: startDate, $lte: endDate },
          present: true,
        },
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const totalLabourDays = attendance.reduce((sum, day) => sum + day.count, 0);

    const response: ApiResponse = {
      success: true,
      message: 'Attendance summary retrieved successfully',
      data: {
        dailyAttendance: attendance,
        totalLabourDays,
        startDate,
        endDate,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create weekly invoice (Contractor)
 */
export const createWeeklyInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'contractor') {
      throw new AppError('Only contractors can create invoices', 403, 'FORBIDDEN');
    }

    const data = createInvoiceSchema.parse(req.body);

    const contractor = await ensureContractorProfileForUser(req.user.userId);

    // Get contract for this project
    const contract = contractor.contracts.find(
      c => c.projectId.toString() === data.projectId && c.isActive
    );
    if (!contract) {
      throw new AppError('No active contract for this project', 400, 'NO_CONTRACT');
    }

    // Count attendance for the week
    const attendanceCount = await LabourAttendance.countDocuments({
      contractorId: contractor._id,
      projectId: data.projectId,
      date: { $gte: data.weekStartDate, $lte: data.weekEndDate },
      present: true,
    });

    // Calculate amounts
    const taxableAmount = attendanceCount * contract.ratePerLabourPerDay;
    const gstAmount = taxableAmount * (contract.gstRate / 100);
    const totalAmount = taxableAmount + gstAmount;

    // Generate invoice number
    const invoiceCount = await ContractorInvoice.countDocuments();
    const invoiceNumber = `CI-${String(invoiceCount + 1).padStart(6, '0')}`;

    const invoice = new ContractorInvoice({
      contractorId: contractor._id,
      projectId: data.projectId,
      weekStartDate: data.weekStartDate,
      weekEndDate: data.weekEndDate,
      labourCountTotal: attendanceCount,
      ratePerLabour: contract.ratePerLabourPerDay,
      taxableAmount,
      gstRate: contract.gstRate,
      gstAmount,
      totalAmount,
      status: 'PENDING_PM_APPROVAL',
      sentToOwner: false,
      invoiceNumber,
    });

    await invoice.save();

    // Notify project managers
    const { Project } = await import('../projects/project.model');
    const project = await Project.findById(data.projectId).populate('members', 'role offsiteId _id');
    if (project) {
      const managers = (project.members as any[]).filter(m => m.role === 'manager');
      for (const manager of managers) {
        try {
          await createNotification({
            userId: manager._id.toString(),
            offsiteId: manager.offsiteId,
            type: 'general',
            title: 'Contractor Invoice Pending',
            message: `New contractor invoice ${invoiceNumber} requires approval (₹${totalAmount.toFixed(2)})`,
            data: { invoiceId: invoice._id.toString() },
          });
        } catch (e) {
          logger.warn('Failed to notify manager:', e);
        }
      }
    }

    logger.info(`Contractor invoice created: ${invoiceNumber}`);

    const response: ApiResponse = {
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending invoices (Project Manager)
 */
export const getPendingInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'manager' && req.user.role !== 'owner') {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const { Project } = await import('../projects/project.model');
    let projectIds: string[] = [];

    if (req.user.role === 'manager') {
      const projects = await Project.find({ members: req.user.userId }).select('_id');
      projectIds = projects.map(p => p._id.toString());
    }

    const query: any = { status: 'PENDING_PM_APPROVAL' };
    if (projectIds.length > 0) {
      query.projectId = { $in: projectIds };
    }

    const invoices = await ContractorInvoice.find(query)
      .populate('contractorId')
      .populate('projectId', 'name location')
      .sort({ createdAt: -1 });

    // Populate contractor user info
    for (const invoice of invoices) {
      if (invoice.contractorId) {
        await (invoice.contractorId as any).populate('userId', 'name email phone offsiteId');
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Pending invoices retrieved successfully',
      data: invoices,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve invoice (Project Manager)
 */
export const approveInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'manager') {
      throw new AppError('Only managers can approve invoices', 403, 'FORBIDDEN');
    }

    const { id } = req.params;

    const invoice = await ContractorInvoice.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    }

    if (invoice.status !== 'PENDING_PM_APPROVAL') {
      throw new AppError('Invoice already processed', 400, 'ALREADY_PROCESSED');
    }

    invoice.status = 'APPROVED';
    invoice.approvedBy = req.user.userId as any;
    invoice.approvedAt = new Date();
    invoice.sentToOwner = true;

    await invoice.save();

    logger.info(`Invoice approved: ${invoice.invoiceNumber} by ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Invoice approved successfully',
      data: invoice,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Reject invoice (Project Manager)
 */
export const rejectInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'manager') {
      throw new AppError('Only managers can reject invoices', 403, 'FORBIDDEN');
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    const invoice = await ContractorInvoice.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    }

    if (invoice.status !== 'PENDING_PM_APPROVAL') {
      throw new AppError('Invoice already processed', 400, 'ALREADY_PROCESSED');
    }

    invoice.status = 'REJECTED';
    invoice.rejectedBy = req.user.userId as any;
    invoice.rejectedAt = new Date();
    invoice.rejectionReason = rejectionReason || 'No reason provided';

    await invoice.save();

    logger.info(`Invoice rejected: ${invoice.invoiceNumber} by ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Invoice rejected',
      data: invoice,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get approved invoices (Owner)
 */
export const getApprovedInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can view approved invoices', 403, 'FORBIDDEN');
    }

    const invoices = await ContractorInvoice.find({ status: 'APPROVED', sentToOwner: true })
      .populate('contractorId')
      .populate('projectId', 'name location')
      .populate('approvedBy', 'name offsiteId')
      .sort({ approvedAt: -1 });

    // Populate contractor user info
    for (const invoice of invoices) {
      if (invoice.contractorId) {
        await (invoice.contractorId as any).populate('userId', 'name email phone offsiteId');
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Approved invoices retrieved successfully',
      data: invoices,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get contractor's own invoices
 */
export const getMyInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'contractor') {
      throw new AppError('Only contractors can view their invoices', 403, 'FORBIDDEN');
    }

    // Ensure contractor profile exists (may create if missing)
    const contractor = await ensureContractorProfileForUser(req.user.userId);

    try {
      const invoices = await ContractorInvoice.find({ contractorId: contractor._id })
        .populate('projectId', 'name location')
        .sort({ createdAt: -1 });

      const response: ApiResponse = {
        success: true,
        message: 'Invoices retrieved successfully',
        data: invoices,
      };

      res.status(200).json(response);
      return;
    } catch (innerErr) {
      logger.error('Failed to fetch contractor invoices', { err: (innerErr as Error).message, user: req.user?.userId, contractorId: contractor?._id });
      next(new AppError('Failed to load invoices. Please try again later.', 500, 'INVOICE_LOAD_ERROR'));
      return;
    }
  } catch (error) {
    next(error);
  }
};
