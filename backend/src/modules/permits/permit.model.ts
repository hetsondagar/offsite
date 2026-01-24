import mongoose, { Schema, Document } from 'mongoose';
import { PermitStatus } from '../../types';

export interface IPermit extends Document {
  projectId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId; // Engineer
  taskDescription: string;
  hazardType: string;
  safetyMeasures: string[];
  status: PermitStatus;
  approvedBy?: mongoose.Types.ObjectId; // Safety Officer / Manager
  approvedAt?: Date;
  otp?: string;
  otpGeneratedAt?: Date;
  otpExpiresAt?: Date;
  otpUsed: boolean;
  workStartedAt?: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const permitSchema = new Schema<IPermit>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskDescription: {
      type: String,
      required: true,
      trim: true,
    },
    hazardType: {
      type: String,
      required: true,
      trim: true,
    },
    safetyMeasures: [{
      type: String,
      trim: true,
    }],
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'OTP_GENERATED', 'COMPLETED', 'EXPIRED'],
      default: 'PENDING',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    otp: {
      type: String,
      select: false, // Don't return OTP by default
    },
    otpGeneratedAt: {
      type: Date,
    },
    otpExpiresAt: {
      type: Date,
    },
    otpUsed: {
      type: Boolean,
      default: false,
    },
    workStartedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

permitSchema.index({ projectId: 1, status: 1 });
permitSchema.index({ requestedBy: 1 });
permitSchema.index({ status: 1 });

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const Permit =
  (mongoose.models.Permit as mongoose.Model<IPermit>) ||
  mongoose.model<IPermit>('Permit', permitSchema);
