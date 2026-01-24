import mongoose, { Schema, Document } from 'mongoose';

/**
 * Counter collection for atomic ID generation per role.
 * Ensures concurrency-safe, sequential OffSite ID generation.
 */
export interface ICounter extends Document {
  role: 'SE' | 'PM' | 'OW' | 'PR' | 'CT';
  seq: number;
}

const counterSchema = new Schema<ICounter>(
  {
    role: {
      type: String,
      enum: ['SE', 'PM', 'OW', 'PR', 'CT'],
      required: true,
      unique: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: false,
  }
);

// Index for fast lookup
counterSchema.index({ role: 1 }, { unique: true });

export const Counter =
  (mongoose.models.Counter as mongoose.Model<ICounter>) ||
  mongoose.model<ICounter>('Counter', counterSchema);

