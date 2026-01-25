import mongoose, { Schema, Document } from 'mongoose';

export interface IConnection {
  label: string;
  targetNodeId: mongoose.Types.ObjectId;
}

export interface ISite360Node extends Document {
  projectId: mongoose.Types.ObjectId;
  zoneName: string;
  imageUrl: string; // Local static served URL: /uploads/site360/<filename>
  uploadedBy: mongoose.Types.ObjectId;
  connections: IConnection[];
  createdAt: Date;
  updatedAt: Date;
}

const connectionSchema = new Schema<IConnection>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    targetNodeId: {
      type: Schema.Types.ObjectId,
      ref: 'Site360Node',
      required: true,
    },
  },
  { _id: false }
);

const site360NodeSchema = new Schema<ISite360Node>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    zoneName: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    connections: {
      type: [connectionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

site360NodeSchema.index({ projectId: 1, zoneName: 1 });

export const Site360Node =
  (mongoose.models.Site360Node as mongoose.Model<ISite360Node>) ||
  mongoose.model<ISite360Node>('Site360Node', site360NodeSchema);
