import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../../types';

export interface IUser extends Document {
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  assignedProjects: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ['engineer', 'manager', 'owner'],
      required: true,
    },
    assignedProjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });

export const User = mongoose.model<IUser>('User', userSchema);

