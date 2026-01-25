import { Request, Response, NextFunction } from 'express';
import { PurchaseInvoice } from './purchase-invoice.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';
import { generatePurchaseInvoicePDFBuffer } from './purchase-invoice-pdf.service';
import { sendEmailWithAttachment } from '../../utils/email-with-attachment';
import { cloudinary } from '../../config/cloudinary';
import fs from 'fs';

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

    // Generate PDF using service
    const pdfBuffer = await generatePurchaseInvoicePDFBuffer(invoice);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Purchase-Invoice-${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload receipt photo and send PDF invoice to Project Manager and Owner (Purchase Manager)
 */
export const uploadReceiptAndSendInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'purchase_manager') {
      throw new AppError('Only Purchase Manager can upload receipts and send invoices', 403, 'FORBIDDEN');
    }

    const { id } = req.params;
    const file = req.file;

    if (!file) {
      throw new AppError('Receipt photo is required', 400, 'MISSING_FILE');
    }

    const invoice = await PurchaseInvoice.findById(id)
      .populate('projectId', 'name location owner members')
      .populate('generatedBy', 'name offsiteId');

    if (!invoice) {
      throw new AppError('Purchase invoice not found', 404, 'NOT_FOUND');
    }

    // Upload receipt photo to Cloudinary
    let receiptPhotoUrl = `/uploads/purchase/receipts/${file.filename}`;
    try {
      if (file.path) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'offsite/purchase/receipts',
          resource_type: 'image',
        });

        if (result?.secure_url) {
          receiptPhotoUrl = result.secure_url;
          // Cleanup local file if Cloudinary upload succeeded
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            // ignore cleanup failures
          }
        }
      }
    } catch (e: any) {
      logger.warn(`Cloudinary upload failed for receipt photo; using local uploads fallback: ${e?.message || e}`);
    }

    // Update invoice with receipt photo
    invoice.receiptPhotoUrl = receiptPhotoUrl;
    invoice.receiptUploadedAt = new Date();
    invoice.receiptUploadedBy = req.user.userId as any;
    await invoice.save();

    // Generate PDF
    const pdfBuffer = await generatePurchaseInvoicePDFBuffer(invoice);

    // Get project details
    const { Project } = await import('../projects/project.model');
    const { User } = await import('../users/user.model');
    const project = await Project.findById(invoice.projectId).populate('owner', 'email name');
    
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // Get emails for Project Managers and Owner
    const managerEmails: string[] = [];
    const ownerEmail = (project.owner as any)?.email;

    // Get project managers
    const managers = await User.find({
      _id: { $in: project.members },
      role: 'manager',
    }).select('email name');

    for (const manager of managers) {
      if (manager.email) {
        managerEmails.push(manager.email);
      }
    }

    // Send emails with PDF attachment
    const emailRecipients: string[] = [];
    if (ownerEmail) emailRecipients.push(ownerEmail);
    emailRecipients.push(...managerEmails);

    if (emailRecipients.length > 0) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Purchase Invoice - ${invoice.invoiceNumber}</h2>
          <p>Dear ${ownerEmail ? 'Owner/Manager' : 'Manager'},</p>
          <p>A purchase invoice has been generated and receipt photo has been uploaded.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Project:</strong> ${(invoice.projectId as any)?.name || 'N/A'}</p>
            <p><strong>Material:</strong> ${invoice.materialName} (${invoice.qty} ${invoice.unit})</p>
            <p><strong>Total Amount:</strong> ₹${invoice.totalAmount.toFixed(2)}</p>
          </div>
          <p>Please find the invoice PDF attached to this email.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated email from OffSite Construction Management System.
          </p>
        </div>
      `;

      const text = `
        Purchase Invoice - ${invoice.invoiceNumber}
        
        A purchase invoice has been generated and receipt photo has been uploaded.
        
        Invoice Number: ${invoice.invoiceNumber}
        Project: ${(invoice.projectId as any)?.name || 'N/A'}
        Material: ${invoice.materialName} (${invoice.qty} ${invoice.unit})
        Total Amount: ₹${invoice.totalAmount.toFixed(2)}
        
        Please find the invoice PDF attached to this email.
      `;

      try {
        await sendEmailWithAttachment(
          emailRecipients,
          `Purchase Invoice ${invoice.invoiceNumber} - ${(invoice.projectId as any)?.name || 'Project'}`,
          html,
          text,
          [
            {
              filename: `Purchase-Invoice-${invoice.invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        );

        // Mark as sent
        invoice.pdfSentToOwner = ownerEmail ? true : invoice.pdfSentToOwner;
        invoice.pdfSentToManager = managerEmails.length > 0;
        await invoice.save();

        logger.info(`Purchase invoice PDF sent to ${emailRecipients.length} recipients for invoice ${invoice.invoiceNumber}`);
      } catch (emailError: any) {
        logger.warn(`Failed to send invoice email: ${emailError.message}`);
        // Don't fail the request if email fails
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Receipt photo uploaded and invoice PDF sent successfully',
      data: invoice,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
