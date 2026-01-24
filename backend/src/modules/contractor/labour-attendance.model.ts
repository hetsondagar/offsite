import mongoose, { Schema, Document } from 'mongoose';

export interface ILabourAttendance extends Document {
  labourId: mongoose.Types.ObjectId;
  contractorId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  date: Date;
  present: boolean;
  groupPhotoUrl?: string; // Group photo used for face detection
  detectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const labourAttendanceSchema = new Schema<ILabourAttendance>(
  {
    labourId: {
      type: Schema.Types.ObjectId,
      ref: 'Labour',
      required: true,
    },
    contractorId: {
      type: Schema.Types.ObjectId,
      ref: 'Contractor',
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    present: {
      type: Boolean,
      required: true,
      default: false,
    },
    groupPhotoUrl: {
      type: String,
      trim: true,
    },
    detectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique attendance per labour per day
labourAttendanceSchema.index({ labourId: 1, date: 1 }, { unique: true });
labourAttendanceSchema.index({ contractorId: 1, date: 1 });
labourAttendanceSchema.index({ projectId: 1, date: 1 });

export const LabourAttendance =
  (mongoose.models.LabourAttendance as mongoose.Model<ILabourAttendance>) ||
  mongoose.model<ILabourAttendance>('LabourAttendance', labourAttendanceSchema);
