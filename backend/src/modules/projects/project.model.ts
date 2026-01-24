import mongoose, { Schema, Document } from 'mongoose';
import { ProjectStatus } from '../../types';

export interface IProject extends Document {
  name: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  status: ProjectStatus;
  owner?: mongoose.Types.ObjectId; // Creator; only this owner sees/manages the project
  members: mongoose.Types.ObjectId[];
  progress: number; // 0-100
  healthScore: number; // 0-100
  siteLatitude?: number; // Deprecated: use geoFence.center.latitude
  siteLongitude?: number; // Deprecated: use geoFence.center.longitude
  siteRadiusMeters?: number; // Deprecated: use geoFence.radiusMeters
  geoFence: {
    enabled: boolean;
    center: {
      latitude: number;
      longitude: number;
    };
    radiusMeters: number; // 50-500m
    bufferMeters: number; // Default: 20m tolerance
  };
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'archived'],
      default: 'active',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Migration sets owner = members[0] for existing projects
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    healthScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    siteLatitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    siteLongitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    siteRadiusMeters: {
      type: Number,
      default: 100,
      min: 1,
    },
    geoFence: {
      enabled: {
        type: Boolean,
        required: true,
        default: true,
      },
      center: {
        latitude: {
          type: Number,
          required: true,
          min: -90,
          max: 90,
        },
        longitude: {
          type: Number,
          required: true,
          min: -180,
          max: 180,
        },
      },
      radiusMeters: {
        type: Number,
        required: true,
        min: 50,
        max: 500,
        default: 200,
      },
      bufferMeters: {
        type: Number,
        required: true,
        default: 20,
        min: 0,
        max: 100,
      },
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ status: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ owner: 1 });

export const Project =
  (mongoose.models.Project as mongoose.Model<IProject>) ||
  mongoose.model<IProject>('Project', projectSchema);

