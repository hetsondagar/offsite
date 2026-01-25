import { Request, Response, NextFunction } from 'express';
import { PurchaseInvoice } from './purchase-invoice.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';

/**
 * Get purchase invoices (Manager/Owner)
 */
export const getPurchaseInvoices = async (
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { Project } = await import('../projects/project.model');
    let projectIds: string[] = [];

    if (req.user.role === 'manager') {
      const projects = await Project.find({ members: req.user.userId }).select('_id');
      projectIds = projects.map(p => p._id.toString());
    }

    const query: any = {};
    if (projectIds.length > 0 && req.user.role === 'manager') {
      query.projectId = { $in: projectIds };
    }

    const [invoices, total] = await Promise.all([
      PurchaseInvoice.find(query)
        .populate('projectId', 'name location')
        .populate('purchaseHistoryId', 'sentBy receivedBy sentAt receivedAt')
        .populate('generatedBy', 'name offsiteId')
        .sort({ generatedAt: -1 })
        .skip(skip)
        .limit(limit),
      PurchaseInvoice.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Purchase invoices retrieved successfully',
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

/**
 * Get purchase invoice by ID
 */
export const getPurchaseInvoiceById = async (
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

    const { id } = req.params;

    const invoice = await PurchaseInvoice.findById(id)
      .populate('projectId', 'name location')
      .populate('purchaseHistoryId')
      .populate('generatedBy', 'name offsiteId');

    if (!invoice) {
      throw new AppError('Purchase invoice not found', 404, 'NOT_FOUND');
    }

    // Verify access
    const { Project } = await import('../projects/project.model');
    const project = await Project.findById(invoice.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    if (req.user.role === 'manager') {
      const isMember = project.members.some(
        (memberId: any) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Purchase invoice retrieved successfully',
      data: invoice,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate PDF for purchase invoice
 */
export const generatePurchaseInvoicePDF = async (
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

    const { id } = req.params;

    const invoice = await PurchaseInvoice.findById(id)
      .populate('projectId', 'name location')
      .populate('purchaseHistoryId')
      .populate('generatedBy', 'name offsiteId');

    if (!invoice) {
      throw new AppError('Purchase invoice not found', 404, 'NOT_FOUND');
    }

    // Verify access
    const { Project } = await import('../projects/project.model');
    const project = await Project.findById(invoice.projectId);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    if (req.user.role === 'manager') {
      const isMember = project.members.some(
        (memberId: any) => memberId.toString() === req.user!.userId
      );
      if (!isMember) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    // Generate PDF
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Purchase-Invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
    });
    doc.on('error', (error) => {
      next(new AppError('Failed to generate PDF', 500, 'PDF_GENERATION_ERROR'));
    });

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('PURCHASE INVOICE', { align: 'center' });
    doc.moveDown(0.5);

    // Invoice Number and Date
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, { align: 'left' });
    doc.text(`Date: ${new Date(invoice.generatedAt).toLocaleDateString('en-IN')}`, {
      align: 'right',
    });
    doc.moveDown(1);

    // Project Details
    doc.fontSize(12).font('Helvetica-Bold').text('Project Details:', { continued: false });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Project: ${(invoice.projectId as any)?.name || 'N/A'}`);
    doc.text(`Location: ${(invoice.projectId as any)?.location || 'N/A'}`);
    doc.moveDown(1);

    // Material Details Table
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Unit', 350, tableTop);
    doc.text('Rate (₹)', 400, tableTop);
    doc.text('Amount (₹)', 500, tableTop, { align: 'right' });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Material Item
    doc.moveDown(0.5);
    doc.font('Helvetica');
    doc.text(invoice.materialName, 50);
    doc.text(`${invoice.qty}`, 300);
    doc.text(invoice.unit, 350);
    doc.text(`${(invoice.basePrice / invoice.qty).toFixed(2)}`, 400);
    doc.text(`${invoice.basePrice.toFixed(2)}`, 500, doc.y - 12, { align: 'right' });

    doc.moveDown(1);
    doc.line(50, doc.y, 550, doc.y);
    doc.moveDown(0.5);

    // Taxable Amount
    doc.text('Taxable Amount:', 50);
    doc.text(`₹${invoice.basePrice.toFixed(2)}`, 500, doc.y - 12, { align: 'right' });

    doc.moveDown(0.5);
    // GST
    doc.text(`GST (${invoice.gstRate}%):`, 50);
    doc.text(`₹${invoice.gstAmount.toFixed(2)}`, 500, doc.y - 12, { align: 'right' });

    doc.moveDown(0.5);
    doc.line(50, doc.y, 550, doc.y);
    doc.moveDown(0.3);

    // Total
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total Amount (₹):', 50);
    doc.text(`₹${invoice.totalAmount.toFixed(2)}`, 500, doc.y - 12, { align: 'right' });

    // GRN Details
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica');
    doc.text(`GRN Generated: ${new Date(invoice.generatedAt).toLocaleDateString('en-IN')}`, 50);
    if (invoice.generatedBy) {
      doc.text(`Verified By: ${(invoice.generatedBy as any)?.name || 'N/A'}`, 50);
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};
