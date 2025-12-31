import mongoose, { Schema, Document } from 'mongoose';
import { InvoiceStatus } from '../../types';

export interface IInvoiceItem {
  name: string;
  qty: number;
  rate: number;
  amount: number;
  gst: number; // GST percentage
}

export interface IInvoice extends Document {
  invoiceId: string; // Format: INV-YYYY-XXX
  projectId: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  gst: number; // Total GST amount
  total: number;
  status: InvoiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 0,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    gst: {
      type: Number,
      required: true,
      default: 18, // 18% GST
    },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    gst: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ projectId: 1, createdAt: -1 });
invoiceSchema.index({ invoiceId: 1 });
invoiceSchema.index({ status: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);

