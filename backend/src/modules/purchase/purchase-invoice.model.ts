import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseInvoice extends Document {
  purchaseHistoryId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  materialName: string;
  qty: number;
  unit: string;
  basePrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number; // INR
  generatedAt: Date;
  generatedBy: mongoose.Types.ObjectId; // System/Engineer who verified GRN
  receiptPhotoUrl?: string; // Photo of receipt uploaded by Purchase Manager
  receiptUploadedAt?: Date;
  receiptUploadedBy?: mongoose.Types.ObjectId; // Purchase Manager who uploaded receipt
  pdfSentToOwner: boolean;
  pdfSentToManager: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseInvoiceSchema = new Schema<IPurchaseInvoice>(
  {
    purchaseHistoryId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseHistory',
      required: true,
      unique: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    materialName: {
      type: String,
      required: true,
      trim: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    basePrice: {
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
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiptPhotoUrl: {
      type: String,
      trim: true,
    },
    receiptUploadedAt: {
      type: Date,
    },
    receiptUploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    pdfSentToOwner: {
      type: Boolean,
      default: false,
    },
    pdfSentToManager: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

purchaseInvoiceSchema.index({ projectId: 1, generatedAt: -1 });
purchaseInvoiceSchema.index({ invoiceNumber: 1 });

export const PurchaseInvoice =
  (mongoose.models.PurchaseInvoice as mongoose.Model<IPurchaseInvoice>) ||
  mongoose.model<IPurchaseInvoice>('PurchaseInvoice', purchaseInvoiceSchema);
