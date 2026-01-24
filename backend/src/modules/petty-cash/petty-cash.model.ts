import mongoose, { Schema, Document } from 'mongoose';
import { PettyCashStatus } from '../../types';

export interface IPettyCash extends Document {
  projectId: mongoose.Types.ObjectId;
  submittedBy: mongoose.Types.ObjectId; // Manager
  amount: number; // INR
  description: string;
  category: string;
  receiptPhotoUrl?: string;
  geoLocation?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  distanceFromSite?: number; // meters
  geoFenceValid: boolean;
  status: PettyCashStatus;
  pmApprovedBy?: mongoose.Types.ObjectId;
  pmApprovedAt?: Date;
  ownerApprovedBy?: mongoose.Types.ObjectId;
  ownerApprovedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pettyCashSchema = new Schema<IPettyCash>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    receiptPhotoUrl: {
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
    distanceFromSite: {
      type: Number,
      min: 0,
    },
    geoFenceValid: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['PENDING_PM_APPROVAL', 'PENDING_OWNER_APPROVAL', 'APPROVED', 'REJECTED'],
      default: 'PENDING_PM_APPROVAL',
    },
    pmApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    pmApprovedAt: {
      type: Date,
    },
    ownerApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    ownerApprovedAt: {
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
  },
  {
    timestamps: true,
  }
);

pettyCashSchema.index({ projectId: 1, status: 1 });
pettyCashSchema.index({ submittedBy: 1 });
pettyCashSchema.index({ status: 1, createdAt: -1 });

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

export const PettyCash =
  (mongoose.models.PettyCash as mongoose.Model<IPettyCash>) ||
  mongoose.model<IPettyCash>('PettyCash', pettyCashSchema);
