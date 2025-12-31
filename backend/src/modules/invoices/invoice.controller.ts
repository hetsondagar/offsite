import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Invoice, IInvoiceItem } from './invoice.model';
import { ApiResponse } from '../../types';
import { AppError } from '../../middlewares/error.middleware';

const invoiceItemSchema = z.object({
  name: z.string().min(1),
  qty: z.number().min(0),
  rate: z.number().min(0),
  gst: z.number().min(0).max(100).default(18),
});

const createInvoiceSchema = z.object({
  projectId: z.string(),
  items: z.array(invoiceItemSchema).min(1),
});

const GST_RATE = 18; // 18% GST

export const createInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const { projectId, items } = createInvoiceSchema.parse(req.body);

    // Calculate amounts
    const invoiceItems: IInvoiceItem[] = items.map((item) => {
      const amount = item.qty * item.rate;
      return {
        ...item,
        amount,
      };
    });

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const gst = (subtotal * GST_RATE) / 100;
    const total = subtotal + gst;

    // Generate invoice ID
    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments({ invoiceId: new RegExp(`^INV-${year}-`) });
    const invoiceId = `INV-${year}-${String(count + 1).padStart(3, '0')}`;

    const invoice = new Invoice({
      invoiceId,
      projectId,
      items: invoiceItems,
      subtotal,
      gst,
      total,
      status: 'pending',
    });

    await invoice.save();
    await invoice.populate('projectId', 'name location');

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

export const getInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find()
        .populate('projectId', 'name location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Invoice.countDocuments(),
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

export const getInvoiceById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate('projectId', 'name location')
      .select('-__v');

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
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

