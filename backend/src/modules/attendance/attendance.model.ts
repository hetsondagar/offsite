import mongoose, { Schema, Document } from 'mongoose';
import { AttendanceType } from '../../types';

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  type: AttendanceType;
  location: string;
  timestamp: Date;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    type: {
      type: String,
      enum: ['checkin', 'checkout'],
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
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

attendanceSchema.index({ userId: 1, timestamp: -1 });
attendanceSchema.index({ projectId: 1, timestamp: -1 });
attendanceSchema.index({ synced: 1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);

