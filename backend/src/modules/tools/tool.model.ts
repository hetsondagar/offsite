import mongoose, { Schema, Document } from 'mongoose';
import { ToolStatus } from '../../types';

export interface IToolHistory {
  action: 'ISSUED' | 'RETURNED';
  workerId?: mongoose.Types.ObjectId; // Optional - for engineers/managers
  workerName: string;
  labourName?: string; // For labour assignments
  projectId: mongoose.Types.ObjectId;
  timestamp: Date;
  notes?: string;
}

export interface ITool extends Document {
  toolId: string; // Unique code like DRL9X2
  name: string;
  description?: string;
  category?: string;
  status: ToolStatus;
  currentHolderWorkerId?: mongoose.Types.ObjectId; // Optional - for engineers/managers
  currentHolderName?: string;
  currentLabourName?: string; // For labour assignments
  currentProjectId?: mongoose.Types.ObjectId;
  issuedAt?: Date;
  history: IToolHistory[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const toolHistorySchema = new Schema<IToolHistory>(
  {
    action: {
      type: String,
      enum: ['ISSUED', 'RETURNED'],
      required: true,
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    workerName: {
      type: String,
      required: true,
    },
    labourName: {
      type: String,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const toolSchema = new Schema<ITool>(
  {
    toolId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ISSUED'],
      default: 'AVAILABLE',
    },
    currentHolderWorkerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    currentHolderName: {
      type: String,
      trim: true,
    },
    currentLabourName: {
      type: String,
      trim: true,
    },
    currentProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    issuedAt: {
      type: Date,
    },
    history: [toolHistorySchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

toolSchema.index({ toolId: 1 }, { unique: true });
toolSchema.index({ status: 1 });
toolSchema.index({ currentHolderWorkerId: 1 });

// Generate unique tool ID
export async function generateToolId(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let toolId: string;
  let exists = true;
  
  while (exists) {
    toolId = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    exists = !!(await Tool.findOne({ toolId }));
  }
  
  return toolId!;
}

export const Tool =
  (mongoose.models.Tool as mongoose.Model<ITool>) ||
  mongoose.model<ITool>('Tool', toolSchema);
