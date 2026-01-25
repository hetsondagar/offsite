import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  // Fail fast for queries when disconnected (avoid silent buffering).
  mongoose.set('bufferCommands', false);

  const maxAttempts = env.NODE_ENV === 'production' ? 5 : 2;
  let attempt = 0;

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const conn = await mongoose.connect(env.MONGODB_URI, {
        // Render/Atlas can take a few seconds during primary selection / cold starts.
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });

      logger.info(`MongoDB Connected: ${conn.connection.host}`);

      // Drop the old unique index on phone field if it exists (phone is now optional)
      try {
        if (!conn.connection.db) {
          throw new Error('Database connection not available');
        }
        const collection = conn.connection.db.collection('users');
        const indexes = await collection.indexes();
        const phoneUniqueIndex = indexes.find(
          (idx: any) => idx.name === 'phone_1' && idx.unique === true
        );

        if (phoneUniqueIndex) {
          logger.info('Dropping old unique index on phone field...');
          await collection.dropIndex('phone_1');
          logger.info('Successfully dropped unique index on phone field');

          // Clean up existing empty phone strings
          await collection.updateMany(
            { $or: [{ phone: '' }, { phone: null }] },
            { $unset: { phone: '' } }
          );
          logger.info('Cleaned up empty phone values');
        }
      } catch (indexError: any) {
        // If index doesn't exist or can't be dropped, log but don't fail
        if (indexError?.code !== 27) {
          // 27 = IndexNotFound
          logger.warn('Could not drop phone index (may not exist):', indexError?.message || indexError);
        }
      }

      return;
    } catch (error: any) {
      const message = error?.message || String(error);
      logger.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed:`, message);

      if (attempt >= maxAttempts) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
      }

      // Backoff: 1s, 2s, 4s, 8s...
      const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
      await sleep(backoffMs);
    }
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB error:', error);
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed through app termination');
  process.exit(0);
});

