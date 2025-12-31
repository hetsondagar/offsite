import mongoose, { Schema, Document } from 'mongoose';

/**
 * Material Catalog - Standard list of materials available for requests
 * This ensures consistency across projects
 */
export interface IMaterialCatalog extends Document {
  name: string;
  unit: string;
  defaultAnomalyThreshold: number; // Threshold multiplier (e.g., 1.3 = 30% above average)
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const materialCatalogSchema = new Schema<IMaterialCatalog>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    defaultAnomalyThreshold: {
      type: Number,
      default: 1.3, // 30% above average triggers anomaly
    },
    category: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

materialCatalogSchema.index({ name: 1 }, { unique: true });
materialCatalogSchema.index({ isActive: 1 });

export const MaterialCatalog = mongoose.model<IMaterialCatalog>('MaterialCatalog', materialCatalogSchema);

