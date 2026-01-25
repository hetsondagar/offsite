import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import fs from 'fs';
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
import { cloudinary } from '../../config/cloudinary';

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
  faceEmbedding: z.array(z.number()).optional(), // Face embedding array
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
 * Get all contractors (Owner + Project Manager)
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

    if (req.user.role !== 'owner' && req.user.role !== 'manager') {
      throw new AppError('Only owners and project managers can view contractors', 403, 'FORBIDDEN');
    }

    const contractors = await Contractor.find()
      .populate('userId', 'name email phone offsiteId')
      .populate('assignedProjects', 'name location')
      .populate('contracts.projectId', 'name location')
      .sort({ rating: -1 }) // Sort by rating descending
      .lean(); // Use lean() for better performance

    // Filter out contractors with null userId (orphaned records)
    const validContractors = contractors.filter((c: any) => c.userId !== null);

    const response: ApiResponse = {
      success: true,
      message: 'Contractors retrieved successfully',
      data: validContractors,
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Error fetching contractors:', error);
    next(error);
  }
};

/**
 * Assign contractor to project (Owner + Project Manager)
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

    if (req.user.role !== 'owner' && req.user.role !== 'manager') {
      throw new AppError('Only owners and project managers can assign contractors', 403, 'FORBIDDEN');
    }

    const data = assignContractorSchema.parse(req.body);

    // Authorization: owner can assign within their own projects; manager can assign only for projects they belong to.
    const project = await Project.findById(data.projectId).select('owner members');
    if (!project) {
      throw new AppError('Project not found', 404, 'NOT_FOUND');
    }

    const actorId = new mongoose.Types.ObjectId(req.user.userId);
    const isOwnerOfProject = project.owner && project.owner.toString() === actorId.toString();
    const isMemberOfProject = (project.members || []).some((m: any) => m.toString() === actorId.toString());

    if (req.user.role === 'owner' && !isOwnerOfProject) {
      throw new AppError('You can only assign contractors to your own projects', 403, 'FORBIDDEN');
    }

    if (req.user.role === 'manager' && !isMemberOfProject) {
      throw new AppError('You can only assign contractors to projects you are a member of', 403, 'FORBIDDEN');
    }

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

    // Ensure contractor user can see the project in /api/projects (members-based)
    // and in their profile (assignedProjects)
    try {
      await Project.findByIdAndUpdate(
        data.projectId,
        { $addToSet: { members: contractorUser._id } },
        { new: false }
      );
      await User.findByIdAndUpdate(
        contractorUser._id,
        { $addToSet: { assignedProjects: data.projectId as any } },
        { new: false }
      );
    } catch (e) {
      logger.warn('Failed to sync contractor membership/assignedProjects', {
        err: (e as Error).message,
        projectId: data.projectId,
        contractorUserId: contractorUser._id?.toString?.() ?? contractorUser._id,
      });
    }

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

    // Use provided face embedding or generate dummy (for backward compatibility)
    const faceEmbedding = data.faceEmbedding && data.faceEmbedding.length > 0 
      ? data.faceEmbedding 
      : (data.faceImageUrl ? generateDummyEmbedding() : undefined);

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

    // Get all attendance records for the week (only marked as present)
    const attendanceRecords = await LabourAttendance.find({
      contractorId: contractor._id,
      projectId: data.projectId,
      date: { $gte: data.weekStartDate, $lte: data.weekEndDate },
      present: true,
      faceMatched: true, // Only count faces that were matched
    }).select('labourId date');

    if (attendanceRecords.length === 0) {
      throw new AppError('No attendance records found for this week', 400, 'NO_ATTENDANCE');
    }

    // Count unique labour-days (each labour present on each day = 1 labour-day)
    // Group by date and labourId to count unique labour-days
    const labourDayMap = new Map<string, number>(); // key: "date_labourId", value: count
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      const key = `${dateKey}_${record.labourId}`;
      labourDayMap.set(key, 1); // Each unique combination = 1 labour-day
    });

    const totalLabourDays = labourDayMap.size;

    // Use market average rate (INR) - current market trends for construction labour in India
    // Average rate: ₹650-750 per day for unskilled labour, ₹800-1000 for semi-skilled
    // Using ₹700 as the market average rate
    const MARKET_AVERAGE_RATE_PER_DAY = 700; // INR per labour per day
    
    // If contract rate exists and is reasonable, use average of contract and market rate
    // Otherwise, use pure market rate
    let averageRate = MARKET_AVERAGE_RATE_PER_DAY;
    const activeContracts = contractor.contracts.filter(c => 
      c.projectId.toString() === data.projectId && c.isActive
    );
    
    if (activeContracts.length > 0) {
      const contractRates = activeContracts.map(c => c.ratePerLabourPerDay);
      const avgContractRate = contractRates.reduce((sum, rate) => sum + rate, 0) / contractRates.length;
      
      // Use weighted average: 70% market rate, 30% contract rate (if contract rate is reasonable)
      // This ensures market trends are prioritized while respecting existing contracts
      if (avgContractRate > 0 && avgContractRate <= 1500) { // Reasonable contract rate
        averageRate = Math.round((MARKET_AVERAGE_RATE_PER_DAY * 0.7 + avgContractRate * 0.3) * 100) / 100;
      }
    }

    // Calculate amounts with GST
    const taxableAmount = Math.round(totalLabourDays * averageRate * 100) / 100;
    const gstAmount = Math.round((taxableAmount * contract.gstRate) / 100 * 100) / 100; // Round to 2 decimal places
    const totalAmount = Math.round((taxableAmount + gstAmount) * 100) / 100; // Round to 2 decimal places

    // Generate invoice number
    const invoiceCount = await ContractorInvoice.countDocuments();
    const invoiceNumber = `CI-${String(invoiceCount + 1).padStart(6, '0')}`;

    const invoice = new ContractorInvoice({
      contractorId: contractor._id,
      projectId: data.projectId,
      weekStartDate: data.weekStartDate,
      weekEndDate: data.weekEndDate,
      labourCountTotal: totalLabourDays, // Total labour-days (unique labour present per day)
      ratePerLabour: averageRate, // Average rate per labour-day
      taxableAmount,
      gstRate: contract.gstRate,
      gstAmount,
      totalAmount,
      status: 'PENDING_PM_APPROVAL',
      // Make invoice visible to owner immediately (still marked pending PM approval)
      sentToOwner: true,
      invoiceNumber,
    });

    await invoice.save();

    // Notify project managers + owner
    const project = await Project.findById(data.projectId)
      .populate('members', 'role offsiteId _id')
      .populate('owner', 'offsiteId _id');
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

      const owner = project.owner as any;
      if (owner?._id) {
        try {
          await createNotification({
            userId: owner._id.toString(),
            offsiteId: owner.offsiteId,
            type: 'general',
            title: 'New Contractor Invoice',
            message: `New contractor invoice ${invoiceNumber} created (₹${totalAmount.toFixed(2)}). Status: Pending PM approval.`,
            data: { invoiceId: invoice._id.toString() },
          });
        } catch (e) {
          logger.warn('Failed to notify owner:', e);
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

    let projectIds: string[] = [];

    if (req.user.role === 'manager') {
      const projects = await Project.find({ members: req.user.userId }).select('_id');
      projectIds = projects.map(p => p._id.toString());
    }

    if (req.user.role === 'owner') {
      const projects = await Project.find({ owner: req.user.userId }).select('_id');
      projectIds = projects.map(p => p._id.toString());
    }

    const query: any = { status: 'PENDING_PM_APPROVAL' };

    // Scope to the caller's projects (empty list should return no invoices, not all invoices)
    if (req.user.role === 'manager' || req.user.role === 'owner') {
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

    // Populate invoice for PDF generation
    await invoice.populate('projectId', 'name location owner');
    await invoice.populate('contractorId', 'userId');
    if (invoice.contractorId) {
      await (invoice.contractorId as any).populate('userId', 'name phone email');
    }
    await invoice.populate('approvedBy', 'name email');

    // Generate PDF, persist URL (best-effort), and send to owner
    try {
      const { generateContractorInvoicePDFBuffer } = await import('./contractor-invoice-pdf.service');
      const { sendEmailWithAttachment } = await import('../../utils/email-with-attachment');

      const pdfBuffer = await generateContractorInvoicePDFBuffer(invoice);

      // Best-effort: upload generated PDF to Cloudinary so it can be accessed in-app later
      try {
        const uploaded = await new Promise<{ secure_url?: string }>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'offsite/contractor/invoices',
              resource_type: 'raw',
              public_id: `contractor-invoice-${invoice.invoiceNumber || invoice._id.toString()}`,
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result as any);
            }
          );
          uploadStream.end(pdfBuffer);
        });

        if (uploaded?.secure_url) {
          invoice.pdfUrl = uploaded.secure_url;
          invoice.pdfSource = 'GENERATED';
          invoice.pdfUploadedBy = req.user.userId as any;
          invoice.pdfUploadedAt = new Date();
          await invoice.save();
        }
      } catch (e: any) {
        logger.warn(`Failed to upload generated contractor invoice PDF to Cloudinary: ${e?.message || e}`);
      }

      // Get owner email
      const project = await Project.findById(invoice.projectId).populate('owner', 'email name');
      const ownerEmail = (project?.owner as any)?.email;

      if (ownerEmail) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Contractor Invoice - ${invoice.invoiceNumber || 'N/A'}</h2>
            <p>Dear Owner,</p>
            <p>A contractor invoice has been approved by the Project Manager.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber || 'N/A'}</p>
              <p><strong>Project:</strong> ${(invoice.projectId as any)?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${new Date(invoice.weekStartDate).toLocaleDateString('en-IN')} to ${new Date(invoice.weekEndDate).toLocaleDateString('en-IN')}</p>
              <p><strong>Labour Days:</strong> ${invoice.labourCountTotal}</p>
              <p><strong>Total Amount:</strong> ₹${invoice.totalAmount.toFixed(2)}</p>
              <p><strong>Approved By:</strong> ${(invoice.approvedBy as any)?.name || 'N/A'}</p>
            </div>
            <p>Please find the invoice PDF attached to this email.</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This is an automated email from OffSite Construction Management System.
            </p>
          </div>
        `;

        const text = `
          Contractor Invoice - ${invoice.invoiceNumber || 'N/A'}
          
          A contractor invoice has been approved by the Project Manager.
          
          Invoice Number: ${invoice.invoiceNumber || 'N/A'}
          Project: ${(invoice.projectId as any)?.name || 'N/A'}
          Period: ${new Date(invoice.weekStartDate).toLocaleDateString('en-IN')} to ${new Date(invoice.weekEndDate).toLocaleDateString('en-IN')}
          Labour Days: ${invoice.labourCountTotal}
          Total Amount: ₹${invoice.totalAmount.toFixed(2)}
          Approved By: ${(invoice.approvedBy as any)?.name || 'N/A'}
          
          Please find the invoice PDF attached to this email.
        `;

        await sendEmailWithAttachment(
          ownerEmail,
          `Contractor Invoice ${invoice.invoiceNumber || 'N/A'} - ${(invoice.projectId as any)?.name || 'Project'}`,
          html,
          text,
          [
            {
              filename: `Contractor-Invoice-${invoice.invoiceNumber || 'N/A'}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        );

        logger.info(`Contractor invoice PDF sent to owner for invoice ${invoice.invoiceNumber}`);
      }
    } catch (emailError: any) {
      logger.warn(`Failed to send contractor invoice email: ${emailError.message}`);
      // Don't fail the approval if email fails
    }

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

    const ownerProjects = await Project.find({ owner: req.user.userId }).select('_id');
    const projectIds = ownerProjects.map(p => p._id.toString());

    const invoices = await ContractorInvoice.find({
      status: 'APPROVED',
      sentToOwner: true,
      projectId: { $in: projectIds },
    })
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

/**
 * Upload/import a contractor invoice PDF (Contractor)
 */
export const uploadInvoicePdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'contractor') {
      throw new AppError('Only contractors can upload invoice PDFs', 403, 'FORBIDDEN');
    }

    const { id } = req.params;
    const file = req.file;

    if (!file) {
      throw new AppError('PDF file is required', 400, 'MISSING_FILE');
    }

    const contractor = await ensureContractorProfileForUser(req.user.userId);
    const invoice = await ContractorInvoice.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    }

    if (invoice.contractorId.toString() !== contractor._id.toString()) {
      throw new AppError('You can only upload PDFs for your own invoices', 403, 'FORBIDDEN');
    }

    // Upload PDF to Cloudinary (persistent). Keep local fallback for dev.
    let pdfUrl = `/uploads/contractor/invoices/${file.filename}`;
    try {
      if (file.path) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'offsite/contractor/invoices',
          resource_type: 'raw',
        });

        if (result?.secure_url) {
          pdfUrl = result.secure_url;
          try {
            fs.unlinkSync(file.path);
          } catch {
            // ignore cleanup failures
          }
        }
      }
    } catch (e: any) {
      logger.warn(`Cloudinary upload failed for contractor invoice PDF; using local uploads fallback: ${e?.message || e}`);
    }

    invoice.pdfUrl = pdfUrl;
    invoice.pdfSource = 'UPLOADED';
    invoice.pdfUploadedBy = req.user.userId as any;
    invoice.pdfUploadedAt = new Date();
    invoice.sentToOwner = true;
    await invoice.save();

    // Notify owner that a PDF was uploaded (best-effort)
    try {
      const project = await Project.findById(invoice.projectId).populate('owner', 'offsiteId _id');
      const owner = project?.owner as any;
      if (owner?._id) {
        await createNotification({
          userId: owner._id.toString(),
          offsiteId: owner.offsiteId,
          type: 'general',
          title: 'Contractor Invoice PDF Uploaded',
          message: `A PDF was uploaded for invoice ${invoice.invoiceNumber || invoice._id.toString().slice(-6)}.`,
          data: { invoiceId: invoice._id.toString() },
        });
      }
    } catch (e) {
      logger.warn('Failed to notify owner about PDF upload:', e);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Invoice PDF uploaded successfully',
      data: invoice,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
