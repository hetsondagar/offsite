import mongoose, { Schema, Document } from 'mongoose';

export type EventType = 'meeting' | 'inspection' | 'delivery' | 'safety' | 'maintenance' | 'other';
export type EventStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface IEvent extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  startDate: Date;
  endDate?: Date;
  location?: string;
  createdBy: mongoose.Types.ObjectId;
  attendees?: mongoose.Types.ObjectId[];
  reminders?: Date[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['meeting', 'inspection', 'delivery', 'safety', 'maintenance', 'other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    location: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reminders: [
      {
        type: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ projectId: 1, startDate: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ status: 1 });

export const Event = mongoose.model<IEvent>('Event', eventSchema);

