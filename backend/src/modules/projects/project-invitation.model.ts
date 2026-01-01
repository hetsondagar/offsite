import mongoose, { Schema, Document } from 'mongoose';

export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface IProjectInvitation extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  offsiteId: string; // OffSite ID for easy lookup
  invitedBy: mongoose.Types.ObjectId;
  role: 'engineer' | 'manager'; // Role in the project
  status: InvitationStatus;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectInvitationSchema = new Schema<IProjectInvitation>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    offsiteId: {
      type: String,
      required: true,
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['engineer', 'manager'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
projectInvitationSchema.index({ userId: 1, status: 1 });
projectInvitationSchema.index({ offsiteId: 1, status: 1 });
projectInvitationSchema.index({ projectId: 1, status: 1 });

export const ProjectInvitation = mongoose.model<IProjectInvitation>('ProjectInvitation', projectInvitationSchema);

