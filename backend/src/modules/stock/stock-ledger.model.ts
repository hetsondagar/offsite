import mongoose, { Schema, Document } from 'mongoose';

export type StockType = 'IN' | 'OUT';
export type StockSource = 'purchase' | 'usage' | 'adjustment';

export interface IStockLedger extends Document {
  projectId: mongoose.Types.ObjectId;
  materialId: string;
  materialName: string;
  type: StockType;
  quantity: number;
  unit: string;
  source: StockSource;
  sourceId?: mongoose.Types.ObjectId; // Reference to MaterialRequest (for IN) or DPR (for OUT)
  sourceRefModel?: string; // 'MaterialRequest' or 'DPR'
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockLedgerSchema = new Schema<IStockLedger>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    materialId: {
      type: String,
      required: true,
      index: true,
    },
    materialName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['IN', 'OUT'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['purchase', 'usage', 'adjustment'],
      required: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      refPath: 'sourceRefModel',
    },
    sourceRefModel: {
      type: String,
      enum: ['MaterialRequest', 'DPR'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

stockLedgerSchema.index({ projectId: 1, materialId: 1 });
stockLedgerSchema.index({ projectId: 1, createdAt: -1 });
stockLedgerSchema.index({ sourceId: 1 });

export const StockLedger = mongoose.model<IStockLedger>('StockLedger', stockLedgerSchema);
