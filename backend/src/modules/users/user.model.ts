import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { UserRole } from '../../types';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  offsiteId: string; // Unique OffSite ID (e.g., OSSE0023, OSPM0042, OSOW0001)
  assignedProjects: mongoose.Types.ObjectId[];
  isActive: boolean;
  // Password reset fields
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Don't return password by default
    },
    // Fields used for password reset flow
    resetPasswordToken: {
      type: String,
      select: false,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      required: false, // Explicitly mark as optional
      // Don't set default - field should be completely omitted if not provided
      // Only validate if phone is provided
      validate: {
        validator: function(v: string | undefined) {
          // If phone is provided, it must not be empty after trimming
          // If undefined or null, validation passes (field is optional)
          if (v === undefined || v === null) return true;
          if (typeof v === 'string') {
            return v.trim().length > 0;
          }
          return false;
        },
        message: 'Phone number cannot be empty',
      },
    },
    role: {
      type: String,
      enum: ['engineer', 'manager', 'owner'],
      required: true,
    },
    offsiteId: {
      type: String,
      unique: true,
      index: true,
      immutable: true, // Never allow updates to offsiteId
      required: true,
      trim: true,
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

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Clean up phone field - remove empty strings and completely unset the field
userSchema.pre('save', function (next) {
  // If phone is an empty string, null, or undefined, completely remove it from the document
  if (this.phone === undefined || this.phone === null || (typeof this.phone === 'string' && this.phone.trim() === '')) {
    // Use unset to completely remove the field from the document
    this.set('phone', undefined, { strict: false });
    // Also mark it as undefined so it's not saved
    this.phone = undefined;
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes for fast lookup
userSchema.index({ email: 1 }, { unique: true });
// Non-unique index on phone for fast lookups (phone is optional, so we don't enforce uniqueness)
// If uniqueness is needed, it can be enforced at application level when phone is provided
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ offsiteId: 1 }, { unique: true }); // Critical: Unique index for offsiteId
// Index reset token to support lookups during password reset
userSchema.index({ resetPasswordToken: 1, resetPasswordExpires: 1 });

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>('User', userSchema);

