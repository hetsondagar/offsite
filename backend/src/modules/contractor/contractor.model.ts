import mongoose, { Schema, Document } from 'mongoose';

export interface IContractor extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User with role 'contractor'
  assignedProjects: mongoose.Types.ObjectId[];
  contracts: {
    projectId: mongoose.Types.ObjectId;
    labourCountPerDay: number;
    ratePerLabourPerDay: number; // INR
    gstRate: number;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const contractorSchema = new Schema<IContractor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    assignedProjects: [{
      type: Schema.Types.ObjectId,
      ref: 'Project',
    }],
    contracts: [{
      projectId: {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
      },
      labourCountPerDay: {
        type: Number,
        required: true,
        min: 1,
      },
      ratePerLabourPerDay: {
        type: Number,
        required: true,
        min: 0,
      },
      gstRate: {
        type: Number,
        required: true,
        default: 18,
      },
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    }],
  },
  {
    timestamps: true,
  }
);

contractorSchema.index({ userId: 1 });
contractorSchema.index({ assignedProjects: 1 });

export const Contractor =
  (mongoose.models.Contractor as mongoose.Model<IContractor>) ||
  mongoose.model<IContractor>('Contractor', contractorSchema);
