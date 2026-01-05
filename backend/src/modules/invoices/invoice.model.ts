import mongoose, { Schema, Document } from 'mongoose';
import { InvoiceStatus, PaymentStatus, GstType } from '../../types';

/**
 * GST invoices are owner-generated, offline-capable, and finalized server-side.
 * Once finalized, invoices are immutable and GST-compliant as per Indian law.
 * This avoids accounting complexity while ensuring legal correctness.
 */

export interface ISupplier {
  companyName: string;
  address: string;
  gstin: string;
  state: string;
}

export interface IClient {
  name: string;
  address: string;
  gstin?: string;
  state: string;
}

export interface IBillingPeriod {
  from: Date;
  to: Date;
}

export interface IInvoice extends Document {
  projectId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;

  billingPeriod: IBillingPeriod;

  taxableAmount: number;

  gstRate: number; // default 18, configurable per project
  gstType: GstType;

  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;

  totalAmount: number;

  invoiceNumber?: string; // assigned only after server finalization (OS/INV/2024-25/0001)

  status: InvoiceStatus;

  paymentStatus: PaymentStatus;

  supplier: ISupplier;
  client: IClient;

  notes?: string;

  // Audit fields
  finalizedBy?: mongoose.Types.ObjectId;
  finalizedAt?: Date;
  syncedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    gstin: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const clientSchema = new Schema<IClient>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const billingPeriodSchema = new Schema<IBillingPeriod>(
  {
    from: {
      type: Date,
      required: true,
    },
    to: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    billingPeriod: {
      type: billingPeriodSchema,
      required: true,
    },
    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    gstRate: {
      type: Number,
      required: true,
      default: 18,
      min: 0,
      max: 100,
    },
    gstType: {
      type: String,
      enum: ['CGST_SGST', 'IGST'],
      required: true,
    },
    cgstAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    sgstAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    igstAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true, // Allow null for drafts
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'FINALIZED'],
      default: 'DRAFT',
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'],
      default: 'UNPAID',
    },
    supplier: {
      type: supplierSchema,
      required: true,
    },
    client: {
      type: clientSchema,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    finalizedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    finalizedAt: {
      type: Date,
    },
    syncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent updates to finalized invoices
invoiceSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  if (update && update.status === 'FINALIZED') {
    return next(new Error('Cannot update finalized invoice'));
  }
  next();
});

invoiceSchema.pre('save', function (next) {
  // Prevent modifications to finalized invoices (except payment status)
  if (this.isModified() && !this.isNew && this.status === 'FINALIZED') {
    const modifiedFields = Object.keys(this.modifiedPaths());
    const allowedFields = ['paymentStatus', 'updatedAt'];
    const hasDisallowedChanges = modifiedFields.some(
      (field) => !allowedFields.includes(field)
    );
    
    if (hasDisallowedChanges) {
      return next(new Error('Cannot modify finalized invoice'));
    }
  }
  next();
});

invoiceSchema.index({ projectId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ ownerId: 1 });
invoiceSchema.index({ 'billingPeriod.from': 1, 'billingPeriod.to': 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
