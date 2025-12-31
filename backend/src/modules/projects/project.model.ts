import mongoose, { Schema, Document } from 'mongoose';
import { ProjectStatus } from '../../types';

export interface IProject extends Document {
  name: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  status: ProjectStatus;
  members: mongoose.Types.ObjectId[];
  progress: number; // 0-100
  healthScore: number; // 0-100
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
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ status: 1 });
projectSchema.index({ members: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);

