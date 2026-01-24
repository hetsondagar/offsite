import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 
  | 'material_request'
  | 'material_approved'
  | 'material_rejected'
  | 'material_sent'
  | 'material_received'
  | 'dpr_submitted'
  | 'task_assigned'
  | 'task_completed'
  | 'attendance_reminder'
  | 'project_update'
  | 'system_alert'
  | 'contractor_invoice'
  | 'permit_request'
  | 'permit_approved'
  | 'petty_cash'
  | 'tool_issued'
  | 'tool_returned'
  | 'general';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  offsiteId?: string; // OffSite ID of the user (for easy lookup)
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>; // Additional data (e.g., projectId, materialRequestId)
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    offsiteId: {
      type: String,
      index: true,
      sparse: true,
    },
    type: {
      type: String,
      enum: [
        'material_request',
        'material_approved',
        'material_rejected',
        'material_sent',
        'material_received',
        'dpr_submitted',
        'task_assigned',
        'task_completed',
        'attendance_reminder',
        'project_update',
        'system_alert',
        'contractor_invoice',
        'permit_request',
        'permit_approved',
        'petty_cash',
        'tool_issued',
        'tool_returned',
        'general',
      ],
      required: true,
      default: 'general',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ offsiteId: 1, read: 1 });

export const Notification =
  (mongoose.models.Notification as mongoose.Model<INotification>) ||
  mongoose.model<INotification>('Notification', notificationSchema);

