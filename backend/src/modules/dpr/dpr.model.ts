import mongoose, { Schema, Document } from 'mongoose';

export interface IDPR extends Document {
  projectId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  photos: string[]; // Cloudinary URLs
  notes?: string;
  aiSummary?: string;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dprSchema = new Schema<IDPR>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    photos: [
      {
        type: String,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    aiSummary: {
      type: String,
      trim: true,
    },
    synced: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

dprSchema.index({ projectId: 1, createdAt: -1 });
dprSchema.index({ createdBy: 1 });
dprSchema.index({ synced: 1 });

export const DPR = mongoose.model<IDPR>('DPR', dprSchema);

