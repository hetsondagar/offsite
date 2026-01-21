import mongoose, { Schema, Document } from 'mongoose';

/**
 * Material Catalog - Standard list of materials available for requests
 * This ensures consistency across projects
 */
export type MaterialUnit = 'bag' | 'kg' | 'ton' | 'nos' | 'meter' | 'sqm' | 'cum' | 'liter';

export interface IMaterialCatalog extends Document {
  name: string;
  unit: MaterialUnit;
  defaultAnomalyThreshold: number; // Threshold multiplier (e.g., 1.3 = 30% above average)
  category?: string;
  approxPriceINR: number; // Approximate price in Indian Rupees
  priceUnit: MaterialUnit; // Unit for the price (same as unit)
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
      enum: ['bag', 'kg', 'ton', 'nos', 'meter', 'sqm', 'cum', 'liter'],
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
    approxPriceINR: {
      type: Number,
      required: true,
      min: 0,
    },
    priceUnit: {
      type: String,
      required: true,
      enum: ['bag', 'kg', 'ton', 'nos', 'meter', 'sqm', 'cum', 'liter'],
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

