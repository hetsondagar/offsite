import mongoose, { Schema, Document } from 'mongoose';

/**
 * InvoiceCounter maintains sequential invoice numbering per financial year.
 * Format: OS/INV/2024-25/0001
 * Uses atomic increment to ensure no duplicates.
 */
export interface IInvoiceCounter extends Document {
  financialYear: string; // Format: "2024-25"
  seq: number;
  updatedAt: Date;
}

const invoiceCounterSchema = new Schema<IInvoiceCounter>(
  {
    financialYear: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: false, // We only need updatedAt
  }
);

invoiceCounterSchema.index({ financialYear: 1 }, { unique: true });

export const InvoiceCounter = mongoose.model<IInvoiceCounter>(
  'InvoiceCounter',
  invoiceCounterSchema
);

