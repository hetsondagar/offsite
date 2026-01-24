import mongoose, { Schema, Document } from 'mongoose';

export interface ILabour extends Document {
  contractorId: mongoose.Types.ObjectId;
  name: string;
  code: string; // Unique code like LAB001
  faceImageUrl?: string;
  faceEmbedding?: number[]; // Face embedding vector for recognition
  projectId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const labourSchema = new Schema<ILabour>(
  {
    contractorId: {
      type: Schema.Types.ObjectId,
      ref: 'Contractor',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    faceImageUrl: {
      type: String,
      trim: true,
    },
    faceEmbedding: {
      type: [Number],
      default: undefined,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

labourSchema.index({ contractorId: 1, projectId: 1 });
labourSchema.index({ code: 1 }, { unique: true });

export const Labour =
  (mongoose.models.Labour as mongoose.Model<ILabour>) ||
  mongoose.model<ILabour>('Labour', labourSchema);
