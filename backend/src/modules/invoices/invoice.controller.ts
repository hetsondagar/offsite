import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Invoice } from './invoice.model';
import { Project } from '../projects/project.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';
import { calculateGST } from './gst.util';
import { calculateBillableAmount } from './billable-amount.service';
import { generateInvoiceNumber } from './invoice-number.service';
import { generateInvoicePDF } from './pdf.service';

/**
 * GST invoices are owner-generated, offline-capable, and finalized server-side.
 * Once finalized, invoices are immutable and GST-compliant as per Indian law.
 * This avoids accounting complexity while ensuring legal correctness.
 */

const createInvoiceSchema = z.object({
  projectId: z.string(),
  billingPeriod: z.object({
    from: z.string().transform((str) => new Date(str)),
    to: z.string().transform((str) => new Date(str)),
  }),
  gstRate: z.number().min(0).max(100).optional().default(18),
  supplier: z.object({
    companyName: z.string().min(1),
    address: z.string().min(1),
    gstin: z.string().min(1),
    state: z.string().min(1),
  }),
  client: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    gstin: z.string().optional(),
    state: z.string().min(1),
  }),
  notes: z.string().optional(),
  // Optional: Allow manual taxable amount override (for offline drafts)
  taxableAmount: z.number().min(0).optional(),
});

const finalizeInvoiceSchema = z.object({
  // No body required - server calculates everything
});

// 1. Create Invoice (Offline Draft Allowed)
export const createInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can create invoices', 403, 'FORBIDDEN');
    }

    const data = createInvoiceSchema.parse(req.body);

    // Verify project exists
    const project = await Project.findById(data.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Validate billing period
    if (data.billingPeriod.from >= data.billingPeriod.to) {
      throw new AppError('Invalid billing period', 400, 'INVALID_BILLING_PERIOD');
    }

    // Check for overlapping finalized invoices
    const overlappingInvoice = await Invoice.findOne({
      projectId: data.projectId,
      status: 'FINALIZED',
      $or: [
        {
          'billingPeriod.from': { $lte: data.billingPeriod.to },
          'billingPeriod.to': { $gte: data.billingPeriod.from },
        },
      ],
    });

    if (overlappingInvoice) {
      throw new AppError(
        'Billing period overlaps with a finalized invoice',
        400,
        'OVERLAPPING_INVOICE'
      );
    }

    // Calculate taxable amount (use provided or calculate from system data)
    let taxableAmount: number;
    if (data.taxableAmount !== undefined) {
      // Use provided amount (for offline drafts)
      taxableAmount = data.taxableAmount;
    } else {
      // Calculate from system data
      const billableResult = await calculateBillableAmount(
        data.projectId,
        data.billingPeriod.from,
        data.billingPeriod.to
      );
      taxableAmount = billableResult.taxableAmount;
    }

    // Calculate GST
    const gstResult = calculateGST(
      taxableAmount,
      data.gstRate,
      data.supplier.state,
      data.client.state
    );

    const totalAmount = taxableAmount + gstResult.totalGst;

    // Create draft invoice (no invoice number yet)
    const invoice = new Invoice({
      projectId: data.projectId,
      ownerId: req.user.userId,
      billingPeriod: data.billingPeriod,
      taxableAmount,
      gstRate: data.gstRate,
      gstType: gstResult.gstType,
      cgstAmount: gstResult.cgstAmount,
      sgstAmount: gstResult.sgstAmount,
      igstAmount: gstResult.igstAmount,
      totalAmount,
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      supplier: data.supplier,
      client: data.client,
      notes: data.notes,
    });

    await invoice.save();
    await invoice.populate('projectId', 'name location');
    await invoice.populate('ownerId', 'name email');

    logger.info(`Invoice draft created: ${invoice._id} by owner ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Invoice draft created successfully',
      data: invoice,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// 2. Finalize Invoice (Server Only)
export const finalizeInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can finalize invoices', 403, 'FORBIDDEN');
    }

    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    // Check if already finalized
    if (invoice.status === 'FINALIZED') {
      throw new AppError('Invoice already finalized', 400, 'ALREADY_FINALIZED');
    }

    // Validate required fields for finalization
    if (!invoice.supplier.gstin || !invoice.supplier.state) {
      throw new AppError(
        'Supplier GSTIN and state are required for finalization',
        400,
        'MISSING_REQUIRED_FIELDS'
      );
    }

    if (!invoice.client.state) {
      throw new AppError('Client state is required for finalization', 400, 'MISSING_REQUIRED_FIELDS');
    }

    // Recalculate billable amount from system data (ensure accuracy)
    const billableResult = await calculateBillableAmount(
      invoice.projectId.toString(),
      invoice.billingPeriod.from,
      invoice.billingPeriod.to
    );

    // Update taxable amount
    invoice.taxableAmount = billableResult.taxableAmount;

    // Recalculate GST with updated amount
    const gstResult = calculateGST(
      invoice.taxableAmount,
      invoice.gstRate,
      invoice.supplier.state,
      invoice.client.state
    );

    invoice.gstType = gstResult.gstType;
    invoice.cgstAmount = gstResult.cgstAmount;
    invoice.sgstAmount = gstResult.sgstAmount;
    invoice.igstAmount = gstResult.igstAmount;
    invoice.totalAmount = invoice.taxableAmount + gstResult.totalGst;

    // Generate invoice number (server-only)
    invoice.invoiceNumber = await generateInvoiceNumber();

    // Finalize invoice
    invoice.status = 'FINALIZED';
    invoice.finalizedBy = req.user.userId as any;
    invoice.finalizedAt = new Date();
    invoice.syncedAt = new Date();

    await invoice.save();

    logger.info(`Invoice finalized: ${invoice.invoiceNumber} by owner ${req.user.userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Invoice finalized successfully',
      data: invoice,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// 3. Get All Invoices
export const getInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can view invoices', 403, 'FORBIDDEN');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build query filters
    const query: any = { ownerId: req.user.userId };

    if (req.query.projectId) {
      query.projectId = req.query.projectId;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('projectId', 'name location')
        .populate('ownerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Invoice.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Invoices retrieved successfully',
      data: {
        invoices,
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

// 4. Get Invoice by ID
export const getInvoiceById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can view invoices', 403, 'FORBIDDEN');
    }

    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate('projectId', 'name location')
      .populate('ownerId', 'name email')
      .populate('finalizedBy', 'name email')
      .select('-__v');

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    // Verify ownership
    if (invoice.ownerId.toString() !== req.user.userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Invoice retrieved successfully',
      data: invoice,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// 5. Download Invoice PDF
export const downloadInvoicePDF = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can download invoices', 403, 'FORBIDDEN');
    }

    const { id } = req.params;

    const invoice = await Invoice.findById(id).populate('projectId', 'name location');

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    // Verify ownership
    if (invoice.ownerId.toString() !== req.user.userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Only finalized invoices can be downloaded as PDF
    if (invoice.status !== 'FINALIZED') {
      throw new AppError('Only finalized invoices can be downloaded', 400, 'INVOICE_NOT_FINALIZED');
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`
    );

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// Update payment status
export const updatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'owner') {
      throw new AppError('Only owners can update payment status', 403, 'FORBIDDEN');
    }

    const { id } = req.params;
    const { paymentStatus } = z
      .object({
        paymentStatus: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID']),
      })
      .parse(req.body);

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    }

    // Verify ownership
    if (invoice.ownerId.toString() !== req.user.userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Prevent updates to finalized invoices (except payment status)
    // Payment status can be updated even after finalization

    invoice.paymentStatus = paymentStatus;
    await invoice.save();

    logger.info(`Payment status updated for invoice ${invoice.invoiceNumber}: ${paymentStatus}`);

    const response: ApiResponse = {
      success: true,
      message: 'Payment status updated successfully',
      data: invoice,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
