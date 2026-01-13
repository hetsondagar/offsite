import mongoose, { Schema, Document } from 'mongoose';

export type WorkStoppageReason = 
  | 'MATERIAL_DELAY'
  | 'LABOUR_SHORTAGE'
  | 'WEATHER'
  | 'MACHINE_BREAKDOWN'
  | 'APPROVAL_PENDING'
  | 'SAFETY_ISSUE';

export interface WorkStoppage {
  occurred: boolean;
  reason?: WorkStoppageReason;
  durationHours?: number;
  remarks?: string;
  evidencePhotos?: string[]; // Cloudinary URLs
}

export interface IDPR extends Document {
  projectId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  clientId?: string;
  photos: string[]; // Cloudinary URLs
  notes?: string;
  aiSummary?: string;
  workStoppage?: WorkStoppage;
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
    clientId: {
      type: String,
      trim: true,
      index: true,
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
    workStoppage: {
      occurred: {
        type: Boolean,
        default: false,
      },
      reason: {
        type: String,
        enum: ['MATERIAL_DELAY', 'LABOUR_SHORTAGE', 'WEATHER', 'MACHINE_BREAKDOWN', 'APPROVAL_PENDING', 'SAFETY_ISSUE'],
      },
      durationHours: {
        type: Number,
        min: 0,
      },
      remarks: {
        type: String,
        trim: true,
      },
      evidencePhotos: [{
        type: String,
      }],
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
dprSchema.index({ createdBy: 1, clientId: 1 }, { unique: true, sparse: true });

export const DPR =
  (mongoose.models.DPR as mongoose.Model<IDPR>) ||
  mongoose.model<IDPR>('DPR', dprSchema);

