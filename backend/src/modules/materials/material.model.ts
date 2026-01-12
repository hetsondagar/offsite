import mongoose, { Schema, Document } from 'mongoose';
import { MaterialRequestStatus } from '../../types';

export interface IMaterialRequest extends Document {
  projectId: mongoose.Types.ObjectId;
  clientId?: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  reason: string;
  requestedBy: mongoose.Types.ObjectId;
  status: MaterialRequestStatus;
  anomalyDetected: boolean;
  anomalyReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const materialRequestSchema = new Schema<IMaterialRequest>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    clientId: {
      type: String,
      trim: true,
      index: true,
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
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    anomalyDetected: {
      type: Boolean,
      default: false,
    },
    anomalyReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

materialRequestSchema.index({ projectId: 1, status: 1 });
materialRequestSchema.index({ requestedBy: 1 });
materialRequestSchema.index({ status: 1, createdAt: -1 });
materialRequestSchema.index({ requestedBy: 1, clientId: 1 }, { unique: true, sparse: true });

export const MaterialRequest = mongoose.model<IMaterialRequest>('MaterialRequest', materialRequestSchema);

