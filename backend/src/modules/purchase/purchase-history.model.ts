import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseHistory extends Document {
  projectId: mongoose.Types.ObjectId;
  materialRequestId: mongoose.Types.ObjectId;
  materialId: string;
  materialName: string;
  qty: number;
  unit: string;
  gstRate: number;
  gstAmount: number;
  basePrice: number;
  totalCost: number; // INR
  sentAt: Date;
  sentBy: mongoose.Types.ObjectId; // Purchase Manager
  receivedAt?: Date;
  receivedBy?: mongoose.Types.ObjectId; // Engineer
  proofPhotoUrl?: string;
  geoLocation?: string; // Reverse geocoded address
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  status: 'PENDING_GRN' | 'SENT' | 'RECEIVED';
  grnGenerated: boolean;
  grnGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseHistorySchema = new Schema<IPurchaseHistory>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    materialRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialRequest',
      required: true,
    },
    materialId: {
      type: String,
      required: true,
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
    gstRate: {
      type: Number,
      required: true,
      default: 18,
    },
    gstAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    basePrice: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      default: 0,
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receivedAt: {
      type: Date,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    proofPhotoUrl: {
      type: String,
      trim: true,
    },
    geoLocation: {
      type: String,
      trim: true,
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    status: {
      type: String,
      enum: ['PENDING_GRN', 'SENT', 'RECEIVED'],
      default: 'PENDING_GRN',
    },
    grnGenerated: {
      type: Boolean,
      default: false,
    },
    grnGeneratedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

purchaseHistorySchema.index({ projectId: 1, status: 1 });
purchaseHistorySchema.index({ sentBy: 1 });
purchaseHistorySchema.index({ receivedBy: 1 });
purchaseHistorySchema.index({ materialRequestId: 1 }, { unique: true });
purchaseHistorySchema.index({ status: 1, materialRequestId: 1 }); // Optimize query for getApprovedRequests

export const PurchaseHistory =
  (mongoose.models.PurchaseHistory as mongoose.Model<IPurchaseHistory>) ||
  mongoose.model<IPurchaseHistory>('PurchaseHistory', purchaseHistorySchema);
