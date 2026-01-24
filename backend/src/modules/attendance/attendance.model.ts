import mongoose, { Schema, Document } from 'mongoose';
import { AttendanceType } from '../../types';

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  clientId?: string;
  type: AttendanceType;
  location: string; // Formatted address
  latitude?: number; // GPS latitude
  longitude?: number; // GPS longitude
  distanceFromCenter?: number; // Distance from geo-fence center in meters
  geoFenceStatus?: 'INSIDE' | 'OUTSIDE'; // Validated status
  geoFenceViolation?: boolean; // True if outside geo-fence
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
    clientId: {
      type: String,
      trim: true,
      index: true,
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
    distanceFromCenter: {
      type: Number,
      min: 0,
    },
    geoFenceStatus: {
      type: String,
      enum: ['INSIDE', 'OUTSIDE'],
    },
    geoFenceViolation: {
      type: Boolean,
      default: false,
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
attendanceSchema.index({ userId: 1, clientId: 1 }, { unique: true, sparse: true });

export const Attendance =
  (mongoose.models.Attendance as mongoose.Model<IAttendance>) ||
  mongoose.model<IAttendance>('Attendance', attendanceSchema);

