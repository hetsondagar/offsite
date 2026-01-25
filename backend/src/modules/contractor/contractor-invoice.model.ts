import mongoose, { Schema, Document } from 'mongoose';
import { ContractorInvoiceStatus } from '../../types';

export interface IContractorInvoice extends Document {
  contractorId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  weekStartDate: Date;
  weekEndDate: Date;
  labourCountTotal: number;
  ratePerLabour: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  status: ContractorInvoiceStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  sentToOwner: boolean;
  invoiceNumber?: string;
  pdfUrl?: string;
  pdfSource?: 'GENERATED' | 'UPLOADED';
  pdfUploadedBy?: mongoose.Types.ObjectId;
  pdfUploadedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contractorInvoiceSchema = new Schema<IContractorInvoice>(
  {
    contractorId: {
      type: Schema.Types.ObjectId,
      ref: 'Contractor',
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    weekStartDate: {
      type: Date,
      required: true,
    },
    weekEndDate: {
      type: Date,
      required: true,
    },
    labourCountTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    ratePerLabour: {
      type: Number,
      required: true,
      min: 0,
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
    },
    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING_PM_APPROVAL', 'APPROVED', 'REJECTED'],
      default: 'PENDING_PM_APPROVAL',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    sentToOwner: {
      type: Boolean,
      default: false,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    pdfUrl: {
      type: String,
      trim: true,
    },
    pdfSource: {
      type: String,
      enum: ['GENERATED', 'UPLOADED'],
    },
    pdfUploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    pdfUploadedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

contractorInvoiceSchema.index({ contractorId: 1, status: 1 });
contractorInvoiceSchema.index({ projectId: 1, status: 1 });
contractorInvoiceSchema.index({ weekStartDate: 1, weekEndDate: 1 });

export const ContractorInvoice =
  (mongoose.models.ContractorInvoice as mongoose.Model<IContractorInvoice>) ||
  mongoose.model<IContractorInvoice>('ContractorInvoice', contractorInvoiceSchema);
